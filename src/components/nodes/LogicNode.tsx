import { memo, useCallback, useMemo, useState, useEffect } from 'react';
import { Handle, Position, type NodeProps, useReactFlow, useNodes, useEdges } from '@xyflow/react';
import { Brain, Plus, Loader2, CheckCircle, XCircle, ExternalLink, Info } from 'lucide-react';
import { useSuiClient } from '@mysten/dapp-kit';
import { isValidSuiAddress, isValidSuiNSName } from '@mysten/sui/utils';
import { SuinsClient } from '@mysten/suins';
import { SuiNSHelper } from '../SuiNSHelper';
import { PackageHelper } from '../PackageHelper';
import { NodeMenu } from './NodeMenu';
import { TOKENS } from '@/config/tokens';
import { useExecutionSequence } from '@/hooks/useExecutionSequence';
import type { NodeData, LogicType, ComparisonOperator } from '@/types';

const LOGIC_TYPES = [
  { value: 'balance', label: 'Balance Check' },
  { value: 'contract', label: 'Contract Check' },
] as const;

const COMPARISON_OPTIONS: { value: ComparisonOperator; label: string }[] = [
  { value: 'gt', label: '>' },
  { value: 'gte', label: '>=' },
  { value: 'lt', label: '<' },
  { value: 'lte', label: '<=' },
  { value: 'eq', label: '=' },
  { value: 'ne', label: '≠' },
];

