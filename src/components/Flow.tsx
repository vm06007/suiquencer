import { useCallback, useEffect, useState, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  type Edge,
  type Node,
  ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import WalletNode from './nodes/WalletNode';
import { Sidebar } from './layout/Sidebar';
import type { NodeData } from '@/types';

const nodeTypes: any = {
  wallet: WalletNode,
};

// Initial wallet node
const initialNodes: Node<NodeData>[] = [
  {
    id: 'wallet-1',
    type: 'wallet',
    position: { x: 250, y: 250 },
    data: {
      label: 'Your Wallet',
      type: 'wallet',
    },
  },
];

const initialEdges: Edge[] = [];

let nodeId = 2;

function FlowCanvas() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [edgeType, setEdgeType] = useState<'default' | 'straight' | 'step' | 'smoothstep'>('default');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const handleToggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  const handleEdgeTypeChange = useCallback((type: 'default' | 'straight' | 'step' | 'smoothstep') => {
    setEdgeType(type);
    setEdges((eds) => eds.map((e) => ({ ...e, type })));
  }, [setEdges]);

  // Listen for custom addNode events from the WalletNode component
  useEffect(() => {
    const handleAddNode = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { sourceNodeId } = customEvent.detail;

      // Find the source node to position the new node relative to it
      const sourceNode = nodes.find((n) => n.id === sourceNodeId);
      if (!sourceNode) return;

      // Create a new wallet node to the right of the source
      const newNode: Node<NodeData> = {
        id: `wallet-${nodeId++}`,
        type: 'wallet',
        position: {
          x: sourceNode.position.x + 300,
          y: sourceNode.position.y,
        },
        data: {
          label: `Wallet ${nodeId - 1}`,
          type: 'wallet',
        },
      };

      // Add the new node
      setNodes((nds) => [...nds, newNode]);

      // Automatically connect the source to the new node
      const newEdge: Edge = {
        id: `e${sourceNodeId}-${newNode.id}`,
        source: sourceNodeId,
        target: newNode.id,
        type: edgeType,
      };
      setEdges((eds) => [...eds, newEdge]);
    };

    window.addEventListener('addNode', handleAddNode);
    return () => window.removeEventListener('addNode', handleAddNode);
  }, [nodes, setNodes, setEdges, edgeType]);

  return (
    <div ref={containerRef} className="w-full h-screen bg-gray-50">
      <Sidebar
        isFullscreen={isFullscreen}
        onToggleFullscreen={handleToggleFullscreen}
        edgeType={edgeType}
        onEdgeTypeChange={handleEdgeTypeChange}
      />
      <div className="w-full h-full pl-16">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
          defaultEdgeOptions={{
            type: edgeType,
            animated: true,
            style: { strokeWidth: 2, stroke: '#3b82f6' },
          }}
        >
          <Background gap={16} size={1} color="#e5e7eb" />
          <Controls />
        </ReactFlow>
      </div>
    </div>
  );
}

export default function Flow() {
  return (
    <ReactFlowProvider>
      <FlowCanvas />
    </ReactFlowProvider>
  );
}
