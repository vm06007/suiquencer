import { useCallback, useEffect, useState, useRef, useMemo } from 'react';
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
import SwapNode from './nodes/SwapNode';
import SelectorNode from './nodes/SelectorNode';
import LogicNode from './nodes/LogicNode';
import CustomNode from './nodes/CustomNode';
import { Sidebar } from './layout/Sidebar';
import { RightSidebar } from './layout/RightSidebar';
import { SuccessModal } from './SuccessModal';
import { useExecuteSequence } from '@/hooks/useExecuteSequence';
import { useTheme } from '@/hooks/useTheme';
import { useFlowWorkspace } from '@/hooks/useFlowWorkspace';
import { useFlowFileOperations } from '@/hooks/useFlowFileOperations';
import type { NodeData } from '@/types';

const nodeTypes: any = {
  wallet: WalletNode,
  transfer: TransferNode,
  swap: SwapNode,
  selector: SelectorNode,
  logic: LogicNode,
  custom: CustomNode,
};

// Initial wallet node (not deletable)
const initialNodes: Node<NodeData>[] = [
  {
    id: 'wallet-1',
    type: 'wallet',
    position: { x: 250, y: 250 },
    data: {
      label: 'Your Wallet',
      type: 'wallet',
    },
    deletable: false,
  },
];

const initialEdges: Edge[] = [];

let nodeId = 2;
let tabId = 2;

// Helper function to get initial workspace from localStorage or defaults
function getInitialWorkspace() {
  const WORKSPACE_STORAGE_KEY = 'suiquencer-workspace';

  // Try to restore from localStorage
  try {
    const saved = localStorage.getItem(WORKSPACE_STORAGE_KEY);
    if (saved) {
      const workspace = JSON.parse(saved);
      if (workspace.tabs && workspace.tabs.length > 0) {
        const activeTab =
          workspace.tabs.find((t: any) => t.id === workspace.activeTabId) ||
          workspace.tabs[0];
        console.log('Workspace restored from localStorage');
        return {
          tabs: workspace.tabs,
          activeTabId: workspace.activeTabId || workspace.tabs[0].id,
          nodes: activeTab.nodes,
          edges: activeTab.edges,
        };
      }
    }
  } catch (error) {
    console.error('Failed to restore workspace from localStorage:', error);
  }

  // Return default state
  return {
    tabs: [
      {
        id: '1',
        name: 'My Sequence #1',
        nodes: initialNodes,
        edges: initialEdges,
      },
    ],
    activeTabId: '1',
    nodes: initialNodes,
    edges: initialEdges,
  };
}

