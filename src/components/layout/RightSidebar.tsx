import { Play, List, X, Trash2, Plus, Map } from 'lucide-react';
import { useState } from 'react';
import type { Node, Edge } from '@xyflow/react';
import type { NodeData } from '@/types';
import { useExecutionSequence } from '@/hooks/useExecutionSequence';

interface RightSidebarProps {
  nodes: Node<NodeData>[];
  edges: Edge[];
  onExecute: () => void;
  isExecuting: boolean;
  onDeleteSelected: () => void;
  onInsertNode: () => void;
  canInsert: boolean;
  canDelete: boolean;
  showMiniMap: boolean;
  onToggleMiniMap: () => void;
}

export function RightSidebar({ nodes: _nodes, edges: _edges, onExecute, isExecuting, onDeleteSelected, onInsertNode, canInsert, canDelete, showMiniMap, onToggleMiniMap }: RightSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Get execution sequence from shared hook
  const { sequence: executionSequence } = useExecutionSequence();
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
          title="Add node: After selected node, between selected edge, or standalone"
        >
          <Plus className="w-5 h-5" />
        </button>

        {/* Delete Button */}
        <button
          onClick={onDeleteSelected}
          disabled={!canDelete}
          className={`p-3 rounded-l-lg shadow-lg transition-colors ${
            canDelete
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-gray-300 text-gray-500 dark:bg-gray-400 dark:text-gray-200 cursor-not-allowed'
          }`}
          title={canDelete ? 'Delete selected items (Backspace/Delete)' : 'Select edges or non-wallet nodes to delete'}
        >
          <Trash2 className="w-5 h-5" />
        </button>

        {/* Execute Now Button - run sequence without opening the panel */}
        <button
          onClick={onExecute}
          disabled={!hasSequence || isExecuting}
          className={`p-3 rounded-l-lg shadow-lg transition-colors ${
            hasSequence
              ? isExecuting
                ? 'bg-purple-600 text-white cursor-wait'
                : 'bg-purple-600 hover:bg-purple-700 text-white'
              : 'bg-gray-300 text-gray-500 dark:bg-gray-400 dark:text-gray-200 cursor-not-allowed'
          }`}
          title={isExecuting ? 'Executing...' : 'Execute sequence now (no review)'}
        >
          {isExecuting ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Play className="w-5 h-5" />
          )}
        </button>

        {/* Toggle Panel Button - review sequence then execute */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="bg-blue-600 text-white p-3 rounded-l-lg shadow-lg hover:bg-blue-700 transition-colors"
          title="Open Execution Panel"
        >
          <List className="w-5 h-5" />
        </button>

        {/* Toggle MiniMap Button */}
        <button
          onClick={onToggleMiniMap}
          className={`p-3 rounded-l-lg shadow-lg transition-colors ${
            showMiniMap
              ? 'bg-teal-600 hover:bg-teal-700 text-white'
              : 'bg-gray-400 hover:bg-gray-500 text-white dark:bg-gray-600 dark:hover:bg-gray-500'
          }`}
          title={showMiniMap ? 'Hide MiniMap' : 'Show MiniMap'}
        >
          <Map className="w-5 h-5" />
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
              <h2 className="text-gray-900 dark:text-white font-semibold">Execute SUI Sequence</h2>
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
                          <div className="text-xs text-gray-600 dark:text-gray-400">
                            <span className="text-gray-500">Send:</span>{' '}
                            <span className="text-green-600 dark:text-green-400 font-mono">
                              {node.data.amount || '0'} {node.data.asset || 'SUI'}
                            </span>
                            {' '}
                            <span className="text-gray-500">To:</span>{' '}
                            <span className="text-blue-600 dark:text-blue-400 font-mono truncate">
                              {node.data.recipientAddress || 'Not set'}
                            </span>
                          </div>
                        )}
                        {node.type === 'logic' && (
                          <div className="space-y-1">
                            <div className="text-xs text-gray-600 dark:text-gray-400">
                              <span className="text-gray-500">Type:</span>{' '}
                              <span className="text-purple-600 dark:text-purple-400 font-medium">
                                {node.data.logicType === 'balance' ? 'Balance Check' : 'Contract Check'}
                              </span>
                            </div>
                            {node.data.logicType === 'balance' && (
                              <>
                                <div className="text-xs text-gray-600 dark:text-gray-400">
                                  <span className="text-gray-500">Asset:</span>{' '}
                                  <span className="text-purple-600 dark:text-purple-400 font-medium">
                                    {node.data.balanceAsset || 'SUI'}
                                  </span>
                                </div>
                                <div className="text-xs text-gray-600 dark:text-gray-400">
                                  <span className="text-gray-500">Address:</span>{' '}
                                  <span className="text-blue-600 dark:text-blue-400 font-mono">
                                    {node.data.balanceAddress || 'Not set'}
                                  </span>
                                </div>
                                <div className="text-xs text-gray-600 dark:text-gray-400">
                                  <span className="text-gray-500">Condition:</span>{' '}
                                  <span className="text-purple-600 dark:text-purple-400 font-mono">
                                    {node.data.comparisonOperator === 'gt' ? '>' :
                                     node.data.comparisonOperator === 'gte' ? '≥' :
                                     node.data.comparisonOperator === 'lt' ? '<' :
                                     node.data.comparisonOperator === 'lte' ? '≤' :
                                     node.data.comparisonOperator === 'eq' ? '=' :
                                     node.data.comparisonOperator === 'ne' ? '≠' : '?'}
                                  </span>
                                  {' '}
                                  <span className="text-green-600 dark:text-green-400 font-mono">
                                    {node.data.compareValue || '0'} {node.data.balanceAsset || 'SUI'}
                                  </span>
                                </div>
                                <div className="text-xs text-gray-500 italic">
                                  Skips downstream if false
                                </div>
                              </>
                            )}
                            {node.data.logicType === 'contract' && (
                              <>
                                <div className="text-xs text-gray-600 dark:text-gray-400">
                                  <span className="text-gray-500">Contract:</span>{' '}
                                  <span className="text-blue-600 dark:text-blue-400 font-mono text-[10px]">
                                    {node.data.contractPackageId?.slice(0, 8)}...
                                  </span>
                                </div>
                                <div className="text-xs text-gray-600 dark:text-gray-400">
                                  <span className="text-gray-500">Function:</span>{' '}
                                  <span className="text-blue-600 dark:text-blue-400 font-mono">
                                    {node.data.contractModule}::{node.data.contractFunction}
                                  </span>
                                </div>
                                <div className="text-xs text-gray-600 dark:text-gray-400">
                                  <span className="text-gray-500">Condition:</span>{' '}
                                  <span className="text-purple-600 dark:text-purple-400 font-mono">
                                    {node.data.contractComparisonOperator === 'gt' ? '>' :
                                     node.data.contractComparisonOperator === 'gte' ? '≥' :
                                     node.data.contractComparisonOperator === 'lt' ? '<' :
                                     node.data.contractComparisonOperator === 'lte' ? '≤' :
                                     node.data.contractComparisonOperator === 'eq' ? '=' :
                                     node.data.contractComparisonOperator === 'ne' ? '≠' : '?'}
                                  </span>
                                  {' '}
                                  <span className="text-green-600 dark:text-green-400 font-mono">
                                    {node.data.contractCompareValue || '0'}
                                  </span>
                                </div>
                                <div className="text-xs text-gray-500 italic">
                                  Skips downstream if false
                                </div>
                              </>
                            )}
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
                        {node.type === 'lend' && (
                          <div className="space-y-1">
                            <div className="text-xs text-gray-600 dark:text-gray-400">
                              <span className="text-gray-500">Protocol:</span>{' '}
                              <span className="text-orange-600 dark:text-orange-400 font-medium">
                                {node.data.lendProtocol === 'navi' ? 'Navi' : 'Scallop'}
                              </span>
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">
                              <span className="text-gray-500">
                                {node.data.lendAction === 'borrow' ? 'Borrow:' :
                                 node.data.lendAction === 'withdraw' ? 'Withdraw:' :
                                 node.data.lendAction === 'repay' ? 'Repay:' : 'Deposit:'}
                              </span>{' '}
                              <span className="text-green-600 dark:text-green-400 font-mono">
                                {node.data.lendAmount || '0'} {node.data.lendAsset || 'SUI'}
                              </span>
                            </div>
                          </div>
                        )}
                        {node.type === 'stake' && (
                          <div className="space-y-1">
                            <div className="text-xs text-gray-600 dark:text-gray-400">
                              <span className="text-gray-500">Protocol:</span>{' '}
                              <span className="text-blue-600 dark:text-blue-400 font-medium">
                                {node.data.stakeProtocol === 'aftermath' ? 'Aftermath (afSUI)' :
                                 node.data.stakeProtocol === 'volo' ? 'Volo (vSUI)' : 'Native Staking'}
                              </span>
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">
                              <span className="text-gray-500">Stake:</span>{' '}
                              <span className="text-green-600 dark:text-green-400 font-mono">
                                {node.data.stakeAmount || '0'} SUI
                              </span>
                            </div>
                          </div>
                        )}
                        {node.type === 'bridge' && (
                          <div className="space-y-1">
                            <div className="text-xs text-gray-600 dark:text-gray-400">
                              <span className="text-gray-500">Bridge:</span>{' '}
                              <span className="text-green-600 dark:text-green-400 font-mono">
                                {node.data.bridgeAmount || '0'} {node.data.bridgeAsset || 'SUI'}
                              </span>
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">
                              <span className="text-gray-500">To:</span>{' '}
                              <span className="text-purple-600 dark:text-purple-400 font-mono">
                                {node.data.bridgeOutputAsset || '?'} on {node.data.bridgeChain || '?'}
                              </span>
                            </div>
                            <div className="text-xs text-gray-500 italic">
                              Via LI.FI (separate tx)
                            </div>
                          </div>
                        )}
                        {node.type === 'custom' && (
                          <div className="space-y-1">
                            <div className="text-xs text-gray-600 dark:text-gray-400">
                              <span className="text-gray-500">Contract:</span>{' '}
                              <span className="text-gray-600 dark:text-gray-400 font-mono text-[10px] truncate">
                                {node.data.customPackageId?.slice(0, 10) || 'Not set'}...
                              </span>
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">
                              <span className="text-gray-500">Call:</span>{' '}
                              <span className="text-gray-600 dark:text-gray-400 font-mono">
                                {node.data.customModule || '?'}::{node.data.customFunction || '?'}
                              </span>
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
                  <span>Execute SUI Sequence</span>
                </>
              )}
            </button>

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
