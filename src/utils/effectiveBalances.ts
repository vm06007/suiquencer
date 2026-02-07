import type { Node, Edge } from '@xyflow/react';
import type { NodeData, TokenBalance } from '@/types';

/**
 * Get all action nodes that execute before targetId by sequence order and edges.
 * Used for effective balance: max balance for step N = wallet + effects of steps 1..N-1.
 */
function getPredecessors(
  nodes: Node<NodeData>[],
  edges: Edge[],
  targetId: string
): Node<NodeData>[] {
  const target = nodes.find((n) => n.id === targetId);
  if (!target) return [];

  // Get all nodes connected via edges that lead to this target
  const visited = new Set<string>();
  const predecessors: Node<NodeData>[] = [];

  const traverse = (nodeId: string) => {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);

    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;

    // Skip wallet and selector nodes but continue through them
    if (node.type === 'wallet' || (node.data as NodeData).type === 'wallet') {
      const outgoing = edges.filter((e) => e.source === nodeId);
      for (const edge of outgoing) {
        if (edge.target === targetId) return; // Don't include edges directly to target
        traverse(edge.target);
      }
      return;
    }

    // Add this predecessor
    const incomingEdges = edges.filter((e) => e.target === nodeId);
    if (incomingEdges.length > 0) {
      predecessors.push(node);
      // Continue traversing from sources of incoming edges
      for (const edge of incomingEdges) {
        traverse(edge.source);
      }
    }
  };

  // Find all edges coming into the target
  const incomingToTarget = edges.filter((e) => e.target === targetId);
  for (const edge of incomingToTarget) {
    traverse(edge.source);
  }

  return predecessors;
}

/**
 * Compute effective token balances at a node after applying all prior steps in sequence.
 * E.g. for action #2: balance = wallet + effect of step #1 (e.g. swap adds USDC).
 */
export function getEffectiveBalances(
  nodes: Node<NodeData>[],
  edges: Edge[],
  nodeId: string,
  baseBalances: TokenBalance[],
  sequenceMap?: Map<string, number>
): TokenBalance[] {
  const preds = getPredecessors(nodes, edges, nodeId);

  // Sort by sequence number from the topological sort
  if (sequenceMap) {
    preds.sort((a, b) => {
      const seqA = sequenceMap.get(a.id) ?? 0;
      const seqB = sequenceMap.get(b.id) ?? 0;
      return seqA - seqB;
    });
  }

  const balances: Record<string, number> = {};
  baseBalances.forEach((t) => {
    const n = parseFloat(t.balance);
    balances[t.symbol] = Number.isNaN(n) ? 0 : n;
  });

  const canonicalKey = (sym: string) => sym?.toUpperCase() ?? '';
  const resolveOutSymbol = (to: string) => {
    const key = canonicalKey(to);
    if (!key) return null;
    const match = baseBalances.find((t) => canonicalKey(t.symbol) === key);
    return match ? match.symbol : to;
  };

  for (const node of preds) {
    const d = node.data as NodeData;

    // Handle swap nodes
    if (node.type === 'swap') {
      const from = d.fromAsset;
      const toRaw = d.estimatedAmountOutSymbol;
      const amountStr = d.amount?.trim();
      const outStr = d.estimatedAmountOut;

      if (from && toRaw && amountStr && outStr != null) {
        const amount = parseFloat(amountStr);
        const out = parseFloat(outStr);

        if (!Number.isNaN(amount)) {
          const fromKey =
            baseBalances.find((t) => canonicalKey(t.symbol) === canonicalKey(from))?.symbol ?? from;
          balances[fromKey] = (balances[fromKey] ?? 0) - amount;
          if (balances[fromKey] < 0) balances[fromKey] = 0;
        }

        if (!Number.isNaN(out)) {
          const toKey = resolveOutSymbol(toRaw) ?? toRaw;
          balances[toKey] = (balances[toKey] ?? 0) + out;
        }
      }
    }

    // Handle transfer nodes
    if (node.type === 'transfer' && d.asset && d.amount?.trim()) {
      const amt = parseFloat(d.amount);
      if (!Number.isNaN(amt) && d.asset) {
        const assetKey =
          resolveOutSymbol(d.asset) ??
          baseBalances.find((t) => canonicalKey(t.symbol) === canonicalKey(d.asset!))?.symbol ??
          d.asset;
        balances[assetKey] = (balances[assetKey] ?? 0) - amt;
        if (balances[assetKey] < 0) balances[assetKey] = 0;
      }
    }

    // Handle lend nodes (deposit reduces balance, withdraw/borrow increases balance)
    if (node.type === 'lend' && d.lendAsset && d.lendAmount?.trim()) {
      const amt = parseFloat(d.lendAmount);
      if (!Number.isNaN(amt)) {
        const assetKey =
          resolveOutSymbol(d.lendAsset) ??
          baseBalances.find((t) => canonicalKey(t.symbol) === canonicalKey(d.lendAsset!))?.symbol ??
          d.lendAsset;
        const action = d.lendAction || 'deposit';
        if (action === 'deposit' || action === 'repay') {
          balances[assetKey] = (balances[assetKey] ?? 0) - amt;
          if (balances[assetKey] < 0) balances[assetKey] = 0;
        } else if (action === 'withdraw' || action === 'borrow') {
          balances[assetKey] = (balances[assetKey] ?? 0) + amt;
        }
      }
    }
  }

  const baseResult = baseBalances.map((t) => {
    const v = balances[t.symbol] ?? 0;
    const formatted = v === 0 ? '0.00' : v < 0.01 ? v.toFixed(6) : v.toFixed(2);
    return { symbol: t.symbol, balance: formatted, isLoading: false };
  });

  return baseResult;
}
