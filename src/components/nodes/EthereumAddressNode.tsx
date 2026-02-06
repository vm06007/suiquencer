import { memo, useCallback, useState, useEffect } from 'react';
import { Handle, Position, type NodeProps, useReactFlow } from '@xyflow/react';
import { ExternalLink, CheckCircle, XCircle, Loader2, Info } from 'lucide-react';
import { NodeMenu } from './NodeMenu';
import { useExecutionSequence } from '@/hooks/useExecutionSequence';
import type { NodeData } from '@/types';

function EthereumAddressNode({ data, id }: NodeProps) {
  const { setNodes } = useReactFlow();
  const nodeData = data as NodeData;
  const [ensValidation, setEnsValidation] = useState<{
    isValidating: boolean;
    isValid: boolean | null;
    resolvedAddress: string | null;
  }>({ isValidating: false, isValid: null, resolvedAddress: null });

  // Get sequence number
  const { sequenceMap } = useExecutionSequence();
  const sequenceNumber = sequenceMap.get(id) || 0;

  // Validate ENS name
  useEffect(() => {
    const ethereumAddress = nodeData.ethereumAddress;

    if (!ethereumAddress) {
      setEnsValidation({ isValidating: false, isValid: null, resolvedAddress: null });
      return;
    }

    // If it's a regular Ethereum address (0x...), no validation needed
    if (ethereumAddress.startsWith('0x') && ethereumAddress.length === 42) {
      setEnsValidation({ isValidating: false, isValid: null, resolvedAddress: null });
      return;
    }

    // Check if it's a valid ENS name (.eth domain)
    if (ethereumAddress.endsWith('.eth')) {
      setEnsValidation({ isValidating: true, isValid: null, resolvedAddress: null });

      const validateName = async () => {
        try {
          // Mock ENS resolution for now
          // In production, you would use ethers.js or viem to resolve ENS:
          // const provider = new ethers.providers.JsonRpcProvider('https://eth.llamarpc.com');
          // const resolvedAddress = await provider.resolveName(ethereumAddress);

          // For now, simulate validation
          await new Promise(resolve => setTimeout(resolve, 500));

          // Mock: treat all .eth names as valid for demonstration
          const mockResolvedAddress = '0x' + '1'.repeat(40); // Mock Ethereum address

          setEnsValidation({
            isValidating: false,
            isValid: true,
            resolvedAddress: mockResolvedAddress,
          });
        } catch (error) {
          console.error('ENS validation error:', error);
          setEnsValidation({
            isValidating: false,
            isValid: false,
            resolvedAddress: null,
          });
        }
      };

      const timeoutId = setTimeout(validateName, 500); // Debounce
      return () => clearTimeout(timeoutId);
    }
  }, [nodeData.ethereumAddress]);

  const updateNodeData = useCallback(
    (updates: Partial<NodeData>) => {
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === id) {
            return {
              ...node,
              data: {
                ...node.data,
                ...updates,
              },
            };
          }
          return node;
        })
      );
    },
    [id, setNodes]
  );

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setNodes((nds) => nds.filter((node) => node.id !== id));
    },
    [id, setNodes]
  );

  const handleReplace = useCallback(() => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === id) {
          return {
            ...node,
            type: 'selector',
            data: {
              label: 'Select Action',
            },
          };
        }
        return node;
      })
    );
  }, [id, setNodes]);

  const formatAddress = (address: string) => {
    if (address.length < 10) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div className="bg-white dark:bg-gray-800 border-2 border-purple-500 dark:border-purple-600 rounded-lg shadow-lg min-w-[280px]">
      {/* Header */}
      <div className="bg-purple-500 px-3 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ExternalLink className="w-4 h-4 text-white" />
          <span className="font-semibold text-white text-sm">
            {sequenceNumber > 0 && `${sequenceNumber}. `}
            {nodeData.label}
          </span>
        </div>
        <NodeMenu onDelete={handleDelete} onReplace={handleReplace} />
      </div>

      <div className="p-4 space-y-3">
        {/* Ethereum Address Input */}
        <div>
          <label className="text-xs text-gray-600 dark:text-gray-300 mb-1 block">
            Ethereum Address
          </label>
          <input
            type="text"
            value={nodeData.ethereumAddress || ''}
            onChange={(e) => updateNodeData({ ethereumAddress: e.target.value })}
            placeholder="0x... or name.eth"
            className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm font-mono bg-white dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:border-purple-500"
          />

          {/* ENS Validation */}
          {nodeData.ethereumAddress && nodeData.ethereumAddress.endsWith('.eth') && (
            <div className="mt-1">
              {ensValidation.isValidating && (
                <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Resolving ENS name...</span>
                </div>
              )}
              {!ensValidation.isValidating && ensValidation.isValid === true && ensValidation.resolvedAddress && (
                <div className="space-y-1">
                  <div className="flex items-center gap-1 text-xs text-green-600">
                    <CheckCircle className="w-3 h-3" />
                    <span>Valid ENS name</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400 font-mono bg-gray-50 dark:bg-gray-700 rounded p-1">
                    <span className="flex-1 truncate">
                      → {formatAddress(ensValidation.resolvedAddress)}
                    </span>
                    <div className="flex items-center gap-0.5">
                      <div className="group relative">
                        <Info className="w-3 h-3 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 cursor-help" />
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-10">
                          {ensValidation.resolvedAddress}
                        </div>
                      </div>
                      <a
                        href={`https://etherscan.io/address/${ensValidation.resolvedAddress}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:text-blue-700"
                        title="View on Etherscan"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </div>
              )}
              {!ensValidation.isValidating && ensValidation.isValid === false && (
                <div className="flex items-center gap-1 text-xs text-red-600">
                  <XCircle className="w-3 h-3" />
                  <span>This ENS name could not be resolved</span>
                </div>
              )}
            </div>
          )}

          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Enter Ethereum address or ENS name (e.g., vitalik.eth)
          </p>
        </div>
      </div>

      {/* Only input handle - this is terminal node */}
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-purple-500 !w-3 !h-3"
      />
    </div>
  );
}

export default memo(EthereumAddressNode);
