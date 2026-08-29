"""
Git diff parser and AST dependency tracer.

Parses unified diff format to extract changed symbols (functions, classes,
variables), then traces their downstream callers across the codebase using
Python's built-in `ast` module.
"""
import ast
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional


@dataclass
class ChangedSymbol:
    name: str
    kind: str  # "function" | "class" | "assignment"
    file: str
    added_lines: list[str] = field(default_factory=list)
    removed_lines: list[str] = field(default_factory=list)


@dataclass
class DiffSummary:
    changed_files: list[str]
    added_lines: int
    removed_lines: int
    changed_symbols: list[ChangedSymbol]
    raw_diff: str


def parse_diff(diff_text: str) -> DiffSummary:
    """
    Parse a unified diff string into a structured DiffSummary.
    Extracts per-file changes and attempts to identify modified symbols.
    """
    changed_files: list[str] = []
    changed_symbols: list[ChangedSymbol] = []
    total_added = 0
    total_removed = 0

    current_file: Optional[str] = None
    current_added: list[str] = []
    current_removed: list[str] = []

    for line in diff_text.splitlines():
        # Track file transitions
        if line.startswith("+++ b/"):
            if current_file and (current_added or current_removed):
                _extract_symbols(current_file, current_added, current_removed, changed_symbols)
            current_file = line[6:]
            if current_file not in changed_files:
                changed_files.append(current_file)
            current_added = []
            current_removed = []
        elif line.startswith("--- a/"):
            continue
        elif line.startswith("+") and not line.startswith("+++"):
            total_added += 1
            current_added.append(line[1:])
        elif line.startswith("-") and not line.startswith("---"):
            total_removed += 1
            current_removed.append(line[1:])

    # Flush last file
    if current_file and (current_added or current_removed):
        _extract_symbols(current_file, current_added, current_removed, changed_symbols)

    return DiffSummary(
        changed_files=changed_files,
        added_lines=total_added,
        removed_lines=total_removed,
        changed_symbols=changed_symbols,
        raw_diff=diff_text,
    )


def _extract_symbols(
    file_path: str,
    added_lines: list[str],
    removed_lines: list[str],
    out: list[ChangedSymbol],
) -> None:
    """
    Attempt to parse added/removed lines as Python AST nodes.
    Falls back to regex-based extraction for non-Python or parse failures.
    """
    all_changed = added_lines + removed_lines
    source = "\n".join(all_changed)

    # Python AST extraction
    if file_path.endswith(".py"):
        try:
            tree = ast.parse(source)
            for node in ast.walk(tree):
                if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                    out.append(ChangedSymbol(
                        name=node.name,
                        kind="function",
                        file=file_path,
                        added_lines=added_lines,
                        removed_lines=removed_lines,
                    ))
                elif isinstance(node, ast.ClassDef):
                    out.append(ChangedSymbol(
                        name=node.name,
                        kind="class",
                        file=file_path,
                        added_lines=added_lines,
                        removed_lines=removed_lines,
                    ))
            return
        except SyntaxError:
            pass

    # Regex fallback for any language
    fn_pattern = re.compile(
        r"(?:def |function |async function |const |export function |export const )(\w+)"
    )
    class_pattern = re.compile(r"(?:class )(\w+)")

    for line in all_changed:
        for match in fn_pattern.finditer(line):
            out.append(ChangedSymbol(
                name=match.group(1),
                kind="function",
                file=file_path,
                added_lines=added_lines,
                removed_lines=removed_lines,
            ))
        for match in class_pattern.finditer(line):
            out.append(ChangedSymbol(
                name=match.group(1),
                kind="class",
                file=file_path,
                added_lines=added_lines,
                removed_lines=removed_lines,
            ))


