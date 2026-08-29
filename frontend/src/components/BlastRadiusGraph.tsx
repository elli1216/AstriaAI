import {
  ReactFlow,
  Background,
  Controls,
  type Node,
  type Edge,
  MarkerType,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import type { BlastRadiusResult } from '~/types'

interface BlastRadiusGraphProps {
  blastRadius: BlastRadiusResult
}

function methodColor(method: string): string {
  const colors: Record<string, string> = {
    GET: '#3b82f6',
    POST: '#22c55e',
    PUT: '#f59e0b',
    PATCH: '#a855f7',
    DELETE: '#ef4444',
  }
  return colors[method] ?? '#6b7280'
}

export function BlastRadiusGraph({ blastRadius }: BlastRadiusGraphProps) {
  const nodes: Node[] = []
  const edges: Edge[] = []

  // Root node — the modified code
  nodes.push({
    id: 'root',
    position: { x: 400, y: 30 },
    data: { label: '⚡ Modified Code' },
    style: {
      background: '#1e293b',
      border: '2px solid #f59e0b',
      color: '#fbbf24',
      borderRadius: 10,
      padding: '10px 18px',
      fontWeight: 700,
      fontSize: 13,
      minWidth: 160,
      textAlign: 'center',
    },
  })

  // Group by service
  const serviceMap = new Map<string, typeof blastRadius.impacted_routes>()
  for (const route of blastRadius.impacted_routes) {
    const existing = serviceMap.get(route.service) ?? []
    serviceMap.set(route.service, [...existing, route])
  }

  let serviceX = 80
  let serviceIdx = 0
  for (const [service, routes] of serviceMap) {
    const serviceY = 150
    const serviceId = `service-${serviceIdx}`

    nodes.push({
      id: serviceId,
      position: { x: serviceX, y: serviceY },
      data: { label: `📦 ${service}` },
      style: {
        background: '#1e293b',
        border: '1px solid #475569',
        color: '#94a3b8',
        borderRadius: 8,
        padding: '8px 16px',
        fontSize: 12,
        minWidth: 130,
        textAlign: 'center',
      },
    })

    edges.push({
      id: `root-${serviceId}`,
      source: 'root',
      target: serviceId,
      markerEnd: { type: MarkerType.ArrowClosed, color: '#f59e0b' },
      style: { stroke: '#f59e0b', strokeWidth: 1.5 },
    })

    let routeY = serviceY + 100
    routes.forEach((route, ri) => {
      const routeId = `route-${serviceIdx}-${ri}`
      const color = methodColor(route.method)

      nodes.push({
        id: routeId,
        position: { x: serviceX - 20 + ri * 160, y: routeY },
        data: {
          label: (
            <div style={{ textAlign: 'left', lineHeight: 1.5 }}>
              <span
                style={{
                  background: color,
                  color: '#fff',
                  borderRadius: 4,
                  padding: '1px 6px',
                  fontSize: 10,
                  fontWeight: 700,
                  marginRight: 6,
                }}
              >
                {route.method}
              </span>
              <span style={{ color: '#e2e8f0', fontFamily: 'monospace', fontSize: 11 }}>
                {route.path}
              </span>
            </div>
          ),
        },
        style: {
          background: '#0f172a',
          border: `1px solid ${color}`,
          borderRadius: 6,
          padding: '8px 12px',
          minWidth: 140,
        },
      })

      edges.push({
        id: `${serviceId}-${routeId}`,
        source: serviceId,
        target: routeId,
        markerEnd: { type: MarkerType.ArrowClosed, color },
        style: { stroke: color, strokeWidth: 1, strokeDasharray: '4 2' },
      })
    })

    serviceX += Math.max(routes.length, 1) * 180 + 40
    serviceIdx++
  }

  // Impacted models
  blastRadius.impacted_models.forEach((model, mi) => {
    const modelId = `model-${mi}`
    nodes.push({
      id: modelId,
      position: { x: 80 + mi * 200, y: 450 },
      data: { label: `🗄 ${model}` },
      style: {
        background: '#1e293b',
        border: '1px solid #7c3aed',
        color: '#a78bfa',
        borderRadius: 6,
        padding: '6px 14px',
        fontSize: 11,
        minWidth: 100,
        textAlign: 'center',
      },
    })

    edges.push({
      id: `root-${modelId}`,
      source: 'root',
      target: modelId,
      markerEnd: { type: MarkerType.ArrowClosed, color: '#7c3aed' },
      style: { stroke: '#7c3aed', strokeWidth: 1, strokeDasharray: '3 3' },
      label: 'breaks',
      labelStyle: { fill: '#a78bfa', fontSize: 10 },
    })
  })

  return (
    <div className="h-80 w-full rounded-xl overflow-hidden border border-white/10">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#1e293b" gap={20} />
        <Controls
          style={{
            background: '#0f172a',
            border: '1px solid #1e293b',
          }}
        />
      </ReactFlow>
    </div>
  )
}
