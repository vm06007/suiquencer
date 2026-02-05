import { memo, useCallback } from 'react';
import { Handle, Position, type NodeProps, useReactFlow } from '@xyflow/react';
import { Send, Plus, X } from 'lucide-react';
import type { NodeData } from '@/types';

function TransferNode({ data, id }: NodeProps) {
  const { setNodes } = useReactFlow();
  const nodeData = data as NodeData;

  const updateNodeData = useCallback((updates: Partial<NodeData>) => {
    setNodes((nds) =>
      nds.map((node) =>
        node.id === id
          ? { ...node, data: { ...node.data, ...updates } }
          : node
      )
    );
  }, [id, setNodes]);

  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setNodes((nds) => nds.filter((node) => node.id !== id));
  }, [id, setNodes]);

  return (
    <div className="bg-white border-2 border-green-500 rounded-lg shadow-lg min-w-[280px]">
      <div className="bg-green-500 px-3 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Send className="w-4 h-4 text-white" />
          <span className="font-semibold text-white text-sm">{nodeData.label}</span>
        </div>
        <button
          onClick={handleDelete}
          className="text-white hover:text-red-200 transition-colors"
          title="Delete node"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 space-y-3">
        {/* Asset Selection */}
        <div>
          <label className="text-xs text-gray-600 mb-1 block">Asset</label>
          <select
            value={nodeData.asset || 'SUI'}
            onChange={(e) => updateNodeData({ asset: e.target.value })}
            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:border-green-500"
          >
            <option value="SUI">SUI</option>
            <option value="USDC">USDC</option>
            <option value="USDT">USDT</option>
          </select>
        </div>

        {/* Amount Input */}
        <div>
          <label className="text-xs text-gray-600 mb-1 block">Amount</label>
          <input
            type="text"
            value={nodeData.amount || ''}
            onChange={(e) => updateNodeData({ amount: e.target.value })}
            placeholder="0.0"
            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:border-green-500"
          />
        </div>

        {/* Recipient Address */}
        <div>
          <label className="text-xs text-gray-600 mb-1 block">To Address</label>
          <input
            type="text"
            value={nodeData.recipientAddress || ''}
            onChange={(e) => updateNodeData({ recipientAddress: e.target.value })}
            placeholder="0x..."
            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm font-mono focus:outline-none focus:border-green-500"
          />
        </div>
      </div>

      {/* Handles */}
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-green-500 !w-3 !h-3"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!bg-green-500 !w-3 !h-3"
      />

      {/* Add Sequence button */}
      <div className="border-t border-gray-200 p-2 flex justify-center">
        <button
          className="flex items-center gap-1 text-sm text-green-600 hover:text-green-700 hover:bg-green-50 px-3 py-1 rounded transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            const event = new CustomEvent('addNode', {
              detail: { sourceNodeId: id }
            });
            window.dispatchEvent(event);
          }}
        >
          <Plus className="w-4 h-4" />
          <span>Add Sequence</span>
        </button>
      </div>
    </div>
  );
}

export default memo(TransferNode);
