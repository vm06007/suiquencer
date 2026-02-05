import { memo, useCallback, useMemo, useEffect, useState } from 'react';
import { Handle, Position, type NodeProps, useReactFlow, useNodes, useEdges } from '@xyflow/react';
import { Send, Plus, X, CheckCircle, XCircle, Loader2, AlertTriangle, ExternalLink, Info } from 'lucide-react';
import { useSuiClient, useCurrentAccount, useSuiClientQuery } from '@mysten/dapp-kit';
import { SuinsClient } from '@mysten/suins';
import { isValidSuiNSName } from '@mysten/sui/utils';
import { SuiNSHelper } from '../SuiNSHelper';
import type { NodeData } from '@/types';

function TransferNode({ data, id }: NodeProps) {
  const { setNodes } = useReactFlow();
  const nodes = useNodes();
  const edges = useEdges();
  const nodeData = data as NodeData;
  const suiClient = useSuiClient();
  const account = useCurrentAccount();
  const [suinsValidation, setSuinsValidation] = useState<{
    isValidating: boolean;
    isValid: boolean | null;
    resolvedAddress: string | null;
    isRegisteredButNoAddress?: boolean;
  }>({ isValidating: false, isValid: null, resolvedAddress: null, isRegisteredButNoAddress: false });

  // Get wallet balance
  const { data: balance } = useSuiClientQuery(
    'getBalance',
    {
      owner: account?.address || '',
      coinType: '0x2::sui::SUI',
    },
    {
      enabled: !!account,
    }
  );

  // Calculate sequence number and cumulative amounts
  const { sequenceNumber, cumulativeAmount, totalAmount } = useMemo(() => {
    // Find wallet node
    const walletNode = nodes.find(n => n.type === 'wallet');
    if (!walletNode) return { sequenceNumber: 0, cumulativeAmount: 0, totalAmount: 0 };

    // Calculate cumulative amount up to this node and total amount
    let counter = 0;
    let cumulative = 0;
    let total = 0;
    let foundThisNode = false;
    const visited = new Set<string>();

    const traverse = (nodeId: string): number | null => {
      if (visited.has(nodeId)) return null;
      visited.add(nodeId);

      const node = nodes.find(n => n.id === nodeId);

      // Skip wallet and selector nodes, but continue traversing through them
      if (!node || node.type === 'wallet') {
        const outgoing = edges.filter(e => e.source === nodeId);
        for (const edge of outgoing) {
          const result = traverse(edge.target);
          if (result !== null) return result;
        }
        return null;
      }

      // Skip selector nodes but continue through them
      if (node.type === 'selector') {
        const outgoing = edges.filter(e => e.source === nodeId);
        for (const edge of outgoing) {
          const result = traverse(edge.target);
          if (result !== null) return result;
        }
        return null;
      }

      // This is a valid sequence node (transfer, swap, etc.)
      counter++;
      const amount = parseFloat(node.data.amount || '0');

      if (!foundThisNode) {
        cumulative += amount;
      }
      total += amount;

      if (nodeId === id) {
        foundThisNode = true;
        return counter;
      }

      // Continue traversing
      const outgoing = edges.filter(e => e.source === nodeId);
      for (const edge of outgoing) {
        const result = traverse(edge.target);
        if (result !== null) return result;
      }

      return null;
    };

    traverse(walletNode.id);
    return { sequenceNumber: counter, cumulativeAmount: cumulative, totalAmount: total };
  }, [id, nodes, edges]);

  // Check balance validation
  const balanceWarning = useMemo(() => {
    if (!balance || !account) return null;

    const balanceInSui = parseInt(balance.totalBalance) / 1_000_000_000;
    const currentAmount = parseFloat(nodeData.amount || '0');
    const gasReserve = 0.5; // Reserve for gas fees

    // Check if this individual transfer exceeds available balance
    if (currentAmount > balanceInSui - gasReserve) {
      return {
        type: 'error' as const,
        message: `Exceeds wallet balance (${balanceInSui.toFixed(4)} SUI)`,
      };
    }

    // Check if cumulative amount exceeds balance
    if (cumulativeAmount > balanceInSui - gasReserve) {
      return {
        type: 'error' as const,
        message: `Cumulative total (${cumulativeAmount.toFixed(4)} SUI) exceeds balance`,
      };
    }

    // Warning if getting close to balance
    if (totalAmount > balanceInSui - gasReserve) {
      return {
        type: 'warning' as const,
        message: `Total sequence (${totalAmount.toFixed(4)} SUI) exceeds balance`,
      };
    }

    return null;
  }, [balance, account, nodeData.amount, cumulativeAmount, totalAmount]);

  // Validate SuiNS name
  useEffect(() => {
    const recipientAddress = nodeData.recipientAddress;

    if (!recipientAddress) {
      setSuinsValidation({ isValidating: false, isValid: null, resolvedAddress: null });
      return;
    }

    // If it's a regular address, no validation needed
    if (recipientAddress.startsWith('0x')) {
      setSuinsValidation({ isValidating: false, isValid: null, resolvedAddress: null });
      return;
    }

    // Check if it's a valid SuiNS name using the utility function
    if (isValidSuiNSName(recipientAddress)) {
      setSuinsValidation({ isValidating: true, isValid: null, resolvedAddress: null });

      const validateName = async () => {
        try {
          const suinsClient = new SuinsClient({
            client: suiClient,
            network: 'mainnet'
          });
          // Pass the name directly - the client handles both @ and .sui formats
          const nameRecord = await suinsClient.getNameRecord(recipientAddress);

          if (nameRecord && nameRecord.targetAddress) {
            // Name is registered AND has an address set
            setSuinsValidation({ isValidating: false, isValid: true, resolvedAddress: nameRecord.targetAddress, isRegisteredButNoAddress: false });
          } else if (nameRecord && !nameRecord.targetAddress) {
            // Name is registered but owner hasn't set an address
            setSuinsValidation({ isValidating: false, isValid: false, resolvedAddress: null, isRegisteredButNoAddress: true });
          } else {
            // Name is not registered
            setSuinsValidation({ isValidating: false, isValid: false, resolvedAddress: null, isRegisteredButNoAddress: false });
          }
        } catch (error) {
          console.error('SuiNS validation error:', error);
          setSuinsValidation({ isValidating: false, isValid: false, resolvedAddress: null, isRegisteredButNoAddress: false });
        }
      };

      const timeoutId = setTimeout(validateName, 500); // Debounce
      return () => clearTimeout(timeoutId);
    }
  }, [nodeData.recipientAddress, suiClient]);

  const updateNodeData = useCallback((updates: Partial<NodeData>) => {
    setNodes((nds) =>
      nds.map((node) =>
        node.id === id
          ? { ...node, data: { ...node.data, ...updates } }
          : node
      )
    );
  }, [id, setNodes]);

  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setNodes((nds) => nds.filter((node) => node.id !== id));
  }, [id, setNodes]);

  return (
    <div className="bg-white border-2 border-green-500 rounded-lg shadow-lg min-w-[280px]">
      <div className="bg-green-500 px-3 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Send className="w-4 h-4 text-white" />
          <span className="font-semibold text-white text-sm">
            {sequenceNumber > 0 && `${sequenceNumber}. `}{nodeData.label}
          </span>
        </div>
        <button
          onClick={handleDelete}
          className="text-white hover:text-red-200 transition-colors"
          title="Delete node"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 space-y-3">
        {/* Asset Selection */}
        <div>
          <label className="text-xs text-gray-600 mb-1 block">Asset</label>
          <select
            value={nodeData.asset || 'SUI'}
            onChange={(e) => updateNodeData({ asset: e.target.value })}
            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:border-green-500"
          >
            <option value="SUI">SUI</option>
            <option value="USDC">USDC</option>
            <option value="USDT">USDT</option>
          </select>
        </div>

        {/* Amount Input */}
        <div>
          <label className="text-xs text-gray-600 mb-1 block">Amount</label>
          <input
            type="text"
            value={nodeData.amount || ''}
            onChange={(e) => updateNodeData({ amount: e.target.value })}
            placeholder="0.0"
            className={`w-full px-2 py-1.5 border rounded text-sm focus:outline-none ${
              balanceWarning?.type === 'error'
                ? 'border-red-500 focus:border-red-600'
                : balanceWarning?.type === 'warning'
                ? 'border-yellow-500 focus:border-yellow-600'
                : 'border-gray-300 focus:border-green-500'
            }`}
          />
          {balanceWarning && (
            <div
              className={`flex items-center gap-1 text-xs mt-1 ${
                balanceWarning.type === 'error' ? 'text-red-600' : 'text-yellow-600'
              }`}
            >
              <AlertTriangle className="w-3 h-3" />
              <span>{balanceWarning.message}</span>
            </div>
          )}
        </div>

        {/* Recipient Address */}
        <div>
          <label className="text-xs text-gray-600 mb-1 block">To Address</label>
          <input
            type="text"
            value={nodeData.recipientAddress || ''}
            onChange={(e) => updateNodeData({ recipientAddress: e.target.value })}
            placeholder="0x..., name.sui, or @name"
            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm font-mono focus:outline-none focus:border-green-500"
          />
          {nodeData.recipientAddress && isValidSuiNSName(nodeData.recipientAddress) && (
            <div className="mt-1">
              {suinsValidation.isValidating && (
                <div className="flex items-center gap-1 text-xs text-gray-600">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Resolving SuiNS name...</span>
                </div>
              )}
              {!suinsValidation.isValidating && suinsValidation.isValid === true && suinsValidation.resolvedAddress && (
                <div className="space-y-1">
                  <div className="flex items-center gap-1 text-xs text-green-600">
                    <CheckCircle className="w-3 h-3" />
                    <span>Valid SuiNS name</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-600 font-mono bg-gray-50 rounded p-1">
                    <span className="flex-1 truncate">
                      → {suinsValidation.resolvedAddress.slice(0, 7)}...{suinsValidation.resolvedAddress.slice(-5)}
                    </span>
                    <div className="flex items-center gap-0.5">
                      <div className="group relative">
                        <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
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
              {!suinsValidation.isValidating && suinsValidation.isValid === false && (
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
          {(!nodeData.recipientAddress || !isValidSuiNSName(nodeData.recipientAddress)) && !nodeData.recipientAddress?.startsWith('0x') && (
            <SuiNSHelper onSelectName={(name) => updateNodeData({ recipientAddress: name })} />
          )}
        </div>
      </div>

      {/* Handles */}
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-green-500 !w-3 !h-3"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!bg-green-500 !w-3 !h-3"
      />

      {/* Add Sequence button */}
      <div className="border-t border-gray-200 p-2 flex justify-center">
        <button
          className="flex items-center gap-1 text-sm text-green-600 hover:text-green-700 hover:bg-green-50 px-3 py-1 rounded transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            const event = new CustomEvent('addNode', {
              detail: { sourceNodeId: id }
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

export default memo(TransferNode);
