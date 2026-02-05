import { useMemo } from 'react';
import { useNodes, useEdges } from '@xyflow/react';
import { useCurrentAccount, useSuiClientQuery } from '@mysten/dapp-kit';
import { TOKENS } from '@/config/tokens';
import type { TokenBalance } from '@/types';
import { getEffectiveBalances } from '@/utils/effectiveBalances';

export function useEffectiveBalances(nodeId: string, enabled: boolean = true) {
  const nodes = useNodes();
  const edges = useEdges();
  const account = useCurrentAccount();

  // Fetch base wallet balances
  const { data: suiBalance } = useSuiClientQuery(
    'getBalance',
    {
      owner: account?.address || '',
      coinType: TOKENS.SUI.coinType,
    },
    {
      enabled: !!account && enabled,
    }
  );

  const { data: usdcBalance } = useSuiClientQuery(
    'getBalance',
    {
      owner: account?.address || '',
      coinType: TOKENS.USDC.coinType,
    },
    {
      enabled: !!account && enabled,
    }
  );

  const { data: usdtBalance } = useSuiClientQuery(
    'getBalance',
    {
      owner: account?.address || '',
      coinType: TOKENS.USDT.coinType,
    },
    {
      enabled: !!account && enabled,
    }
  );

  // Calculate base balances
  const baseBalances: TokenBalance[] = useMemo(() => {
    if (!account) return [];

    const balances: TokenBalance[] = [];

    if (suiBalance) {
      const amount = parseInt(suiBalance.totalBalance) / Math.pow(10, TOKENS.SUI.decimals);
      balances.push({
        symbol: 'SUI',
        balance: amount.toFixed(4),
        isLoading: false,
      });
    }

    if (usdcBalance) {
      const amount = parseInt(usdcBalance.totalBalance) / Math.pow(10, TOKENS.USDC.decimals);
      balances.push({
        symbol: 'USDC',
        balance: amount.toFixed(2),
        isLoading: false,
      });
    }

    if (usdtBalance) {
      const amount = parseInt(usdtBalance.totalBalance) / Math.pow(10, TOKENS.USDT.decimals);
      balances.push({
        symbol: 'USDT',
        balance: amount.toFixed(2),
        isLoading: false,
      });
    }

    return balances;
  }, [account, suiBalance, usdcBalance, usdtBalance]);

  // Calculate effective balances (wallet balance + effects of previous operations)
  const effectiveBalances = useMemo(() => {
    if (!account || !enabled || baseBalances.length === 0) return [];

    return getEffectiveBalances(nodes as any, edges, nodeId, baseBalances);
  }, [nodes, edges, nodeId, baseBalances, account, enabled]);

  return {
    baseBalances,
    effectiveBalances,
    isLoading: !account,
  };
}
