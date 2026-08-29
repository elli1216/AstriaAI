"""
Automated Test Execution Sandbox

Writes the synthesized test file into a temp directory next to the demo
target repository, executes it via subprocess (pytest / vitest),
and parses the output into a structured TestExecutionResult.
"""
import os
import re
import subprocess
import tempfile
import sys
from pathlib import Path
from models.analysis import SynthesizedTest, TestExecutionResult
from services.config import SANDBOX_TIMEOUT_SECONDS


def execute_synthesized_tests(test: SynthesizedTest) -> TestExecutionResult:
    """
    Write the synthesized test to a temp file and execute it.
    Returns a structured TestExecutionResult.
    """
    with tempfile.TemporaryDirectory(prefix="Astria_") as tmpdir:
        test_path = Path(tmpdir) / test.filename
        test_path.write_text(test.content, encoding="utf-8")

        if test.framework == "pytest":
            result = _run_pytest(str(test_path))
        else:
            result = _run_vitest(str(test_path))

        return result


def _get_safe_env() -> dict:
    """Provide a sanitized environment dictionary for test execution."""
    env = os.environ.copy()
    # Filter out sensitive credentials from test execution subprocess
    for secret_key in ("WATSONX_API_KEY", "GITHUB_APP_PRIVATE_KEY", "JWT_PRIVATE_KEY"):
        env.pop(secret_key, None)
    return env


def _run_pytest(test_file: str) -> TestExecutionResult:
    timeout = SANDBOX_TIMEOUT_SECONDS
    try:
        proc = subprocess.run(
            [sys.executable, "-m", "pytest", test_file, "-v", "--tb=short", "--no-header"],
            capture_output=True,
            text=True,
            timeout=timeout,
            env=_get_safe_env(),
        )
        output = proc.stdout + proc.stderr
        return _parse_pytest_output(output, proc.returncode == 0)
    except subprocess.TimeoutExpired:
        return TestExecutionResult(
            passed=0, failed=0, errors=1,
            regressions_caught=[f"Test execution timed out after {timeout}s"],
            output="Timeout",
            success=False,
        )
    except Exception as exc:
        return TestExecutionResult(
            passed=0, failed=0, errors=1,
            regressions_caught=[str(exc)],
            output=str(exc),
            success=False,
        )


def _run_vitest(test_file: str) -> TestExecutionResult:
    timeout = SANDBOX_TIMEOUT_SECONDS
    try:
        proc = subprocess.run(
            ["npx", "vitest", "run", test_file, "--reporter=verbose"],
            capture_output=True,
            text=True,
            timeout=timeout,
            env=_get_safe_env(),
        )
        output = proc.stdout + proc.stderr
        return _parse_vitest_output(output, proc.returncode == 0)
    except subprocess.TimeoutExpired:
        return TestExecutionResult(
            passed=0, failed=0, errors=1,
            regressions_caught=[f"Test execution timed out after {timeout}s"],
            output="Timeout",
            success=False,
        )
    except Exception as exc:
        return TestExecutionResult(
            passed=0, failed=0, errors=1,
            regressions_caught=[str(exc)],
            output=str(exc),
            success=False,
        )


def _parse_pytest_output(output: str, success: bool) -> TestExecutionResult:
    """Parse pytest -v output to count passed/failed and collect regression names."""
    passed = len(re.findall(r" PASSED", output))
    failed = len(re.findall(r" FAILED", output))
    errors = len(re.findall(r" ERROR", output))

    # Collect failing test names as "regressions caught"
    regressions = re.findall(r"FAILED (.+?) -", output)

    # Also grab the summary line e.g. "3 passed, 2 failed"
    summary_match = re.search(r"=+ (.+?) =+$", output, re.MULTILINE)
    summary_line = summary_match.group(1) if summary_match else ""

    return TestExecutionResult(
        passed=passed,
        failed=failed,
        errors=errors,
        regressions_caught=regressions,
        output=output[-3000:],  # cap for storage
        success=success,
    )


def _parse_vitest_output(output: str, success: bool) -> TestExecutionResult:
    """Parse vitest --reporter=verbose output."""
    passed = len(re.findall(r"✓|✔|PASS", output))
    failed = len(re.findall(r"✗|✘|FAIL|×", output))
    regressions = re.findall(r"(?:FAIL|✗|✘) (.+)", output)
    return TestExecutionResult(
        passed=passed,
        failed=failed,
        errors=0,
        regressions_caught=regressions,
        output=output[-3000:],
        success=success,
    )
