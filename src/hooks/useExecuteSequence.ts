import { useState, useCallback } from 'react';
import { useCurrentAccount, useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import type { Node } from '@xyflow/react';
import type { NodeData } from '@/types';

export function useExecuteSequence() {
  const [isExecuting, setIsExecuting] = useState(false);
  const [lastResult, setLastResult] = useState<{ digest: string; stepCount: number } | null>(null);
  const account = useCurrentAccount();
  const { mutateAsync: signAndExecuteTransaction } = useSignAndExecuteTransaction();

  const executeSequence = useCallback(
    async (sequence: Node<NodeData>[]) => {
      if (!account) {
        alert('Please connect your wallet first');
        return;
      }

      if (sequence.length === 0) {
        alert('No transactions to execute');
        return;
      }

      setIsExecuting(true);

      try {
        // Create ONE transaction block for ALL operations (atomic)
        const tx = new Transaction();

        console.log(`Building atomic transaction with ${sequence.length} operations...`);

        // Validate all steps first
        for (let i = 0; i < sequence.length; i++) {
          const node = sequence[i];

          if (node.type === 'transfer') {
            const amount = parseFloat(node.data.amount || '0');
            const recipientAddress = node.data.recipientAddress;

            if (!recipientAddress) {
              throw new Error(`Step ${i + 1}: Recipient address is required`);
            }

            if (amount <= 0) {
              throw new Error(`Step ${i + 1}: Amount must be greater than 0`);
            }
          } else {
            throw new Error(`Step ${i + 1}: Node type "${node.type}" not yet implemented`);
          }
        }

        // Build all operations into the single transaction block
        for (let i = 0; i < sequence.length; i++) {
          const node = sequence[i];

          if (node.type === 'transfer') {
            const amount = parseFloat(node.data.amount || '0');
            const recipientAddress = node.data.recipientAddress!;

            // Convert SUI to MIST (1 SUI = 1,000,000,000 MIST)
            const amountInMist = Math.floor(amount * 1_000_000_000);

            // Split coins and transfer in the same transaction block
            const [coin] = tx.splitCoins(tx.gas, [amountInMist]);
            tx.transferObjects([coin], recipientAddress);

            console.log(`Added step ${i + 1}: Transfer ${amount} SUI to ${recipientAddress.slice(0, 10)}...`);
          }
        }

        // Execute the entire transaction block atomically (one signature, all or nothing)
        console.log('Executing atomic transaction block...');
        const result = await signAndExecuteTransaction({
          transaction: tx,
        });

        console.log('Atomic transaction executed successfully:', result);

        // Store the result for the modal
        setLastResult({
          digest: result.digest,
          stepCount: sequence.length,
        });

        return result;
      } catch (error: any) {
        console.error('Execution failed:', error);
        alert(`Execution failed: ${error.message || 'Unknown error'}`);
        throw error;
      } finally {
        setIsExecuting(false);
      }
    },
    [account, signAndExecuteTransaction]
  );

  return {
    executeSequence,
    isExecuting,
    lastResult,
    clearResult: () => setLastResult(null),
  };
}
