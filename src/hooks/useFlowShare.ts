import { useState, useCallback } from 'react';
import type { Node, Edge } from '@xyflow/react';
import type { NodeData } from '@/types';
import type { Tab } from '@/hooks/useFlowWorkspace';
import { uploadFlowToIPFS, downloadFlowFromIPFS, getShareUrl } from '@/lib/ipfs';
import { readFlowFromENS } from '@/lib/ens';

interface UseFlowShareOptions {
  nodes: Node<NodeData>[];
  edges: Edge[];
  tabs: Tab[];
  activeTabId: string;
  setTabs: React.Dispatch<React.SetStateAction<Tab[]>>;
  setActiveTabId: (id: string) => void;
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
  getNextTabId: () => string;
}

export function useFlowShare({
  nodes,
  edges,
  tabs,
  activeTabId,
  setTabs,
  setActiveTabId,
  setNodes,
  setEdges,
  getNextTabId,
}: UseFlowShareOptions) {
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | undefined>();
  const [isSharing, setIsSharing] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const [isPrivateShare, setIsPrivateShare] = useState(false);
  const [isLoadingENS, setIsLoadingENS] = useState(false);
  const [ensLoadError, setEnsLoadError] = useState<string | null>(null);
  const [lastCid, setLastCid] = useState<string | undefined>();
  const [lastEncryptionKey, setLastEncryptionKey] = useState<string | undefined>();

  const handleShare = useCallback(async (makePrivate: boolean) => {
    setIsSharing(true);
    setShareError(null);

    try {
      const activeTab = tabs.find((t) => t.id === activeTabId);
      const tabName = activeTab?.name || 'Suiquence';

      const flowData = {
        nodes,
        edges,
        name: tabName,
        timestamp: Date.now(),
      };

      const result = await uploadFlowToIPFS(flowData, makePrivate);
      const url = getShareUrl(result.cid, result.encryptionKey);

      setShareUrl(url);
      setIsPrivateShare(makePrivate);
      setLastCid(result.cid);
      setLastEncryptionKey(result.encryptionKey);

      return result.cid;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to share flow';
      setShareError(message);
      throw err;
    } finally {
      setIsSharing(false);
    }
  }, [nodes, edges, tabs, activeTabId]);

  const handleOpenShareDialog = useCallback(() => {
    setShareUrl(undefined);
    setShareError(null);
    setIsPrivateShare(false);
    setLastCid(undefined);
    setLastEncryptionKey(undefined);
    setEnsLoadError(null);
    setShareDialogOpen(true);
  }, []);

  const handleCloseShareDialog = useCallback(() => {
    setShareDialogOpen(false);
    setShareUrl(undefined);
    setShareError(null);
    setIsPrivateShare(false);
    setLastCid(undefined);
    setLastEncryptionKey(undefined);
    setEnsLoadError(null);
  }, []);

  const handleLoadFromENS = useCallback(async (ensName: string) => {
    setIsLoadingENS(true);
    setEnsLoadError(null);

    try {
      const result = await readFlowFromENS(ensName);
      if (!result) {
        throw new Error(`No flow found for ${ensName}`);
      }

      const flowData = await downloadFlowFromIPFS(result.cid, result.encryptionKey);

      if (!flowData.nodes || !Array.isArray(flowData.nodes)) {
        throw new Error('Invalid flow data: missing nodes');
      }

      // Load into a new tab
      const newTab: Tab = {
        id: getNextTabId(),
        name: `${ensName}`,
        nodes: flowData.nodes as Node<NodeData>[],
        edges: flowData.edges,
      };
      setTabs((prev) => [...prev, newTab]);
      setActiveTabId(newTab.id);
      setNodes(newTab.nodes);
      setEdges(newTab.edges);
      setShareDialogOpen(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load from ENS';
      setEnsLoadError(message);
    } finally {
      setIsLoadingENS(false);
    }
  }, [setTabs, setActiveTabId, setNodes, setEdges, getNextTabId]);

  const handleLoadSharedFlow = useCallback((loadedNodes: Node[], loadedEdges: Edge[]) => {
    const newTab: Tab = {
      id: getNextTabId(),
      name: 'Shared Suiquence',
      nodes: loadedNodes as Node<NodeData>[],
      edges: loadedEdges,
    };
    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(newTab.id);
    setNodes(newTab.nodes);
    setEdges(newTab.edges);
  }, [setTabs, setActiveTabId, setNodes, setEdges, getNextTabId]);

  return {
    shareDialogOpen,
    shareUrl,
    isSharing,
    shareError,
    isPrivateShare,
    isLoadingENS,
    ensLoadError,
    lastCid,
    lastEncryptionKey,
    handleShare,
    handleOpenShareDialog,
    handleCloseShareDialog,
    handleLoadSharedFlow,
    handleLoadFromENS,
  };
}
