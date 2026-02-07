import { Transaction } from '@mysten/sui/transactions';
import { TOKENS } from '@/config/tokens';
import type { Node } from '@xyflow/react';
import type { NodeData, ComparisonOperator } from '@/types';

/**
 * Mark all nodes downstream of `startNodeId` for skipping.
 * Traverses edges recursively from the start node's outgoing edges.
 */
export function markDownstreamNodes(
  startNodeId: string,
  startIndex: number,
  sequence: Node<NodeData>[],
  edges: any[],
  skipIndices: Set<number>,
) {
  const visited = new Set<string>();

  const markDownstream = (nodeId: string) => {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);

    // Find this node's index in the sequence and mark it for skipping
    const nodeIndex = sequence.findIndex(n => n.id === nodeId);
    if (nodeIndex > startIndex) { // Only skip nodes after the logic node
      skipIndices.add(nodeIndex);
      console.log(`  Marking node ${nodeIndex + 1} for skipping (downstream of failed logic)`);
    }

    // Find outgoing edges from this node and recursively mark their targets
    const outgoingEdges = edges.filter(e => e.source === nodeId);
    outgoingEdges.forEach(edge => markDownstream(edge.target));
  };

  // Start marking from the node's immediate children
  const outgoingEdges = edges.filter(e => e.source === startNodeId);
  outgoingEdges.forEach(edge => markDownstream(edge.target));
}

function evaluateComparison(
  actual: number,
  operator: ComparisonOperator,
  expected: number,
): boolean {
  switch (operator) {
    case 'gt':
      return actual > expected;
    case 'gte':
      return actual >= expected;
    case 'lt':
      return actual < expected;
    case 'lte':
      return actual <= expected;
    case 'eq':
      return Math.abs(actual - expected) < 0.0001;
    case 'ne':
      return Math.abs(actual - expected) >= 0.0001;
  }
}

/**
 * Evaluate a balance-based logic condition.
 * Returns true if the condition is met.
 */
export async function evaluateBalanceCondition(
  suiClient: any,
  resolvedAddress: string,
  asset: string,
  operator: ComparisonOperator,
  compareValue: string,
  stepLabel: string,
): Promise<boolean> {
  const tokenInfo = TOKENS[asset as keyof typeof TOKENS];
  const balance = await suiClient.getBalance({
    owner: resolvedAddress,
    coinType: tokenInfo.coinType,
  });
  const balanceInToken = parseInt(balance.totalBalance) / Math.pow(10, tokenInfo.decimals);
  const compareVal = parseFloat(compareValue);

  const conditionMet = evaluateComparison(balanceInToken, operator, compareVal);

  console.log(
    `${stepLabel}: Logic check - ${balanceInToken} ${asset} ${operator} ${compareVal} ${asset} = ${conditionMet}`
  );

  return conditionMet;
}

/**
 * Evaluate a contract-based logic condition.
 * Calls a Move view function via devInspect and compares the return value.
 * Returns true if the condition is met.
 */
export async function evaluateContractCondition(
  suiClient: any,
  packageId: string,
  module: string,
  func: string,
  contractArguments: string | undefined,
  operator: ComparisonOperator,
  compareValue: string,
  stepLabel: string,
): Promise<boolean> {
  // Parse arguments if provided
  let args: any[] = [];
  if (contractArguments) {
    try {
      args = JSON.parse(contractArguments as string);
      if (!Array.isArray(args)) {
        throw new Error('Arguments must be a JSON array');
      }
    } catch (e) {
      throw new Error(`${stepLabel}: Invalid JSON arguments`);
    }
  }

  // Build transaction to call the view function
  const inspectTx = new Transaction();
  inspectTx.moveCall({
    target: `${packageId}::${module}::${func}`,
    arguments: args.map((arg: any) => {
      if (typeof arg === 'string' && arg.startsWith('0x')) {
        return inspectTx.object(arg);
      }
      return inspectTx.pure.u64(arg);
    }),
  });

  // Execute as devInspect to get the value
  const result = await suiClient.devInspectTransactionBlock({
    transactionBlock: inspectTx as any,
    sender: '0x0000000000000000000000000000000000000000000000000000000000000000',
  });

  if (result.error) {
    throw new Error(`Contract call failed: ${result.error}`);
  }

  if (!result.results || result.results.length === 0) {
    throw new Error('No return value from contract');
  }

  const returnData = result.results[0].returnValues;
  if (!returnData || returnData.length === 0) {
    throw new Error('No return data from contract');
  }

  // Convert BCS bytes to number (assumes u64)
  const bytes = returnData[0][0];
  let contractValue = 0;
  for (let j = 0; j < Math.min(bytes.length, 8); j++) {
    contractValue += bytes[j] * Math.pow(256, j);
  }

  const compareVal = parseFloat(compareValue);
  const conditionMet = evaluateComparison(contractValue, operator as ComparisonOperator, compareVal);

  console.log(
    `${stepLabel}: Contract check - ${contractValue} ${operator} ${compareVal} = ${conditionMet}`
  );

  return conditionMet;
}
