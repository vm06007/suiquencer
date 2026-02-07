import { useMemo, useEffect, useState, useRef } from 'react';
import { useCurrentAccount, useSuiClient } from '@mysten/dapp-kit';
import { useNodes, useEdges } from '@xyflow/react';
import { TOKENS, NAVI_POOLS } from '@/config/tokens';
import type { NodeData } from '@/types';

// Approximate LTV ratios for Navi Protocol (conservative estimates)
const NAVI_LTV: Record<string, number> = {
  SUI: 0.75, USDC: 0.80, USDT: 0.80, WAL: 0.50,
  CETUS: 0.60, DEEP: 0.50, BLUE: 0.50, BUCK: 0.70, AUSD: 0.70,
};

// Fallback USD prices (used when price fetch fails)
const FALLBACK_PRICES: Record<string, number> = {
  SUI: 3.50, USDC: 1.00, USDT: 1.00, WAL: 0.55,
  CETUS: 0.18, DEEP: 0.04, BLUE: 0.08, BUCK: 1.00, AUSD: 1.00,
};

// CoinGecko IDs for price fetching
const COINGECKO_IDS: Record<string, string> = {
  SUI: 'sui', USDC: 'usd-coin', USDT: 'tether', WAL: 'walrus-2',
  CETUS: 'cetus-protocol', DEEP: 'deep-token', BUCK: 'buck-stablecoin',
};

export interface BorrowLimit {
  symbol: string;
  maxBorrow: number;
}

/** Read a Navi dynamic-field balance (supply or borrow) for a user address. */
async function fetchDynamicBalance(
  suiClient: any,
  parentId: string,
  userAddress: string,
  decimals: number,
): Promise<number> {
  try {
    const result = await suiClient.getDynamicFieldObject({
      parentId,
      name: { type: 'address', value: userAddress },
    });
    if (result?.data?.content && 'fields' in result.data.content) {
      const value = (result.data.content.fields as any)?.value;
      if (value) return Number(value) / Math.pow(10, decimals);
    }
  } catch {
    // Field doesn't exist → zero balance
  }
  return 0;
}

export function useNaviBorrowLimits(nodeId: string, enabled: boolean) {
  const account = useCurrentAccount();
  const suiClient = useSuiClient();
  const nodes = useNodes();
  const edges = useEdges();
  const [supplyBalances, setSupplyBalances] = useState<Record<string, number>>({});
  const [borrowBalances, setBorrowBalances] = useState<Record<string, number>>({});
  const [prices, setPrices] = useState<Record<string, number>>(FALLBACK_PRICES);
  const [isLoading, setIsLoading] = useState(false);
  const pricesFetched = useRef(false);

  // Fetch on-chain supply and borrow balances
  useEffect(() => {
    if (!account || !enabled) {
      setSupplyBalances({});
      setBorrowBalances({});
      return;
    }

    let cancelled = false;
    const fetchBalances = async () => {
      setIsLoading(true);
      const supply: Record<string, number> = {};
      const borrow: Record<string, number> = {};

      const promises = Object.entries(NAVI_POOLS).map(async ([symbol, pool]) => {
        const decimals = TOKENS[symbol as keyof typeof TOKENS]?.decimals || 9;
        const [supBal, borBal] = await Promise.all([
          fetchDynamicBalance(suiClient, pool.supplyBalanceParentId, account.address, decimals),
          fetchDynamicBalance(suiClient, pool.borrowBalanceParentId, account.address, decimals),
        ]);
        if (!cancelled) {
          if (supBal > 0) supply[symbol] = supBal;
          if (borBal > 0) borrow[symbol] = borBal;
        }
      });

      await Promise.all(promises);

      if (!cancelled) {
        setSupplyBalances(supply);
        setBorrowBalances(borrow);
        setIsLoading(false);
      }
    };

    fetchBalances();
    return () => { cancelled = true; };
  }, [account, enabled, suiClient]);

  // Fetch prices once (with fallback)
  useEffect(() => {
    if (!enabled || pricesFetched.current) return;
    pricesFetched.current = true;

    const ids = Object.values(COINGECKO_IDS).join(',');
    fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`)
      .then(r => r.json())
      .then(data => {
        const p: Record<string, number> = { ...FALLBACK_PRICES };
        for (const [symbol, cgId] of Object.entries(COINGECKO_IDS)) {
          if (data[cgId]?.usd) p[symbol] = data[cgId].usd;
        }
        setPrices(p);
      })
      .catch(() => { /* keep fallback */ });
  }, [enabled]);

  // Calculate borrow limits
  const borrowLimits = useMemo((): BorrowLimit[] => {
    if (!account || !enabled) return [];

    // Collateral = on-chain supply + predecessor deposit nodes in flow
    const collateral: Record<string, number> = { ...supplyBalances };

    const visited = new Set<string>();
    const checkPredecessors = (nid: string) => {
      if (visited.has(nid)) return;
      visited.add(nid);
      const incoming = edges.filter(e => e.target === nid);
      for (const edge of incoming) {
        const sourceNode = nodes.find(n => n.id === edge.source);
        if (!sourceNode) continue;
        const d = sourceNode.data as NodeData;
        if (sourceNode.type === 'lend' && d.lendProtocol === 'navi' &&
            (d.lendAction === 'deposit' || !d.lendAction)) {
          const asset = d.lendAsset || 'SUI';
          const amount = parseFloat(d.lendAmount || '0');
          if (amount > 0) {
            collateral[asset] = (collateral[asset] || 0) + amount;
          }
        }
        checkPredecessors(edge.source);
      }
    };
    checkPredecessors(nodeId);

    // Total borrow power in USD = sum(collateral * price * LTV)
    let totalBorrowPowerUSD = 0;
    for (const [symbol, amount] of Object.entries(collateral)) {
      const price = prices[symbol] || 0;
      const ltv = NAVI_LTV[symbol] || 0.5;
      totalBorrowPowerUSD += amount * price * ltv;
    }

    // Subtract existing borrows
    let existingBorrowUSD = 0;
    for (const [symbol, amount] of Object.entries(borrowBalances)) {
      existingBorrowUSD += amount * (prices[symbol] || 0);
    }

    const remainingPowerUSD = Math.max(0, totalBorrowPowerUSD - existingBorrowUSD);

    // Max borrow per asset = remaining power / asset price
    const limits: BorrowLimit[] = [];
    for (const symbol of Object.keys(NAVI_POOLS)) {
      const price = prices[symbol] || 0;
      if (price <= 0) continue;
      limits.push({ symbol, maxBorrow: remainingPowerUSD / price });
    }

    return limits;
  }, [account, enabled, supplyBalances, borrowBalances, prices, nodes, edges, nodeId]);

  return { borrowLimits, isLoading };
}