def trace_ast_callers(
    symbol_names: list[str],
    codebase_root: Optional[str] = None,
) -> dict[str, list[str]]:
    """
    Walk Python source files under codebase_root and find all call sites
    for each symbol in symbol_names.

    Returns: { symbol_name: [file_path, ...], ... }
    """
    callers: dict[str, list[str]] = {name: [] for name in symbol_names}
    if not codebase_root:
        return callers

    root = Path(codebase_root)
    if not root.exists():
        return callers

    for py_file in root.rglob("*.py"):
        try:
            source = py_file.read_text(encoding="utf-8", errors="ignore")
            tree = ast.parse(source)
        except Exception:
            continue

        for node in ast.walk(tree):
            if isinstance(node, ast.Call):
                func = node.func
                called_name: Optional[str] = None
                if isinstance(func, ast.Name):
                    called_name = func.id
                elif isinstance(func, ast.Attribute):
                    called_name = func.attr

                if called_name and called_name in callers:
                    rel_path = str(py_file.relative_to(root))
                    if rel_path not in callers[called_name]:
                        callers[called_name].append(rel_path)

    return callers


def prune_openapi_spec(spec_text: Optional[str], symbol_names: list[str]) -> str:
    """
    Intelligently prune an OpenAPI specification to retain paths and schemas
    relevant to the modified symbols and models.
    """
    if not spec_text or spec_text == "(not provided)":
        return "(not provided)"
    if len(spec_text) <= 3000:
        return spec_text

    if not symbol_names:
        return spec_text[:3000]

    relevant_blocks: list[str] = []
    lines = spec_text.splitlines()
    i = 0
    while i < len(lines):
        line = lines[i]
        if any(sym.lower() in line.lower() for sym in symbol_names if len(sym) >= 3):
            start = max(0, i - 4)
            end = min(len(lines), i + 16)
            relevant_blocks.append("\n".join(lines[start:end]))
            i = end
        else:
            i += 1

    if relevant_blocks:
        return "\n...\n".join(relevant_blocks[:8])
    return spec_text[:3000]


def prune_db_schema(schema_text: Optional[str], symbol_names: list[str]) -> str:
    """
    Prune a database / Prisma schema to models relevant to the changed symbols.
    """
    if not schema_text or schema_text == "(not provided)":
        return "(not provided)"
    if len(schema_text) <= 2000:
        return schema_text

    if not symbol_names:
        return schema_text[:2000]

    relevant_models: list[str] = []
    # Match model/table blocks
    blocks = re.split(r"\n(?=(?:model|table|CREATE TABLE)\s+)", schema_text, flags=re.IGNORECASE)
    for block in blocks:
        if any(sym.lower() in block.lower() for sym in symbol_names if len(sym) >= 3):
            relevant_models.append(block.strip())

    if relevant_models:
        return "\n\n".join(relevant_models[:5])
    return schema_text[:2000]


def build_context_payload(
    diff_summary: DiffSummary,
    openapi_spec: Optional[str] = None,
    db_schema: Optional[str] = None,
    callers: Optional[dict[str, list[str]]] = None,
) -> dict:
    """
    Assemble a structured context payload combining the diff, pruned schema context,
    and downstream caller map. This is passed to the Granite agents.
    """
    if callers is None:
        callers = {}
    symbol_names = [s.name for s in diff_summary.changed_symbols]

    pruned_openapi = prune_openapi_spec(openapi_spec, symbol_names)
    pruned_schema = prune_db_schema(db_schema, symbol_names)

    return {
        "changed_files": diff_summary.changed_files,
        "added_lines": diff_summary.added_lines,
        "removed_lines": diff_summary.removed_lines,
        "changed_symbols": [
            {
                "name": s.name,
                "kind": s.kind,
                "file": s.file,
                "added_lines": s.added_lines[:25],
                "removed_lines": s.removed_lines[:25],
            }
            for s in diff_summary.changed_symbols
        ],
        "downstream_callers": callers,
        "openapi_spec": pruned_openapi,
        "db_schema": pruned_schema,
        "raw_diff": diff_summary.raw_diff[:4000],
    }