function FlowCanvas() {
  // Use useState with lazy initializer to only call getInitialWorkspace() once on mount
  const [initialWorkspace] = useState(() => getInitialWorkspace());

  const [nodes, setNodes, onNodesChange] = useNodesState(initialWorkspace.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialWorkspace.edges);
  const [edgeType, setEdgeType] = useState<'default' | 'straight' | 'step' | 'smoothstep'>('smoothstep');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedEdges, setSelectedEdges] = useState<string[]>([]);
  const [selectedNodes, setSelectedNodes] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  const { theme, toggleTheme } = useTheme();
  const { executeSequence, isExecuting, lastResult, clearResult } = useExecuteSequence();

  // Workspace and file operations hooks
  const workspace = useFlowWorkspace(
    {
      initialTabs: initialWorkspace.tabs,
      initialActiveTabId: initialWorkspace.activeTabId,
    },
    nodes,
    edges,
    setNodes,
    setEdges
  );

  const fileOps = useFlowFileOperations(
    nodes,
    edges,
    workspace.tabs,
    workspace.activeTabId,
    workspace.setTabs,
    workspace.setActiveTabId,
    setNodes,
    setEdges,
    () => `${tabId++}`
  );

  // Handle saving to localStorage
  const handleSave = useCallback(() => {
    workspace.saveWorkspaceToLocalStorage();
    workspace.setHasUnsavedChanges(false);
    console.log('Workflow saved to memory');
  }, [workspace]);

  // Handle creating a new tab
  const handleNewTab = useCallback(() => {
    const newTab = {
      id: `${tabId++}`,
      name: `My Sequence #${workspace.tabs.length + 1}`,
      nodes: initialNodes,
      edges: initialEdges,
    };
    workspace.setTabs((prev) => [...prev, newTab]);
    workspace.setActiveTabId(newTab.id);
    setNodes(newTab.nodes);
    setEdges(newTab.edges);
  }, [workspace, setNodes, setEdges]);

  // Handle inserting a node (either between edges or after a selected node)
  const handleInsertNode = useCallback(() => {
    // Case 1: Edge is selected - insert node between two connected nodes
    if (selectedEdges.length === 1) {
      const selectedEdge = edges.find((e) => e.id === selectedEdges[0]);
      if (!selectedEdge) return;

      const sourceNode = nodes.find((n) => n.id === selectedEdge.source);
      const targetNode = nodes.find((n) => n.id === selectedEdge.target);
      if (!sourceNode || !targetNode) return;

      // Create new selector node positioned between source and target
      const newNode: Node<NodeData> = {
        id: `node-${nodeId++}`,
        type: 'selector',
        position: {
          x: (sourceNode.position.x + targetNode.position.x) / 2,
          y: (sourceNode.position.y + targetNode.position.y) / 2,
        },
        data: {
          label: 'Select Action',
          type: 'protocol',
        },
      };

      // Add the new node
      setNodes((nds) => [...nds, newNode]);

      // Remove the old edge and create two new edges
      setEdges((eds) => [
        ...eds.filter((e) => e.id !== selectedEdge.id),
        {
          id: `e${selectedEdge.source}-${newNode.id}`,
          source: selectedEdge.source,
          target: newNode.id,
          type: edgeType,
          animated: false,
          style: { strokeWidth: 2, stroke: '#3b82f6' },
        },
        {
          id: `e${newNode.id}-${selectedEdge.target}`,
          source: newNode.id,
          target: selectedEdge.target,
          type: edgeType,
          animated: true, // Dashed because target is selector
          style: { strokeWidth: 2, stroke: '#3b82f6' },
        },
      ]);

      setSelectedEdges([]);
      return;
    }

    // Case 2: Node is selected - add new node after it
    if (selectedNodes.length === 1) {
      const sourceNode = nodes.find((n) => n.id === selectedNodes[0]);
      if (!sourceNode) return;

      // Create new selector node positioned to the right of the source
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

      // Create edge from source to new node
      const newEdge: Edge = {
        id: `e${sourceNode.id}-${newNode.id}`,
        source: sourceNode.id,
        target: newNode.id,
        type: edgeType,
        animated: true, // Dashed until selector chooses an action
        style: { strokeWidth: 2, stroke: '#3b82f6' },
      };
      setEdges((eds) => [...eds, newEdge]);

      setSelectedNodes([]);
    }
  }, [selectedEdges, selectedNodes, edges, nodes, setNodes, setEdges, edgeType]);

  // Handle selection changes
  const handleSelectionChange = useCallback(
    (params: { nodes: Node[]; edges: Edge[] }) => {
      const selectedEdgeIds = params.edges.map((e) => e.id);
      const selectedNodeIds = params.nodes.map((n) => n.id);
      setSelectedEdges(selectedEdgeIds);
      setSelectedNodes(selectedNodeIds);
    },
    []
  );

  const handleExecute = useCallback(async () => {
    // Get execution sequence
    const walletNode = nodes.find((n) => n.type === 'wallet');
    if (!walletNode) return;

    const sequence: Node<NodeData>[] = [];
    const visited = new Set<string>();

    const traverse = async (nodeId: string): Promise<boolean> => {
      if (visited.has(nodeId)) return true;
      visited.add(nodeId);

      const node = nodes.find((n) => n.id === nodeId);
      if (!node || node.type === 'wallet') return true;
      if (node.type === 'selector') return true;

      // Handle logic nodes - evaluate condition
      if (node.type === 'logic') {
        const nodeData = node.data as NodeData;

        // Add logic node to sequence for display in execution modal
        sequence.push(node as Node<NodeData>);

        // Handle both balance check and contract check
        if (nodeData.logicType === 'balance') {
          // Check if we have all required data
          if (!nodeData.balanceAddress || !nodeData.comparisonOperator || !nodeData.compareValue) {
            // If incomplete, skip downstream
            console.log(`Logic node ${node.id}: Incomplete balance check configuration, skipping downstream`);
            return false;
          }
        } else if (nodeData.logicType === 'contract') {
          // Check if we have all required data
          if (!nodeData.contractPackageId || !nodeData.contractModule || !nodeData.contractFunction ||
              !nodeData.contractComparisonOperator || !nodeData.contractCompareValue) {
            // If incomplete, skip downstream
            console.log(`Logic node ${node.id}: Incomplete contract check configuration, skipping downstream`);
            return false;
          }
        } else {
          // Unknown logic type, skip downstream
          console.log(`Logic node ${node.id}: Unknown logic type, skipping downstream`);
          return false;
        }

        // Downstream nodes will be conditionally added based on the logic evaluation
        // The actual evaluation happens in useExecuteSequence
        const outgoingEdges = edges.filter((e) => e.source === nodeId);
        for (const edge of outgoingEdges) {
          await traverse(edge.target);
        }
        return true;
      }

      // Regular nodes (transfer, swap)
      sequence.push(node as Node<NodeData>);

      const outgoingEdges = edges.filter((e) => e.source === nodeId);
      for (const edge of outgoingEdges) {
        await traverse(edge.target);
      }

      return true;
    };

    const startEdges = edges.filter((e) => e.source === walletNode.id);
    for (const edge of startEdges) {
      await traverse(edge.target);
    }

    executeSequence(sequence, edges);
  }, [nodes, edges, executeSequence]);

  const handleDeleteSelected = useCallback(() => {
    setEdges((eds) => eds.filter((edge) => !selectedEdges.includes(edge.id)));
    setNodes((nds) =>
      nds.filter((node) => !node.selected || node.type === 'wallet')
    );
    setSelectedEdges([]);
  }, [selectedEdges, setEdges, setNodes]);

  const canDelete = useMemo(() => {
    if (selectedEdges.length > 0) return true;
    const hasDeletableNode = selectedNodes.some(
      (id) => nodes.find((n) => n.id === id)?.type !== 'wallet'
    );
    return hasDeletableNode;
  }, [selectedEdges.length, selectedNodes, nodes]);

  // Compute styled edges based on selection and node types
  const styledEdges = useMemo(() => {
    return edges.map((edge) => {
      const targetNode = nodes.find((n) => n.id === edge.target);
      const isTargetSelector = targetNode?.type === 'selector';
      const isSelected = selectedEdges.includes(edge.id);

      return {
        ...edge,
        animated: isSelected || isTargetSelector,
        style: {
          strokeWidth: 2,
          stroke: '#3b82f6',
        },
        label: isSelected ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleInsertNode();
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-full w-6 h-6 flex items-center justify-center shadow-lg transition-colors"
            title="Insert node here"
          >
            +
          </button>
        ) : undefined,
        labelStyle: isSelected ? { cursor: 'pointer' } : undefined,
        labelBgStyle: isSelected ? { fill: 'transparent' } : undefined,
      };
    });
  }, [edges, nodes, selectedEdges, handleInsertNode]);

  const onConnect = useCallback(
    (params: Connection) => {
      const targetNode = nodes.find((n) => n.id === params.target);
      const isTargetSelector = targetNode?.type === 'selector';

      // Add the edge
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            animated: isTargetSelector,
            style: { strokeWidth: 2, stroke: '#3b82f6' },
          },
          eds
        )
      );

      // Auto-prefill transfer node when connecting from swap
      if (targetNode?.type === 'transfer' && params.source) {
        setNodes((nds) => {
          const newEdges = [...edges, { ...params }];

          // Get all incoming sources to this target
          const incomingSourceIds = new Set(
            newEdges
              .filter((e) => e.target === params.target)
              .map((e) => e.source)
          );

          // Calculate total estimated output by symbol
          const sumsBySymbol: Record<string, number> = {};
          for (const sourceId of incomingSourceIds) {
            const src = nds.find((n) => n.id === sourceId);
            const d = src?.data as NodeData | undefined;

            if (
              src?.type === 'swap' &&
              d?.estimatedAmountOutSymbol &&
              d?.estimatedAmountOut != null
            ) {
              const sym = d.estimatedAmountOutSymbol;
              const amt = parseFloat(d.estimatedAmountOut);
              if (!Number.isNaN(amt)) {
                sumsBySymbol[sym] = (sumsBySymbol[sym] ?? 0) + amt;
              }
            }
          }

          const symbols = Object.keys(sumsBySymbol);
          if (symbols.length === 0) return nds;

          // Use the symbol with the largest sum
          const asset = symbols.reduce((a, b) =>
            (sumsBySymbol[a] ?? 0) >= (sumsBySymbol[b] ?? 0) ? a : b
          );
          const total = sumsBySymbol[asset] ?? 0;

          // Count how many transfer nodes are connected to the same source(s)
          // to split the amount equally
          const targetTransferIds = new Set<string>();
          for (const sourceId of incomingSourceIds) {
            const outgoingEdges = newEdges.filter((e) => e.source === sourceId);
            for (const edge of outgoingEdges) {
              const targetNode = nds.find((n) => n.id === edge.target);
              if (targetNode?.type === 'transfer') {
                targetTransferIds.add(edge.target);
              }
            }
          }

          const splitCount = targetTransferIds.size || 1;
          const splitAmount = total / splitCount;
          const amountStr =
            splitAmount <= 0
              ? '0'
              : splitAmount < 0.0001
                ? splitAmount.toExponential(2)
                : splitAmount.toFixed(6);

          // Update all connected transfer nodes with the split amount
          return nds.map((n) =>
            targetTransferIds.has(n.id)
              ? {
                  ...n,
                  data: {
                    ...n.data,
                    asset,
                    amount: amountStr,
                    amountManuallyEdited: false, // Reset flag when edges change
                  },
                }
              : n
          );
        });
      }
    },
    [setEdges, setNodes, nodes, edges]
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

  const handleEdgeTypeChange = useCallback(
    (type: 'default' | 'straight' | 'step' | 'smoothstep') => {
      setEdgeType(type);
      setEdges((eds) => eds.map((e) => ({ ...e, type })));
    },
    [setEdges]
  );

  // Listen for custom addNode events from nodes
  useEffect(() => {
    const handleAddNode = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { sourceNodeId } = customEvent.detail;

      // Find the source node to position the new node relative to it
      const sourceNode = nodes.find((n) => n.id === sourceNodeId);
      if (!sourceNode) return;

      // Find all existing nodes connected to this source
      const outgoingEdges = edges.filter((e) => e.source === sourceNodeId);
      const connectedNodeIds = outgoingEdges.map((e) => e.target);
      const connectedNodes = nodes.filter((n) => connectedNodeIds.includes(n.id));

      // Calculate Y position for the new node (below all existing connected nodes)
      let newY = sourceNode.position.y;
      if (connectedNodes.length > 0) {
        // Find the lowest Y position among connected nodes
        const maxY = Math.max(...connectedNodes.map((n) => n.position.y));
        newY = maxY + 200; // Place 200px below the lowest connected node
      }

      // Generate a truly unique ID by finding the max existing node ID
      const existingNodeIds = nodes
        .map((n) => {
          const match = n.id.match(/node-(\d+)/);
          return match ? parseInt(match[1]) : 0;
        })
        .filter((id) => !isNaN(id));
      const maxExistingId = existingNodeIds.length > 0 ? Math.max(...existingNodeIds) : 0;
      const newNodeId = `node-${maxExistingId + 1}`;

      // Create a new selector node to the right of the source
      const newNode: Node<NodeData> = {
        id: newNodeId,
        type: 'selector',
        position: {
          x: sourceNode.position.x + 350,
          y: newY,
        },
        data: {
          label: 'Select Action',
          type: 'protocol',
        },
      };

      // Add the new node
      setNodes((nds) => [...nds, newNode]);

      // Automatically connect the source to the new node
      // Edge is animated (dashed) because target is a selector node
      const newEdge: Edge = {
        id: `e${sourceNodeId}-${newNode.id}`,
        source: sourceNodeId,
        target: newNode.id,
        type: edgeType,
        animated: true, // Dashed until selector chooses an action
        style: { strokeWidth: 2, stroke: '#3b82f6' },
      };
      setEdges((eds) => [...eds, newEdge]);
    };

    window.addEventListener('addNode', handleAddNode);
    return () => window.removeEventListener('addNode', handleAddNode);
  }, [nodes, setNodes, setEdges, edgeType]);

  return (
    <div
      ref={containerRef}
      className="w-full h-screen bg-gray-50 dark:bg-gray-950"
    >
      <Sidebar
        isFullscreen={isFullscreen}
        onToggleFullscreen={handleToggleFullscreen}
        edgeType={edgeType}
        onEdgeTypeChange={handleEdgeTypeChange}
        isDark={theme === 'dark'}
        onToggleTheme={toggleTheme}
        onSave={handleSave}
        onLoad={fileOps.handleLoad}
        onExport={fileOps.handleExport}
        tabs={workspace.tabs}
        activeTabId={workspace.activeTabId}
        onTabChange={workspace.handleTabChange}
        onTabClose={workspace.handleTabClose}
        onTabAdd={handleNewTab}
      />
      <div className="w-full h-full pl-16">
        <div className="w-full h-full">
          <ReactFlow
            nodes={nodes}
            edges={styledEdges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onSelectionChange={handleSelectionChange}
            nodeTypes={nodeTypes}
            fitView
            defaultEdgeOptions={{
              type: edgeType,
              animated: false,
              style: { strokeWidth: 2, stroke: '#3b82f6' },
            }}
          >
            <Background
              gap={16}
              size={1}
              color={theme === 'dark' ? '#ffffff' : '#d1d5db'}
              style={{ backgroundColor: theme === 'dark' ? '#030712' : '#f9fafb' }}
            />
            <Controls />
          </ReactFlow>
        </div>
      </div>
      <RightSidebar
        nodes={nodes as Node<NodeData>[]}
        edges={edges}
        onExecute={handleExecute}
        isExecuting={isExecuting}
        onDeleteSelected={handleDeleteSelected}
        onInsertNode={handleInsertNode}
        canInsert={selectedEdges.length === 1 || selectedNodes.length === 1}
        canDelete={canDelete}
      />
      <SuccessModal
        isOpen={!!lastResult}
        onClose={clearResult}
        digest={lastResult?.digest || ''}
        stepCount={lastResult?.stepCount || 0}
        network="mainnet"
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
