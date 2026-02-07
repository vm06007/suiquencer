import { useMemo } from 'react';
import { useNodes, useEdges } from '@xyflow/react';
import type { Node } from '@xyflow/react';
import type { NodeData } from '@/types';

/**
 * Hook to get execution sequence using topological sort
 * This ensures consistent ordering across the app (nodes, sidebar, execution)
 */
export function useExecutionSequence() {
  const nodes = useNodes() as Node<NodeData>[];
  const edges = useEdges();

  const sequence = useMemo(() => {
    const walletNode = nodes.find(n => n.type === 'wallet');
    if (!walletNode) return [];

    // Filter out wallet and selector nodes for execution
    const executableNodes = nodes.filter(n => n.type !== 'wallet' && n.type !== 'selector');

    // Build adjacency list and in-degree map
    const adjList = new Map<string, string[]>();
    const inDegree = new Map<string, number>();

    executableNodes.forEach(node => {
      adjList.set(node.id, []);
      inDegree.set(node.id, 0);
    });

    // Count incoming edges for each node (skip wallet and selector nodes)
    edges.forEach(edge => {
      const sourceNode = nodes.find(n => n.id === edge.source);
      const targetNode = nodes.find(n => n.id === edge.target);

      // Skip if target is wallet or selector
      if (!targetNode || targetNode.type === 'wallet' || targetNode.type === 'selector') return;

      // If source is wallet or selector, don't count it as a dependency
      if (!sourceNode || sourceNode.type === 'wallet' || sourceNode.type === 'selector') {
        // Node directly connected from wallet/selector has in-degree 0 (already initialized)
      } else {
        // Regular edge between executable nodes
        const neighbors = adjList.get(edge.source) || [];
        neighbors.push(edge.target);
        adjList.set(edge.source, neighbors);
        inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
      }
    });

    // Topological sort (Kahn's algorithm)
    const result: Node<NodeData>[] = [];
    const queue: string[] = [];

    // Start with nodes that have no dependencies (in-degree 0)
    inDegree.forEach((degree, nodeId) => {
      if (degree === 0) {
        queue.push(nodeId);
      }
    });

    // Sort initial queue by position (top to bottom, left to right)
    queue.sort((a, b) => {
      const nodeA = nodes.find(n => n.id === a);
      const nodeB = nodes.find(n => n.id === b);
      if (!nodeA || !nodeB) return 0;
      if (Math.abs(nodeA.position.y - nodeB.position.y) > 50) {
        return nodeA.position.y - nodeB.position.y;
      }
      return nodeA.position.x - nodeB.position.x;
    });

    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      const node = nodes.find(n => n.id === nodeId);
      if (node) {
        result.push(node);
      }

      // Reduce in-degree for neighbors
      const neighbors = adjList.get(nodeId) || [];
      const newlyReady: string[] = [];

      neighbors.forEach(neighborId => {
        const newDegree = (inDegree.get(neighborId) || 0) - 1;
        inDegree.set(neighborId, newDegree);
        if (newDegree === 0) {
          newlyReady.push(neighborId);
        }
      });

      // Sort newly ready nodes by position before adding to queue
      newlyReady.sort((a, b) => {
        const nodeA = nodes.find(n => n.id === a);
        const nodeB = nodes.find(n => n.id === b);
        if (!nodeA || !nodeB) return 0;
        if (Math.abs(nodeA.position.y - nodeB.position.y) > 50) {
          return nodeA.position.y - nodeB.position.y;
        }
        return nodeA.position.x - nodeB.position.x;
      });

      queue.push(...newlyReady);
    }

    return result;
  }, [nodes, edges]);

  // Create a map of node ID to sequence number
  const sequenceMap = useMemo(() => {
    const map = new Map<string, number>();
    sequence.forEach((node, index) => {
      map.set(node.id, index + 1);
    });
    return map;
  }, [sequence]);

  return { sequence, sequenceMap };
}
