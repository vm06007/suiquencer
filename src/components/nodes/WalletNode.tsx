import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Plus, Bridge } from 'lucide-react';
import type { NodeData } from '@/types';
import { WalletConnect } from '../WalletConnect';

function WalletNode({ data, id }: NodeProps) {
  const nodeData = data as NodeData;
  return (
    <div className="bg-white dark:bg-gray-800 border-2 border-blue-500 rounded-lg shadow-lg min-w-[250px]">
      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="font-semibold text-gray-800 dark:text-gray-100">{nodeData.label}</span>
        </div>
        <WalletConnect />
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

      {/* Add buttons at the bottom */}
      <div className="border-t border-gray-200 dark:border-gray-700 p-2 flex items-center justify-center gap-2">
        <button
          className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 px-3 py-1 rounded transition-colors"
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

        <div className="h-6 w-px bg-gray-300 dark:bg-gray-600" />

        <button
          className="flex items-center gap-1 text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/20 px-3 py-1 rounded transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            const event = new CustomEvent('addBridge', {
              detail: { sourceNodeId: id }
            });
            window.dispatchEvent(event);
          }}
        >
          <Bridge className="w-4 h-4" />
          <span>Bridge</span>
        </button>
      </div>
    </div>
  );
}

export default memo(WalletNode);
