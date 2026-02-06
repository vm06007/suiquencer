import { memo, useCallback, useMemo, useState, useEffect } from 'react';
import { Handle, Position, type NodeProps, useReactFlow, useNodes, useEdges } from '@xyflow/react';
import { Brain, Plus, Loader2, CheckCircle, XCircle, ExternalLink, Info } from 'lucide-react';
import { useSuiClient } from '@mysten/dapp-kit';
import { isValidSuiAddress, isValidSuiNSName } from '@mysten/sui/utils';
import { SuinsClient } from '@mysten/suins';
import { SuiNSHelper } from '../SuiNSHelper';
import { NodeMenu } from './NodeMenu';
import type { NodeData, LogicType, ComparisonOperator } from '@/types';

const LOGIC_TYPES = [
  { value: 'balance', label: 'Balance Check' },
  { value: 'contract', label: 'Contract Check' },
] as const;

const COMPARISON_OPTIONS: { value: ComparisonOperator; label: string }[] = [
  { value: 'gt', label: '>' },
  { value: 'gte', label: '>=' },
  { value: 'lt', label: '<' },
  { value: 'lte', label: '<=' },
  { value: 'eq', label: '=' },
  { value: 'ne', label: '≠' },
];

function LogicNode({ data, id }: NodeProps) {
  const { setNodes } = useReactFlow();
  const nodes = useNodes();
  const edges = useEdges();
  const nodeData = data as NodeData;
  const suiClient = useSuiClient();

  const [currentBalance, setCurrentBalance] = useState<string | null>(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [balanceError, setBalanceError] = useState<string | null>(null);
  const [suinsValidation, setSuinsValidation] = useState<{
    isValidating: boolean;
    isValid: boolean | null;
    resolvedAddress: string | null;
    isRegisteredButNoAddress?: boolean;
  }>({ isValidating: false, isValid: null, resolvedAddress: null, isRegisteredButNoAddress: false });

  // Calculate sequence number
  const sequenceNumber = useMemo(() => {
    const walletNode = nodes.find((n) => n.type === 'wallet');
    if (!walletNode) return 0;

    let counter = 0;
    const visited = new Set<string>();

    const traverse = (nodeId: string): number | null => {
      if (visited.has(nodeId)) return null;
      visited.add(nodeId);

      const node = nodes.find((n) => n.id === nodeId);

      if (!node || node.type === 'wallet') {
        const outgoing = edges.filter((e) => e.source === nodeId);
        const sortedEdges = outgoing.sort((a, b) => {
          const targetA = nodes.find((n) => n.id === a.target);
          const targetB = nodes.find((n) => n.id === b.target);
          if (!targetA || !targetB) return 0;
          if (Math.abs(targetA.position.y - targetB.position.y) > 50) {
            return targetA.position.y - targetB.position.y;
          }
          return targetA.position.x - targetB.position.x;
        });
        for (const edge of sortedEdges) {
          const result = traverse(edge.target);
          if (result !== null) return result;
        }
        return null;
      }

      if (node.type === 'selector') {
        const outgoing = edges.filter((e) => e.source === nodeId);
        const sortedEdges = outgoing.sort((a, b) => {
          const targetA = nodes.find((n) => n.id === a.target);
          const targetB = nodes.find((n) => n.id === b.target);
          if (!targetA || !targetB) return 0;
          if (Math.abs(targetA.position.y - targetB.position.y) > 50) {
            return targetA.position.y - targetB.position.y;
          }
          return targetA.position.x - targetB.position.x;
        });
        for (const edge of sortedEdges) {
          const result = traverse(edge.target);
          if (result !== null) return result;
        }
        return null;
      }

      counter++;
      if (nodeId === id) {
        return counter;
      }

      const outgoing = edges.filter((e) => e.source === nodeId);
      for (const edge of outgoing) {
        const result = traverse(edge.target);
        if (result !== null) return result;
      }

      return null;
    };

    traverse(walletNode.id);
    return counter;
  }, [id, nodes, edges]);

  // Validate SuiNS name
  useEffect(() => {
    const address = nodeData.balanceAddress;

    if (!address) {
      setSuinsValidation({ isValidating: false, isValid: null, resolvedAddress: null });
      return;
    }

    // If it's a regular address, no validation needed
    if (address.startsWith('0x')) {
      setSuinsValidation({ isValidating: false, isValid: null, resolvedAddress: null });
      return;
    }

    // Check if it's a valid SuiNS name
    if (isValidSuiNSName(address)) {
      setSuinsValidation({ isValidating: true, isValid: null, resolvedAddress: null });

      const validateName = async () => {
        try {
          const suinsClient = new SuinsClient({
            client: suiClient as any,
            network: 'mainnet',
          });
          const nameRecord = await suinsClient.getNameRecord(address);

          if (nameRecord && nameRecord.targetAddress) {
            setSuinsValidation({
              isValidating: false,
              isValid: true,
              resolvedAddress: nameRecord.targetAddress,
              isRegisteredButNoAddress: false,
            });
          } else if (nameRecord && !nameRecord.targetAddress) {
            setSuinsValidation({
              isValidating: false,
              isValid: false,
              resolvedAddress: null,
              isRegisteredButNoAddress: true,
            });
          } else {
            setSuinsValidation({
              isValidating: false,
              isValid: false,
              resolvedAddress: null,
              isRegisteredButNoAddress: false,
            });
          }
        } catch (error) {
          console.error('SuiNS validation error:', error);
          setSuinsValidation({
            isValidating: false,
            isValid: false,
            resolvedAddress: null,
            isRegisteredButNoAddress: false,
          });
        }
      };

      const timeoutId = setTimeout(validateName, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [nodeData.balanceAddress, suiClient]);

  // Fetch balance when address is valid
  useEffect(() => {
    // Use resolved address if available, otherwise use the input address
    const address =
      suinsValidation.resolvedAddress || nodeData.balanceAddress?.trim();

    if (!address || !isValidSuiAddress(address)) {
      setCurrentBalance(null);
      setBalanceError(null);
      return;
    }

    const fetchBalance = async () => {
      setIsLoadingBalance(true);
      setBalanceError(null);
      try {
        const balance = await suiClient.getBalance({
          owner: address,
        });
        const balanceInSui = parseInt(balance.totalBalance) / Math.pow(10, 9);
        setCurrentBalance(balanceInSui.toFixed(2));
      } catch (error) {
        console.error('Failed to fetch balance:', error);
        setBalanceError('Failed to fetch balance');
        setCurrentBalance(null);
      } finally {
        setIsLoadingBalance(false);
      }
    };

    fetchBalance();
  }, [nodeData.balanceAddress, suiClient, suinsValidation.resolvedAddress]);

  const updateNodeData = useCallback(
    (updates: Partial<NodeData>) => {
      setNodes((nds) =>
        nds.map((node) =>
          node.id === id ? { ...node, data: { ...node.data, ...updates } } : node
        )
      );
    },
    [id, setNodes]
  );

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setNodes((nds) => nds.filter((node) => node.id !== id));
    },
    [id, setNodes]
  );

  const handleReplace = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setNodes((nds) =>
        nds.map((node) =>
          node.id === id
            ? {
                ...node,
                type: 'selector',
                data: {
                  label: 'Select Action',
                  type: 'protocol',
                },
              }
            : node
        )
      );
    },
    [id, setNodes]
  );

  // Check if we have a valid address (either directly or resolved from SuiNS)
  const addressValid =
    (nodeData.balanceAddress?.trim() &&
      isValidSuiAddress(nodeData.balanceAddress.trim())) ||
    (suinsValidation.isValid && suinsValidation.resolvedAddress);

  return (
    <div className="bg-white dark:bg-gray-800 border-2 border-purple-500 rounded-lg shadow-lg min-w-[280px]">
      <div className="bg-purple-500 px-3 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-white" />
          <span className="font-semibold text-white text-sm">
            {sequenceNumber > 0 && `${sequenceNumber}. `}
            {nodeData.label}
          </span>
        </div>
        <NodeMenu onDelete={handleDelete} onReplace={handleReplace} />
      </div>

      <div className="p-4 space-y-3">
        {/* Logic Type Selection */}
        <div>
          <label className="text-xs text-gray-600 dark:text-gray-300 mb-1 block">
            Logic Type
          </label>
          <select
            value={nodeData.logicType || 'balance'}
            onChange={(e) =>
              updateNodeData({
                logicType: e.target.value as LogicType,
                balanceAddress: undefined,
                comparisonOperator: undefined,
                compareValue: undefined,
              })
            }
            className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded text-sm focus:outline-none focus:border-purple-500 dark:focus:border-purple-400"
          >
            {LOGIC_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        {/* Balance Check UI */}
        {nodeData.logicType === 'balance' && (
          <>
            <div>
              <label className="text-xs text-gray-600 dark:text-gray-300 mb-1 block">
                Address (check balance of)
              </label>
              <input
                type="text"
                value={nodeData.balanceAddress || ''}
                onChange={(e) =>
                  updateNodeData({
                    balanceAddress: e.target.value,
                    comparisonOperator: undefined,
                    compareValue: undefined,
                  })
                }
                placeholder="0x..., name.sui, or @name"
                className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded text-sm font-mono focus:outline-none focus:border-purple-500 dark:focus:border-purple-400"
              />
              {nodeData.balanceAddress &&
                isValidSuiNSName(nodeData.balanceAddress) && (
                  <div className="mt-1">
                    {suinsValidation.isValidating && (
                      <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>Resolving SuiNS name...</span>
                      </div>
                    )}
                    {!suinsValidation.isValidating &&
                      suinsValidation.isValid === true &&
                      suinsValidation.resolvedAddress && (
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-xs text-green-600">
                            <CheckCircle className="w-3 h-3" />
                            <span>Valid SuiNS name</span>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400 font-mono bg-gray-50 dark:bg-gray-700 rounded p-1">
                            <span className="flex-1 truncate">
                              → {suinsValidation.resolvedAddress.slice(0, 7)}...
                              {suinsValidation.resolvedAddress.slice(-5)}
                            </span>
                            <div className="flex items-center gap-0.5">
                              <div className="group relative">
                                <Info className="w-3 h-3 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 cursor-help" />
                                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-10">
                                  {suinsValidation.resolvedAddress}
                                </div>
                              </div>
                              <a
                                href={`https://suivision.xyz/account/${suinsValidation.resolvedAddress}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-500 hover:text-blue-700"
                                title="View on SuiVision"
                              >
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                          </div>
                        </div>
                      )}
                    {!suinsValidation.isValidating &&
                      suinsValidation.isValid === false && (
                        <div className="flex items-center gap-1 text-xs text-red-600">
                          <XCircle className="w-3 h-3" />
                          <span>
                            {suinsValidation.isRegisteredButNoAddress
                              ? 'Name registered but owner has not set a target address'
                              : 'This SuiNS name is not registered'}
                          </span>
                        </div>
                      )}
                  </div>
                )}
              {(!nodeData.balanceAddress ||
                !isValidSuiNSName(nodeData.balanceAddress)) &&
                !nodeData.balanceAddress?.startsWith('0x') && (
                  <SuiNSHelper
                    onSelectName={(name) => updateNodeData({ balanceAddress: name })}
                  />
                )}
            </div>

            {addressValid && (
              <>
                <div>
                  <label className="text-xs text-gray-600 dark:text-gray-300 mb-1 block">
                    Condition
                  </label>
                  <select
                    value={nodeData.comparisonOperator || ''}
                    onChange={(e) =>
                      updateNodeData({
                        comparisonOperator: e.target.value as ComparisonOperator,
                      })
                    }
                    className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded text-sm focus:outline-none focus:border-purple-500 dark:focus:border-purple-400"
                  >
                    <option value="">Compare</option>
                    {COMPARISON_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-600 dark:text-gray-300 mb-1 block">
                    Value (SUI)
                  </label>
                  <input
                    type="text"
                    value={nodeData.compareValue || ''}
                    onChange={(e) => updateNodeData({ compareValue: e.target.value })}
                    placeholder="e.g. 1.5"
                    className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded text-sm font-mono focus:outline-none focus:border-purple-500 dark:focus:border-purple-400"
                  />
                </div>

                {/* Current Balance Display */}
                <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded px-2 py-1.5">
                  <div className="text-xs text-gray-600 dark:text-gray-300 flex items-center gap-1">
                    {isLoadingBalance ? (
                      <span className="flex items-center gap-1">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Current SUI balance: loading...
                      </span>
                    ) : balanceError ? (
                      <span className="text-red-600 dark:text-red-400">
                        Current SUI balance: {balanceError}
                      </span>
                    ) : currentBalance !== null ? (
                      <>
                        <span className="font-mono">
                          Current SUI balance: {currentBalance} SUI
                        </span>
                        <div className="group relative">
                          <Info className="w-3 h-3 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 cursor-help" />
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-10">
                            If condition is TRUE, execution proceeds. Otherwise, branch is skipped.
                          </div>
                        </div>
                      </>
                    ) : null}
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {/* Contract Check UI (placeholder for now) */}
        {nodeData.logicType === 'contract' && (
          <div className="text-xs text-gray-500 dark:text-gray-400 py-4 text-center">
            Contract check coming soon...
          </div>
        )}
      </div>

      {/* Handles */}
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-purple-500 !w-3 !h-3"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!bg-purple-500 !w-3 !h-3"
      />

      {/* Add Sequence button */}
      <div className="border-t border-gray-200 dark:border-gray-700 p-2 flex justify-center">
        <button
          className="flex items-center gap-1 text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/20 px-3 py-1 rounded transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            const event = new CustomEvent('addNode', {
              detail: { sourceNodeId: id },
            });
            window.dispatchEvent(event);
          }}
        >
          <Plus className="w-4 h-4" />
          <span>Add Sequence</span>
        </button>
      </div>
    </div>
  );
}

export default memo(LogicNode);
