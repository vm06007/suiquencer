import { useState, useCallback } from 'react';
import type { Node, Edge } from '@xyflow/react';
import type { NodeData } from '@/types';
import type { Tab } from '@/hooks/useFlowWorkspace';
import { uploadFlowToIPFS, getShareUrl } from '@/lib/ipfs';

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
    setShareDialogOpen(true);
  }, []);

  const handleCloseShareDialog = useCallback(() => {
    setShareDialogOpen(false);
    setShareUrl(undefined);
    setShareError(null);
    setIsPrivateShare(false);
  }, []);

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
    handleShare,
    handleOpenShareDialog,
    handleCloseShareDialog,
    handleLoadSharedFlow,
  };
}
