import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Wallet, Plus } from 'lucide-react';
import type { NodeData } from '@/types';

function WalletNode({ data, id }: NodeProps) {
  const nodeData = data as NodeData;
  return (
    <div className="bg-white border-2 border-blue-500 rounded-lg shadow-lg min-w-[200px]">
      <div className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <Wallet className="w-5 h-5 text-blue-600" />
          <span className="font-semibold text-gray-800">{nodeData.label}</span>
        </div>
        <div className="text-sm text-gray-600">
          SUI Wallet
        </div>
      </div>

      {/* Output handle on the right */}
      <Handle
        type="source"
        position={Position.Right}
        className="!bg-blue-500 !w-3 !h-3"
      />

      {/* Input handle on the left */}
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-blue-500 !w-3 !h-3"
      />

      {/* Add button at the bottom */}
      <div className="border-t border-gray-200 p-2 flex justify-center">
        <button
          className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-3 py-1 rounded transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            // This will be handled by the parent Flow component
            const event = new CustomEvent('addNode', {
              detail: { sourceNodeId: id }
            });
            window.dispatchEvent(event);
          }}
        >
          <Plus className="w-4 h-4" />
          <span>Add Node</span>
        </button>
      </div>
    </div>
  );
}

export default memo(WalletNode);
