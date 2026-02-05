import { memo, useCallback, useMemo, useEffect, useState } from 'react';
import { Handle, Position, type NodeProps, useReactFlow, useNodes, useEdges } from '@xyflow/react';
import { Send, X, CheckCircle, XCircle, Loader2, AlertTriangle, ExternalLink, Info } from 'lucide-react';
import { useSuiClient, useCurrentAccount, useSuiClientQuery } from '@mysten/dapp-kit';
import { SuinsClient } from '@mysten/suins';
import { isValidSuiNSName } from '@mysten/sui/utils';
import { SuiNSHelper } from '../SuiNSHelper';
import { TOKENS, SUI_GAS_RESERVE } from '@/config/tokens';
import { useEffectiveBalances } from '@/hooks/useEffectiveBalances';
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

  // Get wallet balances for all assets
  const selectedAsset = (nodeData.asset || 'SUI') as keyof typeof TOKENS;

  const { data: suiBalance } = useSuiClientQuery(
    'getBalance',
    {
      owner: account?.address || '',
      coinType: TOKENS.SUI.coinType,
    },
    {
      enabled: !!account,
    }
  );

  const { data: usdcBalance } = useSuiClientQuery(
    'getBalance',
    {
      owner: account?.address || '',
      coinType: TOKENS.USDC.coinType,
    },
    {
      enabled: !!account,
    }
  );

  const { data: usdtBalance } = useSuiClientQuery(
    'getBalance',
    {
      owner: account?.address || '',
      coinType: TOKENS.USDT.coinType,
    },
    {
      enabled: !!account,
    }
  );

  // Get the balance for the selected asset
  const balance = selectedAsset === 'SUI' ? suiBalance : selectedAsset === 'USDC' ? usdcBalance : usdtBalance;

  // Get effective balances (wallet balance + effects of previous operations)
  const { effectiveBalances } = useEffectiveBalances(id, true);

  // Format balance for dropdown display with effective balance
  const formatBalanceForDropdown = (tokenKey: keyof typeof TOKENS) => {
    const effectiveBal = effectiveBalances.find(b => b.symbol === tokenKey);
    if (effectiveBal && effectiveBalances.length > 0) {
      const amount = parseFloat(effectiveBal.balance);
      const displayDecimals = tokenKey === 'SUI' ? 4 : 2;
      return `${tokenKey} (${amount.toFixed(displayDecimals)})`;
    }
    // Fallback to wallet balance
    const tokenBalance = tokenKey === 'SUI' ? suiBalance : tokenKey === 'USDC' ? usdcBalance : usdtBalance;
    if (!tokenBalance) return tokenKey;
    const decimals = TOKENS[tokenKey].decimals;
    const amount = parseInt(tokenBalance.totalBalance) / Math.pow(10, decimals);
    const displayDecimals = tokenKey === 'SUI' ? 4 : 2;
    return `${tokenKey} (${amount.toFixed(displayDecimals)})`;
  };

  // Calculate sequence number and cumulative amounts (per asset — only sum same token)
  const { sequenceNumber, cumulativeAmount, totalAmount } = useMemo(() => {
    const walletNode = nodes.find(n => n.type === 'wallet');
    if (!walletNode) return { sequenceNumber: 0, cumulativeAmount: 0, totalAmount: 0 };

    let counter = 0;
    let cumulative = 0;
    let total = 0;
    let foundThisNode = false;
    const visited = new Set<string>();

    const traverse = (nodeId: string): number | null => {
      if (visited.has(nodeId)) return null;
      visited.add(nodeId);

      const node = nodes.find(n => n.id === nodeId);

      if (!node || node.type === 'wallet') {
        const outgoing = edges.filter(e => e.source === nodeId);
        const sortedEdges = outgoing.sort((a, b) => {
          const targetA = nodes.find(n => n.id === a.target);
          const targetB = nodes.find(n => n.id === b.target);
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
        const outgoing = edges.filter(e => e.source === nodeId);
        const sortedEdges = outgoing.sort((a, b) => {
          const targetA = nodes.find(n => n.id === a.target);
          const targetB = nodes.find(n => n.id === b.target);
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

      // Sequence node: only count amount for the same asset as this transfer
      counter++;
      const amount = parseFloat(String(node.data.amount ?? '0'));
      const nodeAsset = node.type === 'transfer'
        ? (node.data.asset || 'SUI')
        : node.type === 'swap'
        ? (node.data.fromAsset as string)
        : null;
      const amountOfThisAsset = nodeAsset === selectedAsset ? amount : 0;

      if (!foundThisNode) {
        cumulative += amountOfThisAsset;
      }
      total += amountOfThisAsset;

      if (nodeId === id) {
        foundThisNode = true;
        return counter;
      }

      const outgoing = edges.filter(e => e.source === nodeId);
      for (const edge of outgoing) {
        const result = traverse(edge.target);
        if (result !== null) return result;
      }

      return null;
    };

    traverse(walletNode.id);
    return { sequenceNumber: counter, cumulativeAmount: cumulative, totalAmount: total };
  }, [id, nodes, edges, selectedAsset]);

  // Check balance validation (reserve SUI for gas when transferring native SUI)
  const balanceWarning = useMemo(() => {
    if (!account) return null;

    // Use effective balance if available, otherwise fallback to wallet balance
    const effectiveBal = effectiveBalances.find(b => b.symbol === selectedAsset);
    let balanceInToken: number;

    if (effectiveBal && effectiveBalances.length > 0) {
      balanceInToken = parseFloat(effectiveBal.balance);
    } else if (balance) {
      const decimals = TOKENS[selectedAsset].decimals;
      balanceInToken = parseInt(balance.totalBalance) / Math.pow(10, decimals);
    } else {
      return null;
    }

    const currentAmount = parseFloat(nodeData.amount || '0');
    const gasReserve = selectedAsset === 'SUI' ? SUI_GAS_RESERVE : 0;
    const availableBalance = balanceInToken - gasReserve;
    const displayDecimals = selectedAsset === 'SUI' ? 4 : 2;

    // Check if this individual transfer exceeds available balance
    if (currentAmount > availableBalance) {
      const message = selectedAsset === 'SUI'
        ? `Not enough for fees — leave ~${SUI_GAS_RESERVE} SUI for gas. Max send: ${availableBalance.toFixed(displayDecimals)} SUI`
        : `Exceeds available balance (${balanceInToken.toFixed(displayDecimals)} ${selectedAsset})`;
      return {
        type: 'error' as const,
        message,
      };
    }

    // Check if cumulative amount exceeds balance
    if (cumulativeAmount > availableBalance) {
      return {
        type: 'error' as const,
        message: `Cumulative total (${cumulativeAmount.toFixed(displayDecimals)} ${selectedAsset}) exceeds available (${availableBalance.toFixed(displayDecimals)})`,
      };
    }

    // Warning if getting close to balance
    if (totalAmount > availableBalance) {
      return {
        type: 'warning' as const,
        message: `Total sequence (${totalAmount.toFixed(displayDecimals)} ${selectedAsset}) exceeds available (${availableBalance.toFixed(displayDecimals)})`,
      };
    }

    return null;
  }, [balance, account, nodeData.amount, cumulativeAmount, totalAmount, selectedAsset, effectiveBalances]);

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
            client: suiClient as any,
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
    <div className="bg-white dark:bg-gray-800 border-2 border-green-500 rounded-lg shadow-lg min-w-[280px]">
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
          <label className="text-xs text-gray-600 dark:text-gray-300 mb-1 block">Asset</label>
          <select
            value={nodeData.asset || 'SUI'}
            onChange={(e) => updateNodeData({ asset: e.target.value })}
            className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:border-green-500"
          >
            <option value="SUI">{formatBalanceForDropdown('SUI')}</option>
            <option value="USDC">{formatBalanceForDropdown('USDC')}</option>
            <option value="USDT">{formatBalanceForDropdown('USDT')}</option>
          </select>
        </div>

        {/* Amount Input */}
        <div>
          <label className="text-xs text-gray-600 dark:text-gray-300 mb-1 block">Amount</label>
          <input
            type="text"
            value={nodeData.amount || ''}
            onChange={(e) => updateNodeData({ amount: e.target.value, amountManuallyEdited: true })}
            placeholder="0.0"
            className={`w-full px-2 py-1.5 border rounded text-sm bg-white dark:bg-gray-700 dark:text-gray-100 focus:outline-none ${
              balanceWarning?.type === 'error'
                ? 'border-red-500 dark:border-red-600 focus:border-red-600'
                : balanceWarning?.type === 'warning'
                ? 'border-yellow-500 dark:border-yellow-600 focus:border-yellow-600'
                : 'border-gray-300 dark:border-gray-600 focus:border-green-500'
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
          <label className="text-xs text-gray-600 dark:text-gray-300 mb-1 block">To Address</label>
          <input
            type="text"
            value={nodeData.recipientAddress || ''}
            onChange={(e) => updateNodeData({ recipientAddress: e.target.value })}
            placeholder="0x..., name.sui, or @name"
            className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm font-mono bg-white dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:border-green-500"
          />
          {nodeData.recipientAddress && isValidSuiNSName(nodeData.recipientAddress) && (
            <div className="mt-1">
              {suinsValidation.isValidating && (
                <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
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
                  <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400 font-mono bg-gray-50 dark:bg-gray-700 rounded p-1">
                    <span className="flex-1 truncate">
                      → {suinsValidation.resolvedAddress.slice(0, 7)}...{suinsValidation.resolvedAddress.slice(-5)}
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

      {/* Input handle only - transfer is terminal (no outgoing edge) */}
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-green-500 !w-3 !h-3"
      />
    </div>
  );
}

export default memo(TransferNode);
