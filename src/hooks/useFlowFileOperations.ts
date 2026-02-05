import { useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { Node, Edge } from '@xyflow/react';
import type { Tab } from './useFlowWorkspace';

/**
 * Hook to manage file import/export operations
 */
export function useFlowFileOperations(
  nodes: Node[],
  edges: Edge[],
  tabs: Tab[],
  activeTabId: string,
  setTabs: Dispatch<SetStateAction<Tab[]>>,
  setActiveTabId: (id: string) => void,
  setNodes: Dispatch<SetStateAction<Node[]>>,
  setEdges: Dispatch<SetStateAction<Edge[]>>,
  getNextTabId: () => string
) {
  const handleExport = useCallback(() => {
    const tabName = tabs.find((t) => t.id === activeTabId)?.name || 'My Sequence #1';

    const sequence = {
      nodes,
      edges,
      name: tabName,
    };

    const blob = new Blob([JSON.stringify(sequence, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${sequence.name}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [nodes, edges, tabs, activeTabId]);

  const handleLoad = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const data = JSON.parse(event.target?.result as string);
            const loadedNodes = data.nodes || [];
            const loadedEdges = data.edges || [];
            const nameFromFile = file.name.replace(/\.json$/i, '');

            // Always add loaded flow as a new tab
            const newTab: Tab = {
              id: getNextTabId(),
              name: nameFromFile,
              nodes: loadedNodes,
              edges: loadedEdges,
            };
            setTabs((prev) => [...prev, newTab]);
            setActiveTabId(newTab.id);
            setNodes(newTab.nodes);
            setEdges(newTab.edges);
          } catch (error) {
            console.error('Failed to load file:', error);
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  }, [setTabs, setActiveTabId, setNodes, setEdges, getNextTabId]);

  return {
    handleExport,
    handleLoad,
  };
}
