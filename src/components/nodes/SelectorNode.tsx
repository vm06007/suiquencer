import { memo, useCallback } from 'react';
import { Handle, Position, type NodeProps, useReactFlow } from '@xyflow/react';
import { Send, Repeat, Coins, Image, X } from 'lucide-react';
import type { NodeData, ProtocolType } from '@/types';

const PROTOCOL_OPTIONS = [
  { value: 'transfer', label: 'Transfer', icon: Send, color: 'green' },
  { value: 'swap', label: 'Swap', icon: Repeat, color: 'blue' },
  { value: 'stake', label: 'Stake', icon: Coins, color: 'purple' },
  { value: 'nft', label: 'NFT', icon: Image, color: 'pink' },
] as const;

function SelectorNode({ data, id }: NodeProps) {
  const { setNodes } = useReactFlow();
  const nodeData = data as NodeData;

  const handleProtocolSelect = useCallback((protocol: ProtocolType) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === id) {
          // Change the node type based on selection
          return {
            ...node,
            type: protocol === 'transfer' ? 'transfer' : 'protocol',
            data: {
              ...node.data,
              protocol,
              label: protocol.charAt(0).toUpperCase() + protocol.slice(1),
              // Initialize with defaults
              asset: 'SUI',
              amount: '',
              recipientAddress: '',
            },
          };
        }
        return node;
      })
    );
  }, [id, setNodes]);

  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setNodes((nds) => nds.filter((node) => node.id !== id));
  }, [id, setNodes]);

  return (
    <div className="bg-white border-2 border-gray-400 border-dashed rounded-lg shadow-lg min-w-[280px]">
      <div className="bg-gray-100 px-3 py-2 flex items-center justify-between border-b border-gray-300">
        <span className="font-semibold text-gray-700 text-sm">Select Action</span>
        <button
          onClick={handleDelete}
          className="text-gray-600 hover:text-red-600 transition-colors"
          title="Delete node"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 space-y-2">
        <p className="text-xs text-gray-600 mb-3">Choose what this sequence step should do:</p>

        {PROTOCOL_OPTIONS.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            onClick={() => handleProtocolSelect(value as ProtocolType)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 border-2 border-gray-200 rounded-lg transition-all hover:shadow-md group ${
              value === 'transfer' ? 'hover:border-green-400 hover:bg-green-50' :
              value === 'swap' ? 'hover:border-blue-400 hover:bg-blue-50' :
              value === 'stake' ? 'hover:border-purple-400 hover:bg-purple-50' :
              'hover:border-pink-400 hover:bg-pink-50'
            }`}
          >
            <div className={`p-2 rounded transition-colors ${
              value === 'transfer' ? 'bg-green-100 group-hover:bg-green-200' :
              value === 'swap' ? 'bg-blue-100 group-hover:bg-blue-200' :
              value === 'stake' ? 'bg-purple-100 group-hover:bg-purple-200' :
              'bg-pink-100 group-hover:bg-pink-200'
            }`}>
              <Icon className={`w-4 h-4 ${
                value === 'transfer' ? 'text-green-600' :
                value === 'swap' ? 'text-blue-600' :
                value === 'stake' ? 'text-purple-600' :
                'text-pink-600'
              }`} />
            </div>
            <div className="text-left">
              <div className="font-medium text-sm text-gray-900">{label}</div>
              <div className="text-xs text-gray-500">
                {value === 'transfer' && 'Send tokens to an address'}
                {value === 'swap' && 'Swap between tokens'}
                {value === 'stake' && 'Stake tokens for rewards'}
                {value === 'nft' && 'Mint or transfer NFTs'}
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
