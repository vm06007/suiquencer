import { Play, List, X, Trash2, Plus } from 'lucide-react';
import { useState } from 'react';
import type { Node, Edge } from '@xyflow/react';
import type { NodeData } from '@/types';

interface RightSidebarProps {
  nodes: Node<NodeData>[];
  edges: Edge[];
  onExecute: () => void;
  isExecuting: boolean;
  onDeleteSelected: () => void;
  onInsertNode: () => void;
  hasSelection: boolean;
  canInsert: boolean;
}

export function RightSidebar({ nodes, edges, onExecute, isExecuting, onDeleteSelected, onInsertNode, hasSelection, canInsert }: RightSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Get execution sequence by following edges from wallet node
  const getExecutionSequence = () => {
    const walletNode = nodes.find(n => n.type === 'wallet');
    if (!walletNode) return [];

    const sequence: Node<NodeData>[] = [];
    const visited = new Set<string>();

    const traverse = (nodeId: string) => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);

      const node = nodes.find(n => n.id === nodeId);
      if (!node || node.type === 'wallet') return;
      if (node.type === 'selector') return; // Skip selector nodes

      sequence.push(node);

      // Find outgoing edges
      const outgoingEdges = edges.filter(e => e.source === nodeId);
      outgoingEdges.forEach(edge => traverse(edge.target));
    };

    // Start from wallet's outgoing edges
    const startEdges = edges.filter(e => e.source === walletNode.id);
    startEdges.forEach(edge => traverse(edge.target));

    return sequence;
  };

  const executionSequence = getExecutionSequence();
  const hasSequence = executionSequence.length > 0;

  return (
    <>
      {/* Floating Buttons */}
      <div className="fixed right-0 top-1/2 -translate-y-1/2 flex flex-col gap-2 z-40">
        {/* Insert Node Button */}
        <button
          onClick={onInsertNode}
          disabled={!canInsert}
          className={`p-3 rounded-l-lg shadow-lg transition-colors ${
            canInsert
              ? 'bg-green-600 hover:bg-green-700 text-white'
              : 'bg-gray-300 text-gray-500 dark:bg-gray-400 dark:text-gray-200 cursor-not-allowed'
          }`}
          title="Add sequence after selected node or insert between selected edge"
        >
          <Plus className="w-5 h-5" />
        </button>

        {/* Delete Button */}
        <button
          onClick={onDeleteSelected}
          disabled={!hasSelection}
          className={`p-3 rounded-l-lg shadow-lg transition-colors ${
            hasSelection
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-gray-300 text-gray-500 dark:bg-gray-400 dark:text-gray-200 cursor-not-allowed'
          }`}
          title="Delete selected items (Backspace/Delete)"
        >
          <Trash2 className="w-5 h-5" />
        </button>

        {/* Execute Now Button - run sequence without opening the panel */}
        <button
          onClick={onExecute}
          disabled={!hasSequence || isExecuting}
          className={`p-3 rounded-l-lg shadow-lg transition-colors ${
            hasSequence && !isExecuting
              ? 'bg-purple-600 hover:bg-purple-700 text-white'
              : 'bg-gray-300 text-gray-500 dark:bg-gray-400 dark:text-gray-200 cursor-not-allowed'
          }`}
          title="Execute sequence now (no review)"
        >
          <Play className="w-5 h-5" />
        </button>

        {/* Toggle Panel Button - review sequence then execute */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="bg-blue-600 text-white p-3 rounded-l-lg shadow-lg hover:bg-blue-700 transition-colors"
          title="Open Execution Panel"
        >
          <List className="w-5 h-5" />
        </button>
      </div>

      {/* Sidebar Panel */}
      <div
        className={`fixed right-0 top-0 h-screen w-80 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 shadow-2xl transform transition-transform duration-300 z-50 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <Play className="w-5 h-5 text-blue-500 dark:text-blue-400" />
              <h2 className="text-gray-900 dark:text-white font-semibold">Execute Sequence</h2>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Sequence List */}
          <div className="flex-1 overflow-y-auto p-4">
            {hasSequence ? (
              <div className="space-y-3">
                <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-500/30 rounded-lg p-3 mb-4">
                  <div className="text-xs font-semibold text-blue-700 dark:text-blue-400 mb-1">⚛️ Atomic Transaction</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    All {executionSequence.length} step{executionSequence.length !== 1 ? 's' : ''} execute in one transaction block - all succeed or all fail
                  </div>
                </div>

                {executionSequence.map((node, index) => (
                  <div
                    key={node.id}
                    className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-semibold">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 dark:text-white text-sm mb-1">
                          {node.data.label}
                        </div>
                        {node.type === 'transfer' && (
                          <div className="space-y-1">
                            <div className="text-xs text-gray-600 dark:text-gray-400">
                              <span className="text-gray-500">Send:</span>{' '}
                              <span className="text-green-600 dark:text-green-400 font-mono">
                                {node.data.amount || '0'} {node.data.asset || 'SUI'}
                              </span>
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">
                              <span className="text-gray-500">To:</span>{' '}
                              <span className="text-blue-600 dark:text-blue-400 font-mono truncate block">
                                {node.data.recipientAddress || 'Not set'}
                              </span>
                            </div>
                          </div>
                        )}
                        {node.type === 'swap' && (
                          <div className="space-y-1">
                            <div className="text-xs text-gray-600 dark:text-gray-400">
                              <span className="text-gray-500">Swap:</span>{' '}
                              <span className="text-green-600 dark:text-green-400 font-mono">
                                {node.data.amount || '0'} {node.data.fromAsset || 'SUI'}
                              </span>
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">
                              <span className="text-gray-500">For:</span>{' '}
                              <span className="text-blue-600 dark:text-blue-400 font-mono">
                                ~{node.data.toAsset || 'USDC'}
                              </span>
                            </div>
                            <div className="text-xs text-gray-500 italic">
                              Via Cetus Aggregator
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-500 mt-8">
                <Play className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No sequence to execute</p>
                <p className="text-xs mt-1">Add nodes to create a sequence</p>
              </div>
            )}
          </div>

          {/* Execute Button */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={onExecute}
              disabled={!hasSequence || isExecuting}
              className={`w-full py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
                hasSequence && !isExecuting
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
              }`}
            >
              {isExecuting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Executing...</span>
                </>
              ) : (
                <>
                  <Play className="w-5 h-5" />
                  <span>Execute Sequence</span>
                </>
              )}
            </button>

            {hasSequence && (
              <p className="text-xs text-gray-500 mt-2 text-center">
                All steps execute in one atomic transaction ⚛️
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Overlay when open - same in both themes */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
