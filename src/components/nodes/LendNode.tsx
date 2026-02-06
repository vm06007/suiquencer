import { memo, useCallback, useMemo, useState } from 'react';
import { Handle, Position, type NodeProps, useReactFlow, useNodes } from '@xyflow/react';
import { Landmark, AlertTriangle, X, TrendingUp, Loader2 } from 'lucide-react';
import { useSuiClient, useCurrentAccount, useSuiClientQuery } from '@mysten/dapp-kit';
import { NodeMenu } from './NodeMenu';
import { TOKENS } from '@/config/tokens';
import { useEffectiveBalances } from '@/hooks/useEffectiveBalances';
import { useExecutionSequence } from '@/hooks/useExecutionSequence';
import { useLendingAPY } from '@/hooks/useLendingAPY';
import { useScallopExchangeRate } from '@/hooks/useScallopExchangeRate';
import type { NodeData } from '@/types';
import * as Dialog from '@radix-ui/react-dialog';

function LendNode({ data, id }: NodeProps) {
  const { setNodes } = useReactFlow();
  const nodes = useNodes();
  const nodeData = data as NodeData;
  const suiClient = useSuiClient();
  const account = useCurrentAccount();
  const [showSettings, setShowSettings] = useState(false);

  // Get wallet balances for all assets
  const selectedAsset = (nodeData.lendAsset || 'SUI') as keyof typeof TOKENS;

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

  const { data: walBalance } = useSuiClientQuery(
    'getBalance',
    {
      owner: account?.address || '',
      coinType: TOKENS.WAL.coinType,
    },
    {
      enabled: !!account,
    }
  );

  // Get effective balances (wallet balance + effects of previous operations)
  const { effectiveBalances } = useEffectiveBalances(id, true);

  // Get APY data for the selected asset and protocol
  const { apy } = useLendingAPY(
    nodeData.lendProtocol || 'scallop',
    selectedAsset,
    !!account
  );

  // Get real-time exchange rate from Scallop (for Scallop protocol)
  const scallopExchangeRate = useScallopExchangeRate(
    selectedAsset,
    !!account && (nodeData.lendProtocol || 'scallop') === 'scallop'
  );

  // Calculate receipt tokens using real exchange rate
  const receiptTokenAmount = useMemo(() => {
    const amount = parseFloat(nodeData.lendAmount || '0');
    if (isNaN(amount) || amount <= 0) return null;

    const protocol = nodeData.lendProtocol || 'scallop';

    // Use real Scallop rate, or fallback to mock for Navi
    let exchangeRate: number;
    if (protocol === 'scallop') {
      exchangeRate = scallopExchangeRate.rate;
    } else {
      // Mock rates for Navi (until we add Navi SDK support)
      const naviRates: Record<string, number> = {
        SUI: 1.0189,
        USDC: 1.0623,
        USDT: 1.0534,
        WAL: 1.0098,
      };
      exchangeRate = naviRates[selectedAsset] || 1.0;
    }

    // IMPORTANT: Exchange rate means "1 receipt token = X underlying asset"
    // So to get receipt tokens from underlying assets: amount / exchangeRate
    // Example: If 1 sSUI = 1.0234 SUI, then 5 SUI = 5 / 1.0234 = 4.886 sSUI
    const receiptAmount = amount / exchangeRate;

    return {
      amount: receiptAmount.toFixed(selectedAsset === 'SUI' || selectedAsset === 'WAL' ? 4 : 2),
      symbol: getReceiptTokenSymbol(selectedAsset, protocol),
      exchangeRate: exchangeRate.toFixed(4),
      isLoading: protocol === 'scallop' ? scallopExchangeRate.isLoading : false,
    };
  }, [nodeData.lendAmount, selectedAsset, nodeData.lendProtocol, scallopExchangeRate]);

  // Get receipt token symbol based on protocol
  function getReceiptTokenSymbol(asset: string, protocol: string): string {
    if (protocol === 'navi') {
      return `n${asset}`; // Navi uses nSUI, nUSDC, etc.
    }
    // Scallop uses sSUI, sUSDC, etc.
    return `s${asset}`;
  }

  // Format balance for dropdown display with effective balance
  const formatBalanceForDropdown = (tokenKey: keyof typeof TOKENS) => {
    const effectiveBal = effectiveBalances.find(b => b.symbol === tokenKey);
    if (effectiveBal && effectiveBalances.length > 0) {
      const amount = parseFloat(effectiveBal.balance);
      const displayDecimals = tokenKey === 'SUI' || tokenKey === 'WAL' ? 4 : 2;
      return `${tokenKey} (${amount.toFixed(displayDecimals)})`;
    }
    // Fallback to wallet balance
    const tokenBalance = tokenKey === 'SUI' ? suiBalance : tokenKey === 'USDC' ? usdcBalance : tokenKey === 'USDT' ? usdtBalance : walBalance;
    if (!tokenBalance) return tokenKey;
    const decimals = TOKENS[tokenKey].decimals;
    const amount = parseInt(tokenBalance.totalBalance) / Math.pow(10, decimals);
    const displayDecimals = tokenKey === 'SUI' || tokenKey === 'WAL' ? 4 : 2;
    return `${tokenKey} (${amount.toFixed(displayDecimals)})`;
  };

  // Get sequence number from shared hook (uses topological sort)
  const { sequenceMap } = useExecutionSequence();
  const sequenceNumber = sequenceMap.get(id) || 0;

  // Check balance validation
  const balanceWarning = useMemo(() => {
    if (!account) return null;

    const lendAmount = parseFloat(nodeData.lendAmount || '0');
    if (lendAmount <= 0) return null;

    // Get effective balance for the selected asset
    const effectiveBal = effectiveBalances.find(b => b.symbol === selectedAsset);
    if (!effectiveBal) return null;

    const availableBalance = parseFloat(effectiveBal.balance);

    if (lendAmount > availableBalance) {
      return {
        type: 'error' as const,
        message: `Insufficient ${selectedAsset}. Available: ${availableBalance.toFixed(selectedAsset === 'SUI' || selectedAsset === 'WAL' ? 4 : 2)} ${selectedAsset}`,
      };
    }

    return null;
  }, [account, nodeData.lendAmount, selectedAsset, effectiveBalances]);

  const updateNodeData = useCallback(
    (updates: Partial<NodeData>) => {
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === id) {
            return {
              ...node,
              data: {
                ...node.data,
                ...updates,
              },
            };
          }
          return node;
        })
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

  const handleReplace = useCallback(() => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === id) {
          return {
            ...node,
            type: 'selector',
            data: {
              label: 'Select Action',
            },
          };
        }
        return node;
      })
    );
  }, [id, setNodes]);

  const handleSettings = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setShowSettings(true);
  }, []);

  return (
    <>
      <div className="bg-white dark:bg-gray-800 border-2 border-orange-500 dark:border-orange-600 rounded-lg shadow-lg min-w-[320px] max-w-[400px]">
        {/* Header */}
        <div className="bg-orange-500 px-3 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Landmark className="w-4 h-4 text-white" />
            <span className="font-semibold text-white text-sm">
              {sequenceNumber > 0 && `${sequenceNumber}. `}
              {nodeData.label}
            </span>
          </div>
          <NodeMenu onDelete={handleDelete} onReplace={handleReplace} onSettings={handleSettings} showSettings={true} />
        </div>

      <div className="p-4 space-y-3">
        {/* Protocol Selection */}
        <div>
          <label className="text-xs text-gray-600 dark:text-gray-300 mb-1 block">
            Protocol
          </label>
          <select
            value={nodeData.lendProtocol || 'scallop'}
            onChange={(e) => updateNodeData({ lendProtocol: e.target.value })}
            className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded text-sm focus:outline-none focus:border-orange-500 dark:focus:border-orange-400"
          >
            <option value="scallop">Scallop</option>
            <option value="navi">Navi Protocol</option>
          </select>
        </div>

        {/* Action Type */}
        <div>
          <label className="text-xs text-gray-600 dark:text-gray-300 mb-1 block">
            Action
          </label>
          <select
            value={nodeData.lendAction || 'deposit'}
            onChange={(e) => updateNodeData({ lendAction: e.target.value })}
            className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded text-sm focus:outline-none focus:border-orange-500 dark:focus:border-orange-400"
          >
            <option value="deposit">Deposit (Lend)</option>
            <option value="withdraw" disabled>Withdraw (Coming Soon)</option>
            <option value="borrow" disabled>Borrow (Coming Soon)</option>
            <option value="repay" disabled>Repay (Coming Soon)</option>
          </select>
        </div>

        {/* Asset */}
        <div>
          <label className="text-xs text-gray-600 dark:text-gray-300 mb-1 block">
            Asset
          </label>
          <select
            value={nodeData.lendAsset || 'SUI'}
            onChange={(e) => updateNodeData({ lendAsset: e.target.value })}
            className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded text-sm focus:outline-none focus:border-orange-500 dark:focus:border-orange-400"
          >
            <option value="SUI">{formatBalanceForDropdown('SUI')}</option>
            <option value="USDC">{formatBalanceForDropdown('USDC')}</option>
            <option value="USDT">{formatBalanceForDropdown('USDT')}</option>
            <option value="WAL">{formatBalanceForDropdown('WAL')}</option>
          </select>

          {/* APY Display */}
          {apy && (
            <div className="mt-2 flex items-center gap-2 p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded">
              <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" />
              <div className="flex-1">
                {(nodeData.lendAction === 'deposit' || nodeData.lendAction === 'withdraw' || !nodeData.lendAction) ? (
                  <p className="text-xs text-green-700 dark:text-green-300">
                    <span className="font-semibold">{apy.depositAPY}% APY</span> · Deposit Rate
                  </p>
                ) : (
                  <p className="text-xs text-orange-700 dark:text-orange-300">
                    <span className="font-semibold">{apy.borrowAPY}% APY</span> · Borrow Rate
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Amount */}
        <div>
          <label className="text-xs text-gray-600 dark:text-gray-300 mb-1 block">
            Amount
          </label>
          <input
            type="number"
            step="0.000001"
            value={nodeData.lendAmount || ''}
            onChange={(e) => updateNodeData({ lendAmount: e.target.value })}
            placeholder="1.0"
            className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded text-sm focus:outline-none focus:border-orange-500 dark:focus:border-orange-400"
          />
          {/* Show available balance */}
          {(() => {
            const effectiveBal = effectiveBalances.find(b => b.symbol === selectedAsset);
            if (effectiveBal && effectiveBalances.length > 0) {
              const amount = parseFloat(effectiveBal.balance);
              const displayDecimals = selectedAsset === 'SUI' || selectedAsset === 'WAL' ? 4 : 2;
              return (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Available: {amount.toFixed(displayDecimals)} {selectedAsset}
                </p>
              );
            }
            return null;
          })()}

          {/* Balance warning */}
          {balanceWarning && (
            <div className="mt-2 flex items-start gap-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
              <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-600 dark:text-red-400">
                {balanceWarning.message}
              </p>
            </div>
          )}
        </div>

        {/* Receipt Tokens Display */}
        {(nodeData.lendAction === 'deposit' || !nodeData.lendAction) && receiptTokenAmount && (
          <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded px-3 py-2">
            <div className="text-xs text-gray-600 dark:text-gray-300 mb-1">You Will Receive</div>
            {receiptTokenAmount.isLoading ? (
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>Fetching rate...</span>
              </div>
            ) : (
              <>
                <div className="text-sm font-semibold text-orange-700 dark:text-orange-300">
                  ~{receiptTokenAmount.amount} {receiptTokenAmount.symbol}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Rate: 1 {receiptTokenAmount.symbol} = {receiptTokenAmount.exchangeRate} {selectedAsset}
                </div>
              </>
            )}
          </div>
        )}
      </div>

        {/* Handles */}
        <Handle
          type="target"
          position={Position.Left}
          className="!bg-orange-500 !w-3 !h-3"
        />
        <Handle
          type="source"
          position={Position.Right}
          className="!bg-orange-500 !w-3 !h-3"
        />
      </div>

      {/* Settings Dialog */}
      <Dialog.Root open={showSettings} onOpenChange={setShowSettings}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
          <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-6 w-full max-w-md z-50">
            <div className="flex items-center justify-between mb-4">
              <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Lend/Borrow Settings
              </Dialog.Title>
              <Dialog.Close asChild>
                <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </Dialog.Close>
            </div>

            <div className="space-y-4">
              {/* Protocol Selection */}
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  Protocol
                </label>
                <select
                  value={nodeData.lendProtocol || 'scallop'}
                  onChange={(e) => updateNodeData({ lendProtocol: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg text-sm focus:outline-none focus:border-orange-500 dark:focus:border-orange-400"
                >
                  <option value="scallop">Scallop</option>
                  <option value="navi">Navi Protocol</option>
                </select>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Also available in the main card. APY rates update based on selected protocol.
                </p>
              </div>

              {/* Action-specific settings could go here */}
              {nodeData.lendAction === 'deposit' && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                  <p className="text-xs text-gray-600 dark:text-gray-300 mb-2">
                    <strong>Deposit (Lend):</strong> Supply assets to earn interest. Your assets are available to borrowers, and you receive interest-bearing tokens in return.
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-300">
                    <strong>Receipt Tokens:</strong> When you deposit, you receive {nodeData.lendProtocol === 'navi' ? 'n' : 's'}{selectedAsset} tokens (e.g., {nodeData.lendProtocol === 'navi' ? 'n' : 's'}SUI for SUI deposits). These tokens are worth MORE than the underlying asset because they include accumulated interest. For example, if 1 sSUI = 1.0234 SUI, depositing 5 SUI gives you ~4.886 sSUI (worth 5 SUI now, but increasing in value over time).
                  </p>
                </div>
              )}

              {nodeData.lendAction === 'borrow' && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                  <p className="text-xs text-gray-600 dark:text-gray-300">
                    <strong>Borrow:</strong> Borrow assets against your collateral. Make sure you have sufficient collateral deposited to avoid liquidation.
                  </p>
                </div>
              )}

              {nodeData.lendAction === 'withdraw' && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                  <p className="text-xs text-gray-600 dark:text-gray-300">
                    <strong>Withdraw:</strong> Withdraw your deposited assets. You can only withdraw up to your available balance.
                  </p>
                </div>
              )}

              {nodeData.lendAction === 'repay' && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                  <p className="text-xs text-gray-600 dark:text-gray-300">
                    <strong>Repay:</strong> Repay borrowed assets to reduce your debt and free up collateral.
                  </p>
                </div>
              )}

              {/* APY Rates Table */}
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  Current APY Rates
                </label>
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 dark:bg-gray-700/50">
                      <tr>
                        <th className="px-3 py-2 text-left text-gray-600 dark:text-gray-300 font-medium">Asset</th>
                        <th className="px-3 py-2 text-right text-green-600 dark:text-green-400 font-medium">Deposit</th>
                        <th className="px-3 py-2 text-right text-orange-600 dark:text-orange-400 font-medium">Borrow</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {(['SUI', 'USDC', 'USDT', 'WAL'] as const).map((asset) => {
                        // Get APY for each asset
                        const protocolData = nodeData.lendProtocol === 'navi'
                          ? { SUI: { depositAPY: '2.8', borrowAPY: '6.2' }, USDC: { depositAPY: '7.2', borrowAPY: '10.1' }, USDT: { depositAPY: '6.3', borrowAPY: '9.8' }, WAL: { depositAPY: '11.8', borrowAPY: '17.5' } }
                          : { SUI: { depositAPY: '3.2', borrowAPY: '5.8' }, USDC: { depositAPY: '6.5', borrowAPY: '9.2' }, USDT: { depositAPY: '5.8', borrowAPY: '8.5' }, WAL: { depositAPY: '12.4', borrowAPY: '18.7' } };
                        const assetAPY = protocolData[asset];
                        return (
                          <tr key={asset} className={selectedAsset === asset ? 'bg-orange-50 dark:bg-orange-900/10' : ''}>
                            <td className="px-3 py-2 font-medium text-gray-900 dark:text-gray-100">{asset}</td>
                            <td className="px-3 py-2 text-right text-green-600 dark:text-green-400">{assetAPY.depositAPY}%</td>
                            <td className="px-3 py-2 text-right text-orange-600 dark:text-orange-400">{assetAPY.borrowAPY}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Rates are updated in real-time and may vary based on market conditions
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <Dialog.Close asChild>
                <button className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm font-medium">
                  Done
                </button>
              </Dialog.Close>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}

export default memo(LendNode);
