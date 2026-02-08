import { useState, useCallback } from 'react';
import { writeFlowToENS } from '@/lib/ens';

export function useENSShare() {
  const [isSavingENS, setIsSavingENS] = useState(false);
  const [ensSaveError, setEnsSaveError] = useState<string | null>(null);
  const [ensSaveSuccess, setEnsSaveSuccess] = useState(false);
  const [ensTxHash, setEnsTxHash] = useState<string | null>(null);

  const handleSaveToENS = useCallback(async (
    ensName: string,
    cid: string,
    encryptionKey?: string
  ) => {
    setIsSavingENS(true);
    setEnsSaveError(null);
    setEnsSaveSuccess(false);
    setEnsTxHash(null);

    try {
      const txHash = await writeFlowToENS(ensName, cid, encryptionKey);
      setEnsTxHash(txHash);
      setEnsSaveSuccess(true);
      return txHash;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save to ENS';
      setEnsSaveError(message);
      throw err;
    } finally {
      setIsSavingENS(false);
    }
  }, []);

  const resetENSState = useCallback(() => {
    setEnsSaveError(null);
    setEnsSaveSuccess(false);
    setEnsTxHash(null);
  }, []);

  return {
    isSavingENS,
    ensSaveError,
    ensSaveSuccess,
    ensTxHash,
    handleSaveToENS,
    resetENSState,
  };
}
