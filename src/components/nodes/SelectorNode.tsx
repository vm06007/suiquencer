import { memo, useCallback } from 'react';
import { Handle, Position, type NodeProps, useReactFlow, useEdges } from '@xyflow/react';
import { Send, Repeat, Coins, Image, Brain, Code, Landmark } from 'lucide-react';
import { NodeMenu } from './NodeMenu';
import type { ProtocolType, NodeData } from '@/types';

const PROTOCOL_OPTIONS = [
  { value: 'transfer', label: 'Transfer', icon: Send, color: 'green' },
  { value: 'swap', label: 'Swap', icon: Repeat, color: 'blue' },
  { value: 'logic', label: 'Condition', icon: Brain, color: 'purple' },
  { value: 'stake', label: 'Stake', icon: Coins, color: 'pink' },
  { value: 'lend', label: 'Lend / Borrow', icon: Landmark, color: 'orange' },
  { value: 'custom', label: 'Custom', icon: Code, color: 'gray' },
] as const;

function SelectorNode({ id }: NodeProps) {
  const { setNodes, getNodes } = useReactFlow();
  const edges = useEdges();

  const handleProtocolSelect = useCallback((protocol: ProtocolType) => {
    setNodes((nds) => {
      // Find incoming edges to this selector node
      const incomingEdges = edges.filter((e) => e.target === id);

      // Get source nodes
      const sourceNodes = incomingEdges.map((edge) =>
        nds.find((n) => n.id === edge.source)
      ).filter(Boolean);

      // Check if any source is a swap node with output
      let prefillAsset: string | undefined;
      let prefillAmount: string | undefined;

      if (protocol === 'transfer') {
        // Calculate total estimated output by symbol from all incoming swap nodes
        const sumsBySymbol: Record<string, number> = {};
        const sourceSwapIds = new Set<string>();

        for (const sourceNode of sourceNodes) {
          const sourceData = sourceNode?.data as NodeData | undefined;

          if (
            sourceNode?.type === 'swap' &&
            sourceData?.estimatedAmountOutSymbol &&
            sourceData?.estimatedAmountOut
          ) {
            sourceSwapIds.add(sourceNode.id);
            const sym = sourceData.estimatedAmountOutSymbol;
            const amt = parseFloat(sourceData.estimatedAmountOut);
            if (!Number.isNaN(amt)) {
              sumsBySymbol[sym] = (sumsBySymbol[sym] ?? 0) + amt;
            }
          }
        }

        const symbols = Object.keys(sumsBySymbol);
        if (symbols.length > 0) {
          // Use the symbol with the largest sum
          prefillAsset = symbols.reduce((a, b) =>
            (sumsBySymbol[a] ?? 0) >= (sumsBySymbol[b] ?? 0) ? a : b
          );
          const total = sumsBySymbol[prefillAsset] ?? 0;

          // Count how many transfer nodes will be connected to the same swap source(s)
          const targetTransferIds = new Set<string>();
          for (const swapId of sourceSwapIds) {
            const outgoingEdges = edges.filter((e) => e.source === swapId);
            for (const edge of outgoingEdges) {
              const targetNode = nds.find((n) => n.id === edge.target);
              if (targetNode?.type === 'transfer' || edge.target === id) {
                targetTransferIds.add(edge.target);
              }
            }
          }

          const splitCount = targetTransferIds.size || 1;
          const splitAmount = total / splitCount;
          prefillAmount = splitAmount <= 0 ? '0' : splitAmount < 0.0001 ? splitAmount.toExponential(2) : splitAmount.toFixed(6);
        }
      }

      // If creating a transfer, update all sibling transfers connected to the same swap
      let updatedNodes = nds.map((node) => {
        if (node.id === id) {
          // Change the node type based on selection
          const nodeType = protocol === 'transfer' ? 'transfer' :
                          protocol === 'swap' ? 'swap' :
                          protocol === 'logic' ? 'logic' :
                          protocol === 'stake' ? 'stake' :
                          protocol === 'lend' ? 'lend' :
                          protocol === 'custom' ? 'custom' :
                          'protocol';

          // Get the proper label from PROTOCOL_OPTIONS
          const protocolOption = PROTOCOL_OPTIONS.find(opt => opt.value === protocol);
          const label = protocolOption?.label || protocol.charAt(0).toUpperCase() + protocol.slice(1);

          return {
            ...node,
            type: nodeType,
            data: {
              ...node.data,
              protocol,
              label,
              // Initialize with defaults or pre-filled values from swap
              asset: protocol === 'transfer' ? (prefillAsset || 'SUI') : undefined,
              amount: protocol === 'transfer' ? (prefillAmount || '') : '',
              recipientAddress: protocol === 'transfer' ? '' : undefined,
              fromAsset: protocol === 'swap' ? 'SUI' : undefined,
              toAsset: protocol === 'swap' ? 'USDC' : undefined,
              logicType: protocol === 'logic' ? 'balance' : undefined,
            },
          };
        }
        return node;
      });

      // Update all sibling transfer nodes with the new split amount
      if (protocol === 'transfer' && prefillAsset && prefillAmount) {
        const sourceSwapIds = new Set<string>();
        for (const sourceNode of sourceNodes) {
          if (sourceNode?.type === 'swap') {
            sourceSwapIds.add(sourceNode.id);
          }
        }

        // Find all transfer nodes connected to the same swap sources
        const siblingTransferIds = new Set<string>();
        for (const swapId of sourceSwapIds) {
          const outgoingEdges = edges.filter((e) => e.source === swapId);
          for (const edge of outgoingEdges) {
            const targetNode = updatedNodes.find((n) => n.id === edge.target);
            if (targetNode?.type === 'transfer') {
              siblingTransferIds.add(edge.target);
            }
          }
        }

        // Update all sibling transfers with the split amount
        updatedNodes = updatedNodes.map((node) => {
          if (siblingTransferIds.has(node.id)) {
            const nodeData = node.data as NodeData;
            return {
              ...node,
              data: {
                ...nodeData,
                asset: prefillAsset,
                amount: prefillAmount,
                amountManuallyEdited: false, // Reset flag when edges change
              },
            };
          }
          return node;
        });
      }

      return updatedNodes;
    });
  }, [id, setNodes, edges, getNodes]);

  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setNodes((nds) => nds.filter((node) => node.id !== id));
  }, [id, setNodes]);

  return (
    <div className="bg-white dark:bg-gray-800 border-2 border-gray-400 dark:border-gray-600 border-dashed rounded-lg shadow-lg min-w-[280px]">
      <div className="bg-gray-100 dark:bg-gray-700 px-3 py-2 flex items-center justify-between border-b border-gray-300 dark:border-gray-600">
        <span className="font-semibold text-gray-700 dark:text-gray-200 text-sm">Select Action</span>
        <NodeMenu onDelete={handleDelete} showReplace={false} isDark={false} />
      </div>

      <div className="p-4 space-y-2">
        <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">Choose what this sequence step should do:</p>

        {PROTOCOL_OPTIONS.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            onClick={() => handleProtocolSelect(value as ProtocolType)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 border-2 border-gray-200 dark:border-gray-600 rounded-lg transition-all hover:shadow-md group ${
              value === 'transfer' ? 'hover:border-green-400 hover:bg-green-50 dark:hover:bg-green-900/20' :
              value === 'swap' ? 'hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20' :
              value === 'logic' ? 'hover:border-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20' :
              value === 'stake' ? 'hover:border-pink-400 hover:bg-pink-50 dark:hover:bg-pink-900/20' :
              value === 'lend' ? 'hover:border-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20' :
              'hover:border-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/20'
            }`}
          >
            <div className={`p-2 rounded transition-colors ${
              value === 'transfer' ? 'bg-green-100 dark:bg-green-900/30 group-hover:bg-green-200 dark:group-hover:bg-green-900/40' :
              value === 'swap' ? 'bg-blue-100 dark:bg-blue-900/30 group-hover:bg-blue-200 dark:group-hover:bg-blue-900/40' :
              value === 'logic' ? 'bg-purple-100 dark:bg-purple-900/30 group-hover:bg-purple-200 dark:group-hover:bg-purple-900/40' :
              value === 'stake' ? 'bg-pink-100 dark:bg-pink-900/30 group-hover:bg-pink-200 dark:group-hover:bg-pink-900/40' :
              value === 'lend' ? 'bg-orange-100 dark:bg-orange-900/30 group-hover:bg-orange-200 dark:group-hover:bg-orange-900/40' :
              'bg-gray-100 dark:bg-gray-700/30 group-hover:bg-gray-200 dark:group-hover:bg-gray-700/40'
            }`}>
              <Icon className={`w-4 h-4 ${
                value === 'transfer' ? 'text-green-600 dark:text-green-400' :
                value === 'swap' ? 'text-blue-600 dark:text-blue-400' :
                value === 'logic' ? 'text-purple-600 dark:text-purple-400' :
                value === 'stake' ? 'text-pink-600 dark:text-pink-400' :
                value === 'lend' ? 'text-orange-600 dark:text-orange-400' :
                'text-gray-600 dark:text-gray-400'
              }`} />
            </div>
            <div className="text-left">
              <div className="font-medium text-sm text-gray-900 dark:text-gray-100">{label}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {value === 'transfer' && 'Send tokens to an address'}
                {value === 'swap' && 'Swap between tokens'}
                {value === 'logic' && 'Conditional branching'}
                {value === 'stake' && 'Stake tokens for rewards'}
                {value === 'lend' && 'Lend tokens or borrow assets'}
                {value === 'custom' && 'Execute custom contract function'}
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Handles */}
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-gray-400 !w-3 !h-3"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!bg-gray-400 !w-3 !h-3"
      />
    </div>
  );
}

export default memo(SelectorNode);
