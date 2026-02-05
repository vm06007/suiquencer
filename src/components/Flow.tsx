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
import TransferNode from './nodes/TransferNode';
import SelectorNode from './nodes/SelectorNode';
import { Sidebar } from './layout/Sidebar';
import { RightSidebar } from './layout/RightSidebar';
import { useExecuteSequence } from '@/hooks/useExecuteSequence';
import type { NodeData } from '@/types';

const nodeTypes: any = {
  wallet: WalletNode,
  transfer: TransferNode,
  selector: SelectorNode,
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
  const [edgeType, setEdgeType] = useState<'default' | 'straight' | 'step' | 'smoothstep'>('smoothstep');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Execution hook
  const { executeSequence, isExecuting } = useExecuteSequence();

  const handleExecute = useCallback(() => {
    // Get execution sequence
    const walletNode = nodes.find(n => n.type === 'wallet');
    if (!walletNode) return;

    const sequence: Node<NodeData>[] = [];
    const visited = new Set<string>();

    const traverse = (nodeId: string) => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);

      const node = nodes.find(n => n.id === nodeId);
      if (!node || node.type === 'wallet') return;
      if (node.type === 'selector') return;

      sequence.push(node);

      const outgoingEdges = edges.filter(e => e.source === nodeId);
      outgoingEdges.forEach(edge => traverse(edge.target));
    };

    const startEdges = edges.filter(e => e.source === walletNode.id);
    startEdges.forEach(edge => traverse(edge.target));

    executeSequence(sequence);
  }, [nodes, edges, executeSequence]);

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

  // Listen for custom addNode events from nodes
  useEffect(() => {
    const handleAddNode = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { sourceNodeId } = customEvent.detail;

      // Find the source node to position the new node relative to it
      const sourceNode = nodes.find((n) => n.id === sourceNodeId);
      if (!sourceNode) return;

      // Create a new selector node to the right of the source
      const newNode: Node<NodeData> = {
        id: `node-${nodeId++}`,
        type: 'selector',
        position: {
          x: sourceNode.position.x + 350,
          y: sourceNode.position.y,
        },
        data: {
          label: 'Select Action',
          type: 'protocol',
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
      <RightSidebar
        nodes={nodes}
        edges={edges}
        onExecute={handleExecute}
        isExecuting={isExecuting}
      />
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