function LogicNode({ data, id }: NodeProps) {
  const { setNodes } = useReactFlow();
  const nodes = useNodes();
  const edges = useEdges();
  const nodeData = data as NodeData;
  const suiClient = useSuiClient();

  const [currentBalance, setCurrentBalance] = useState<string | null>(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [balanceError, setBalanceError] = useState<string | null>(null);
  const [suinsValidation, setSuinsValidation] = useState<{
    isValidating: boolean;
    isValid: boolean | null;
    resolvedAddress: string | null;
    isRegisteredButNoAddress?: boolean;
  }>({ isValidating: false, isValid: null, resolvedAddress: null, isRegisteredButNoAddress: false });

  // Contract check state
  const [currentContractValue, setCurrentContractValue] = useState<string | null>(null);
  const [isLoadingContract, setIsLoadingContract] = useState(false);
  const [contractError, setContractError] = useState<string | null>(null);

  // Module discovery state
  const [availableModules, setAvailableModules] = useState<string[]>([]);
  const [availableFunctions, setAvailableFunctions] = useState<{name: string, params: string[]}[]>([]);
  const [isLoadingModules, setIsLoadingModules] = useState(false);

  // Get sequence number from shared hook (uses topological sort)
  const { sequenceMap } = useExecutionSequence();
  const sequenceNumber = sequenceMap.get(id) || 0;

  const sequenceNumber_UNUSED = useMemo(() => {
    const walletNode = nodes.find((n) => n.type === 'wallet');
    if (!walletNode) return 0;

    let counter = 0;
    const visited = new Set<string>();

    const traverse = (nodeId: string): number | null => {
      if (visited.has(nodeId)) return null;
      visited.add(nodeId);

      const node = nodes.find((n) => n.id === nodeId);

      if (!node || node.type === 'wallet') {
        const outgoing = edges.filter((e) => e.source === nodeId);
        const sortedEdges = outgoing.sort((a, b) => {
          const targetA = nodes.find((n) => n.id === a.target);
          const targetB = nodes.find((n) => n.id === b.target);
          if (!targetA || !targetB) return 0;
          if (Math.abs(targetA.position.y - targetB.position.y) > 50) {
            return targetA.position.y - targetB.position.y;
          }
          return targetA.position.x - targetB.position.x;
        });
        for (const edge of sortedEdges) {
          const result = traverse(edge.target);
          if (result !== null) return result;
        }
        return null;
      }

      if (node.type === 'selector') {
        const outgoing = edges.filter((e) => e.source === nodeId);
        const sortedEdges = outgoing.sort((a, b) => {
          const targetA = nodes.find((n) => n.id === a.target);
          const targetB = nodes.find((n) => n.id === b.target);
          if (!targetA || !targetB) return 0;
          if (Math.abs(targetA.position.y - targetB.position.y) > 50) {
            return targetA.position.y - targetB.position.y;
          }
          return targetA.position.x - targetB.position.x;
        });
        for (const edge of sortedEdges) {
          const result = traverse(edge.target);
          if (result !== null) return result;
        }
        return null;
      }

      counter++;
      if (nodeId === id) {
        return counter;
      }

      const outgoing = edges.filter((e) => e.source === nodeId);
      for (const edge of outgoing) {
        const result = traverse(edge.target);
        if (result !== null) return result;
      }

      return null;
    };

    traverse(walletNode.id);
    return counter;
  }, [id, nodes, edges]);

  // Validate SuiNS name
  useEffect(() => {
    const address = nodeData.balanceAddress;

    if (!address) {
      setSuinsValidation({ isValidating: false, isValid: null, resolvedAddress: null });
      return;
    }

    // If it's a regular address, no validation needed
    if (address.startsWith('0x')) {
      setSuinsValidation({ isValidating: false, isValid: null, resolvedAddress: null });
      return;
    }

    // Check if it's a valid SuiNS name
    if (isValidSuiNSName(address)) {
      setSuinsValidation({ isValidating: true, isValid: null, resolvedAddress: null });

      const validateName = async () => {
        try {
          const suinsClient = new SuinsClient({
            client: suiClient as any,
            network: 'mainnet',
          });
          const nameRecord = await suinsClient.getNameRecord(address);

          if (nameRecord && nameRecord.targetAddress) {
            setSuinsValidation({
              isValidating: false,
              isValid: true,
              resolvedAddress: nameRecord.targetAddress,
              isRegisteredButNoAddress: false,
            });
          } else if (nameRecord && !nameRecord.targetAddress) {
            setSuinsValidation({
              isValidating: false,
              isValid: false,
              resolvedAddress: null,
              isRegisteredButNoAddress: true,
            });
          } else {
            setSuinsValidation({
              isValidating: false,
              isValid: false,
              resolvedAddress: null,
              isRegisteredButNoAddress: false,
            });
          }
        } catch (error) {
          console.error('SuiNS validation error:', error);
          setSuinsValidation({
            isValidating: false,
            isValid: false,
            resolvedAddress: null,
            isRegisteredButNoAddress: false,
          });
        }
      };

      const timeoutId = setTimeout(validateName, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [nodeData.balanceAddress, suiClient]);

  // Fetch balance when address is valid
  useEffect(() => {
    // Use resolved address if available, otherwise use the input address
    const address =
      suinsValidation.resolvedAddress || nodeData.balanceAddress?.trim();

    if (!address || !isValidSuiAddress(address)) {
      setCurrentBalance(null);
      setBalanceError(null);
      return;
    }

    const fetchBalance = async () => {
      setIsLoadingBalance(true);
      setBalanceError(null);
      try {
        const asset = (nodeData.balanceAsset || 'SUI') as keyof typeof TOKENS;
        const tokenInfo = TOKENS[asset];

        const balance = await suiClient.getBalance({
          owner: address,
          coinType: tokenInfo.coinType,
        });
        const balanceInToken = parseInt(balance.totalBalance) / Math.pow(10, tokenInfo.decimals);
        const displayDecimals = asset === 'SUI' ? 4 : 2;
        setCurrentBalance(balanceInToken.toFixed(displayDecimals));
      } catch (error) {
        console.error('Failed to fetch balance:', error);
        setBalanceError('Failed to fetch balance');
        setCurrentBalance(null);
      } finally {
        setIsLoadingBalance(false);
      }
    };

    fetchBalance();
  }, [nodeData.balanceAddress, nodeData.balanceAsset, suiClient, suinsValidation.resolvedAddress]);

  // Fetch modules when package ID changes
  useEffect(() => {
    const packageId = nodeData.contractPackageId?.trim();

    if (!packageId || packageId.length < 10) {
      setAvailableModules([]);
      setAvailableFunctions([]);
      return;
    }

    const fetchModules = async () => {
      setIsLoadingModules(true);
      try {
        const modules = await suiClient.getNormalizedMoveModulesByPackage({ package: packageId });
        const moduleNames = Object.keys(modules).sort();
        setAvailableModules(moduleNames);

        // If a module is already selected, update functions for it
        if (nodeData.contractModule && modules[nodeData.contractModule]) {
          const selectedModule = modules[nodeData.contractModule];
          // Show only view functions (non-entry, read-only functions with return values)
          const functions = Object.entries(selectedModule.exposedFunctions)
            .filter(([_, func]: any) => {
              // Only non-entry functions (view/read-only) with return values
              return func.isEntry === false && func.return && func.return.length > 0;
            })
            .map(([name, func]: any) => ({
              name,
              params: func.parameters || [],
            }));
          setAvailableFunctions(functions);
        }
      } catch (error) {
        console.error('Failed to fetch modules:', error);
        setAvailableModules([]);
        setAvailableFunctions([]);
      } finally {
        setIsLoadingModules(false);
      }
    };

    const timeoutId = setTimeout(fetchModules, 500); // Debounce
    return () => clearTimeout(timeoutId);
  }, [nodeData.contractPackageId, suiClient]);

  // Fetch functions when module changes
  useEffect(() => {
    const packageId = nodeData.contractPackageId?.trim();
    const moduleName = nodeData.contractModule?.trim();

    if (!packageId || !moduleName) {
      setAvailableFunctions([]);
      return;
    }

    const fetchFunctions = async () => {
      try {
        const modules = await suiClient.getNormalizedMoveModulesByPackage({ package: packageId });
        if (modules[moduleName]) {
          const selectedModule = modules[moduleName];
          console.log('Module exposed functions:', selectedModule.exposedFunctions);

          // Show only view functions (non-entry, read-only functions)
          const functions = Object.entries(selectedModule.exposedFunctions)
            .filter(([_, func]: any) => {
              // Only non-entry functions (view/read-only) with return values
              return func.isEntry === false && func.return && func.return.length > 0;
            })
            .map(([name, func]: any) => ({
              name,
              params: func.parameters || [],
            }));

          console.log('Available view functions:', functions);
          setAvailableFunctions(functions);
        }
      } catch (error) {
        console.error('Failed to fetch functions:', error);
        setAvailableFunctions([]);
      }
    };

    fetchFunctions();
  }, [nodeData.contractModule, nodeData.contractPackageId, suiClient]);

  // Fetch contract value when all fields are valid
  useEffect(() => {
    const packageId = nodeData.contractPackageId?.trim();
    const module = nodeData.contractModule?.trim();
    const func = nodeData.contractFunction?.trim();

    if (!packageId || !module || !func) {
      setCurrentContractValue(null);
      setContractError(null);
      return;
    }

    const fetchContractValue = async () => {
      setIsLoadingContract(true);
      setContractError(null);
      try {
        // Parse arguments if provided
        let args: any[] = [];
        if (nodeData.contractArguments?.trim()) {
          try {
            args = JSON.parse(nodeData.contractArguments);
            if (!Array.isArray(args)) {
              throw new Error('Arguments must be a JSON array');
            }
          } catch (e) {
            setContractError('Invalid JSON arguments');
            setCurrentContractValue(null);
            setIsLoadingContract(false);
            return;
          }
        }

        // Build transaction to call the view function
        const tx = new (await import('@mysten/sui/transactions')).Transaction();

        // Parse and handle different argument types
        const parsedArgs = args.map((arg: any) => {
          if (typeof arg === 'string' && arg.startsWith('0x')) {
            // Handle object arguments - for shared objects like Clock at 0x6
            if (arg === '0x6' || arg === '0x0000000000000000000000000000000000000000000000000000000000000006') {
              return tx.sharedObjectRef({
                objectId: '0x0000000000000000000000000000000000000000000000000000000000000006',
                initialSharedVersion: 1,
                mutable: false,
              });
            }
            return tx.object(arg);
          }
          // Handle numbers
          if (typeof arg === 'number') {
            return tx.pure.u64(arg);
          }
          // Handle string numbers
          if (typeof arg === 'string' && !isNaN(Number(arg))) {
            return tx.pure.u64(Number(arg));
          }
          return tx.pure(arg);
        });

        // Call the move function - this will be a pure/view function call
        tx.moveCall({
          target: `${packageId}::${module}::${func}`,
          arguments: parsedArgs,
        });

        // Use devInspectTransactionBlock to execute without sending
        const result = await suiClient.devInspectTransactionBlock({
          transactionBlock: tx,
          sender: '0x0000000000000000000000000000000000000000000000000000000000000000',
        });

        if (result.error) {
          throw new Error(result.error);
        }

        if (!result.results || result.results.length === 0) {
          throw new Error('No return value from contract');
        }

        // Parse the return value (assuming it's a number for now)
        const returnData = result.results[0].returnValues;
        if (!returnData || returnData.length === 0) {
          throw new Error('No return data');
        }

        // Convert BCS bytes to number (simplified - assumes u64)
        const bytes = returnData[0][0];
        let value = 0;
        for (let i = 0; i < Math.min(bytes.length, 8); i++) {
          value += bytes[i] * Math.pow(256, i);
        }

        setCurrentContractValue(value.toString());
      } catch (error: any) {
        console.error('Failed to fetch contract value:', error);
        setContractError(error?.message || 'Failed to fetch contract value');
        setCurrentContractValue(null);
      } finally {
        setIsLoadingContract(false);
      }
    };

    const timeoutId = setTimeout(fetchContractValue, 1000); // Debounce
    return () => clearTimeout(timeoutId);
  }, [
    nodeData.contractPackageId,
    nodeData.contractModule,
    nodeData.contractFunction,
    nodeData.contractArguments,
    suiClient,
  ]);

  const updateNodeData = useCallback(
    (updates: Partial<NodeData>) => {
      setNodes((nds) =>
        nds.map((node) =>
          node.id === id ? { ...node, data: { ...node.data, ...updates } } : node
        )
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

  const handleReplace = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setNodes((nds) =>
        nds.map((node) =>
          node.id === id
            ? {
                ...node,
                type: 'selector',
                data: {
                  label: 'Select Action',
                  type: 'protocol',
                },
              }
            : node
        )
      );
    },
    [id, setNodes]
  );

  // Check if we have a valid address (either directly or resolved from SuiNS)
  const addressValid =
    (nodeData.balanceAddress?.trim() &&
      isValidSuiAddress(nodeData.balanceAddress.trim())) ||
    (suinsValidation.isValid && suinsValidation.resolvedAddress);

  return (
    <div className="bg-white dark:bg-gray-800 border-2 border-purple-500 rounded-lg shadow-lg min-w-[280px]">
      <div className="bg-purple-500 px-3 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-white" />
          <span className="font-semibold text-white text-sm">
            {sequenceNumber > 0 && `${sequenceNumber}. `}
            {nodeData.label}
          </span>
        </div>
        <NodeMenu onDelete={handleDelete} onReplace={handleReplace} />
      </div>

      <div className="p-4 space-y-3">
        {/* Condition Type Selection */}
        <div>
          <label className="text-xs text-gray-600 dark:text-gray-300 mb-1 block">
            Condition Type
          </label>
          <select
            value={nodeData.logicType || 'balance'}
            onChange={(e) =>
              updateNodeData({
                logicType: e.target.value as LogicType,
                // Clear balance check fields
                balanceAddress: undefined,
                comparisonOperator: undefined,
                compareValue: undefined,
                // Clear contract check fields
                contractPackageId: undefined,
                contractModule: undefined,
                contractFunction: undefined,
                contractArguments: undefined,
                contractComparisonOperator: undefined,
                contractCompareValue: undefined,
              })
            }
            className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded text-sm focus:outline-none focus:border-purple-500 dark:focus:border-purple-400"
          >
            {LOGIC_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        {/* Balance Check UI */}
        {nodeData.logicType === 'balance' && (
          <>
            <div>
              <label className="text-xs text-gray-600 dark:text-gray-300 mb-1 block">
                Asset to Check
              </label>
              <select
                value={nodeData.balanceAsset || 'SUI'}
                onChange={(e) => updateNodeData({ balanceAsset: e.target.value })}
                className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded text-sm focus:outline-none focus:border-purple-500 dark:focus:border-purple-400"
              >
                <option value="SUI">SUI</option>
                <option value="USDC">USDC</option>
                <option value="USDT">USDT</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-gray-600 dark:text-gray-300 mb-1 block">
                Address (check balance of)
              </label>
              <input
                type="text"
                value={nodeData.balanceAddress || ''}
                onChange={(e) =>
                  updateNodeData({
                    balanceAddress: e.target.value,
                    comparisonOperator: undefined,
                    compareValue: undefined,
                  })
                }
                placeholder="0x..., name.sui, or @name"
                className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded text-sm font-mono focus:outline-none focus:border-purple-500 dark:focus:border-purple-400"
              />
              {nodeData.balanceAddress &&
                isValidSuiNSName(nodeData.balanceAddress) && (
                  <div className="mt-1">
                    {suinsValidation.isValidating && (
                      <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>Resolving SuiNS name...</span>
                      </div>
                    )}
                    {!suinsValidation.isValidating &&
                      suinsValidation.isValid === true &&
                      suinsValidation.resolvedAddress && (
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-xs text-green-600">
                            <CheckCircle className="w-3 h-3" />
                            <span>Valid SuiNS name</span>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400 font-mono bg-gray-50 dark:bg-gray-700 rounded p-1">
                            <span className="flex-1 truncate">
                              → {suinsValidation.resolvedAddress.slice(0, 7)}...
                              {suinsValidation.resolvedAddress.slice(-5)}
                            </span>
                            <div className="flex items-center gap-0.5">
                              <div className="group relative">
                                <Info className="w-3 h-3 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 cursor-help" />
                                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-10">
                                  {suinsValidation.resolvedAddress}
                                </div>
                              </div>
                              <a
                                href={`https://suivision.xyz/account/${suinsValidation.resolvedAddress}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-500 hover:text-blue-700"
                                title="View on SuiVision"
                              >
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                          </div>
                        </div>
                      )}
                    {!suinsValidation.isValidating &&
                      suinsValidation.isValid === false && (
                        <div className="flex items-center gap-1 text-xs text-red-600">
                          <XCircle className="w-3 h-3" />
                          <span>
                            {suinsValidation.isRegisteredButNoAddress
                              ? 'Name registered but owner has not set a target address'
                              : 'This SuiNS name is not registered'}
                          </span>
                        </div>
                      )}
                  </div>
                )}
              {(!nodeData.balanceAddress ||
                !isValidSuiNSName(nodeData.balanceAddress)) &&
                !nodeData.balanceAddress?.startsWith('0x') && (
                  <SuiNSHelper
                    onSelectName={(name) => updateNodeData({ balanceAddress: name })}
                  />
                )}
            </div>

            {addressValid && (
              <>
                <div>
                  <label className="text-xs text-gray-600 dark:text-gray-300 mb-1 block">
                    Condition
                  </label>
                  <select
                    value={nodeData.comparisonOperator || ''}
                    onChange={(e) =>
                      updateNodeData({
                        comparisonOperator: e.target.value as ComparisonOperator,
                      })
                    }
                    className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded text-sm focus:outline-none focus:border-purple-500 dark:focus:border-purple-400"
                  >
                    <option value="">Compare</option>
                    {COMPARISON_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-600 dark:text-gray-300 mb-1 block">
                    Value ({nodeData.balanceAsset || 'SUI'})
                  </label>
                  <input
                    type="text"
                    value={nodeData.compareValue || ''}
                    onChange={(e) => updateNodeData({ compareValue: e.target.value })}
                    placeholder="e.g. 1.5"
                    className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded text-sm font-mono focus:outline-none focus:border-purple-500 dark:focus:border-purple-400"
                  />
                </div>

                {/* Current Balance Display */}
                <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded px-2 py-1.5">
                  <div className="text-xs text-gray-600 dark:text-gray-300 flex items-center gap-1">
                    {isLoadingBalance ? (
                      <span className="flex items-center gap-1">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Current {nodeData.balanceAsset || 'SUI'} balance: loading...
                      </span>
                    ) : balanceError ? (
                      <span className="text-red-600 dark:text-red-400">
                        Current {nodeData.balanceAsset || 'SUI'} balance: {balanceError}
                      </span>
                    ) : currentBalance !== null ? (
                      <>
                        <span className="font-mono">
                          Current {nodeData.balanceAsset || 'SUI'} balance: {currentBalance} {nodeData.balanceAsset || 'SUI'}
                        </span>
                        <div className="group relative">
                          <Info className="w-3 h-3 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 cursor-help" />
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-10">
                            If condition is TRUE, execution proceeds. Otherwise, branch is skipped.
                          </div>
                        </div>
                      </>
                    ) : null}
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {/* Contract Check UI */}
        {nodeData.logicType === 'contract' && (
          <>
            <div>
              <label className="text-xs text-gray-600 dark:text-gray-300 mb-1 block">
                Package ID
              </label>
              <input
                type="text"
                value={nodeData.contractPackageId || ''}
                onChange={(e) => updateNodeData({ contractPackageId: e.target.value })}
                placeholder="0x... or select from known packages below"
                className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded text-sm font-mono focus:outline-none focus:border-purple-500 dark:focus:border-purple-400"
              />
              <PackageHelper
                onSelectPackage={(packageId) => updateNodeData({ contractPackageId: packageId })}
                mode="both"
              />
            </div>

            <div>
              <label className="text-xs text-gray-600 dark:text-gray-300 mb-1 flex items-center gap-1">
                Module Name
                {isLoadingModules && <Loader2 className="w-3 h-3 animate-spin" />}
              </label>
              {availableModules.length > 0 ? (
                <select
                  value={nodeData.contractModule || ''}
                  onChange={(e) => updateNodeData({ contractModule: e.target.value, contractFunction: undefined })}
                  className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded text-sm font-mono focus:outline-none focus:border-purple-500 dark:focus:border-purple-400"
                >
                  <option value="">Select module...</option>
                  {availableModules.map((mod) => (
                    <option key={mod} value={mod}>
                      {mod}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={nodeData.contractModule || ''}
                  onChange={(e) => updateNodeData({ contractModule: e.target.value })}
                  placeholder={isLoadingModules ? "Loading modules..." : "Enter package ID first"}
                  disabled={isLoadingModules}
                  className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded text-sm font-mono focus:outline-none focus:border-purple-500 dark:focus:border-purple-400 disabled:opacity-50"
                />
              )}
            </div>

            <div>
              <label className="text-xs text-gray-600 dark:text-gray-300 mb-1 block">
                Function Name (view function)
              </label>
              {availableFunctions.length > 0 ? (
                <select
                  value={nodeData.contractFunction || ''}
                  onChange={(e) => updateNodeData({ contractFunction: e.target.value })}
                  className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded text-sm font-mono focus:outline-none focus:border-purple-500 dark:focus:border-purple-400"
                >
                  <option value="">Select function...</option>
                  {availableFunctions.map((func) => (
                    <option key={func.name} value={func.name}>
                      {func.name} ({func.params.length} params)
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={nodeData.contractFunction || ''}
                  onChange={(e) => updateNodeData({ contractFunction: e.target.value })}
                  placeholder={nodeData.contractModule ? "No view functions found" : "Select module first"}
                  disabled={!nodeData.contractModule}
                  className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded text-sm font-mono focus:outline-none focus:border-purple-500 dark:focus:border-purple-400 disabled:opacity-50"
                />
              )}
            </div>

            <div>
              <label className="text-xs text-gray-600 dark:text-gray-300 mb-1 flex items-center gap-1">
                Arguments (optional)
                <div className="group relative">
                  <Info className="w-3 h-3 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 cursor-help" />
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-10">
                    JSON array, e.g., ["0x123", 42]
                  </div>
                </div>
              </label>
              <input
                type="text"
                value={nodeData.contractArguments || ''}
                onChange={(e) => updateNodeData({ contractArguments: e.target.value })}
                placeholder='["0x...", 123]'
                className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded text-sm font-mono focus:outline-none focus:border-purple-500 dark:focus:border-purple-400"
              />
              {nodeData.contractFunction && availableFunctions.length > 0 && (
                <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {(() => {
                    const selectedFunc = availableFunctions.find(f => f.name === nodeData.contractFunction);
                    if (selectedFunc && selectedFunc.params.length > 0) {
                      return `Expects ${selectedFunc.params.length} parameter${selectedFunc.params.length === 1 ? '' : 's'}`;
                    }
                    return 'No parameters required';
                  })()}
                </div>
              )}
            </div>

            {nodeData.contractPackageId && nodeData.contractModule && nodeData.contractFunction && (
              <>
                <div>
                  <label className="text-xs text-gray-600 dark:text-gray-300 mb-1 block">
                    Condition
                  </label>
                  <select
                    value={nodeData.contractComparisonOperator || ''}
                    onChange={(e) =>
                      updateNodeData({
                        contractComparisonOperator: e.target.value as ComparisonOperator,
                      })
                    }
                    className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded text-sm focus:outline-none focus:border-purple-500 dark:focus:border-purple-400"
                  >
                    <option value="">Compare</option>
                    {COMPARISON_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-gray-600 dark:text-gray-300 mb-1 block">
                    Expected Value
                  </label>
                  <input
                    type="text"
                    value={nodeData.contractCompareValue || ''}
                    onChange={(e) => updateNodeData({ contractCompareValue: e.target.value })}
                    placeholder="e.g., 100"
                    className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded text-sm font-mono focus:outline-none focus:border-purple-500 dark:focus:border-purple-400"
                  />
                </div>

                {/* Current Contract Value Display */}
                <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded px-2 py-1.5">
                  <div className="text-xs text-gray-600 dark:text-gray-300 flex items-center gap-1">
                    {isLoadingContract ? (
                      <span className="flex items-center gap-1">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Current contract value: loading...
                      </span>
                    ) : contractError ? (
                      <span className="text-red-600 dark:text-red-400">
                        Error: {contractError}
                      </span>
                    ) : currentContractValue !== null ? (
                      <>
                        <span className="font-mono">
                          Current contract value: {currentContractValue}
                        </span>
                        <div className="group relative">
                          <Info className="w-3 h-3 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 cursor-help" />
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-10">
                            If condition is TRUE, execution proceeds. Otherwise, branch is skipped.
                          </div>
                        </div>
                      </>
                    ) : (
                      <span className="text-gray-500">Enter all fields to fetch value</span>
                    )}
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* Handles */}
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-purple-500 !w-3 !h-3"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!bg-purple-500 !w-3 !h-3"
      />

      {/* Add Sequence button */}
      <div className="border-t border-gray-200 dark:border-gray-700 p-2 flex justify-center">
        <button
          className="flex items-center gap-1 text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/20 px-3 py-1 rounded transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            const event = new CustomEvent('addNode', {
              detail: { sourceNodeId: id },
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

export default memo(LogicNode);
