import { memo, useCallback, useMemo, useState, useEffect } from 'react';
import { Handle, Position, type NodeProps, useReactFlow, useNodes, useEdges } from '@xyflow/react';
import { Code, Loader2, Info } from 'lucide-react';
import { useSuiClient } from '@mysten/dapp-kit';
import { PackageHelper } from '../PackageHelper';
import { NodeMenu } from './NodeMenu';
import { useExecutionSequence } from '@/hooks/useExecutionSequence';
import type { NodeData } from '@/types';

function CustomNode({ data, id }: NodeProps) {
  const { setNodes } = useReactFlow();
  const nodes = useNodes();
  const edges = useEdges();
  const nodeData = data as NodeData;
  const suiClient = useSuiClient();

  // Module discovery state
  const [availableModules, setAvailableModules] = useState<string[]>([]);
  const [availableFunctions, setAvailableFunctions] = useState<{name: string, params: string[], isEntry: boolean}[]>([]);
  const [isLoadingModules, setIsLoadingModules] = useState(false);

  // Get sequence number from shared hook (uses topological sort)
  const { sequenceMap } = useExecutionSequence();
  const sequenceNumber = sequenceMap.get(id) || 0;

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

  // Fetch modules when package ID changes
  useEffect(() => {
    const packageId = nodeData.customPackageId?.trim();
    if (!packageId || packageId.length < 10) {
      setAvailableModules([]);
      setAvailableFunctions([]);
      return;
    }

    const fetchModules = async () => {
      setIsLoadingModules(true);
      try {
        const modules = await suiClient.getNormalizedMoveModulesByPackage({
          package: packageId,
        });

        const moduleNames = Object.keys(modules).sort();
        setAvailableModules(moduleNames);

        // If a module is already selected, fetch its functions
        if (nodeData.customModule && modules[nodeData.customModule]) {
          const selectedModule = modules[nodeData.customModule];
          const allFuncs = Object.entries(selectedModule.exposedFunctions);

          // Get all functions with their entry status
          const functions = allFuncs.map(([name, func]: any) => ({
            name,
            params: func.parameters || [],
            isEntry: func.isEntry === true,
          }));

          // Separate entry and non-entry for logging
          const entryFuncs = functions.filter(f => f.isEntry);
          console.log(`Found ${entryFuncs.length} entry functions (callable) and ${functions.length - entryFuncs.length} view functions in ${nodeData.customModule}`);
          setAvailableFunctions(functions);
        }
      } catch (error) {
        console.error('Error fetching modules:', error);
        setAvailableModules([]);
        setAvailableFunctions([]);
      } finally {
        setIsLoadingModules(false);
      }
    };

    fetchModules();
  }, [nodeData.customPackageId, nodeData.customModule, suiClient]);

  // Fetch functions when module changes
  useEffect(() => {
    const packageId = nodeData.customPackageId?.trim();
    const moduleName = nodeData.customModule?.trim();

    if (!packageId || !moduleName || packageId.length < 10) {
      setAvailableFunctions([]);
      return;
    }

    const fetchFunctions = async () => {
      try {
        const modules = await suiClient.getNormalizedMoveModulesByPackage({
          package: packageId,
        });

        if (!modules[moduleName]) {
          setAvailableFunctions([]);
          return;
        }

        const selectedModule = modules[moduleName];
        const allFunctions = Object.entries(selectedModule.exposedFunctions);
        console.log(`Module ${moduleName} has ${allFunctions.length} total functions`);

        // Get all functions with their entry status
        const functions = allFunctions.map(([name, func]: any) => ({
          name,
          params: func.parameters || [],
          isEntry: func.isEntry === true,
        }));

        const entryFuncs = functions.filter(f => f.isEntry);
        console.log(`Found ${entryFuncs.length} entry functions (callable) in ${moduleName}:`, entryFuncs.map(f => f.name));
        setAvailableFunctions(functions);
      } catch (error) {
        console.error('Error fetching functions:', error);
        setAvailableFunctions([]);
      }
    };

    fetchFunctions();
  }, [nodeData.customPackageId, nodeData.customModule, suiClient]);

  return (
    <div className="bg-white dark:bg-gray-800 border-2 border-gray-500 dark:border-gray-600 rounded-lg shadow-lg min-w-[340px] max-w-[400px]">
      {/* Header */}
      <div className="bg-gray-500 px-3 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Code className="w-4 h-4 text-white" />
          <span className="font-semibold text-white text-sm">
            {sequenceNumber > 0 && `${sequenceNumber}. `}
            {nodeData.label}
          </span>
        </div>
        <NodeMenu onDelete={handleDelete} onReplace={handleReplace} />
      </div>

      <div className="p-4 space-y-3">
        <div className="flex items-start gap-2 p-2 bg-gray-50 dark:bg-gray-700/50 rounded border border-gray-200 dark:border-gray-600">
          <Info className="w-4 h-4 text-gray-500 dark:text-gray-400 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-gray-600 dark:text-gray-300">
            Execute a custom contract function on the Sui blockchain. Select a package, module, and entry function to call.
          </p>
        </div>

        {/* Package ID */}
        <div>
          <label className="text-xs text-gray-600 dark:text-gray-300 mb-1 block">
            Package ID
          </label>
          <input
            type="text"
            value={nodeData.customPackageId || ''}
            onChange={(e) =>
              updateNodeData({
                customPackageId: e.target.value,
                customModule: undefined,
                customFunction: undefined,
              })
            }
            placeholder="0x2 or 0x..."
            className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded text-sm font-mono focus:outline-none focus:border-gray-500 dark:focus:border-gray-400"
          />
          <PackageHelper
            onSelectPackage={(pkgId) => updateNodeData({ customPackageId: pkgId })}
            mode="entry"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            💡 Try: Scallop (lending), Cetus (DEX), Turbos (DEX)
          </p>
        </div>

        {/* Module Name */}
        {nodeData.customPackageId && (
          <div>
            <label className="text-xs text-gray-600 dark:text-gray-300 mb-1 flex items-center gap-1">
              Module Name
              {isLoadingModules && <Loader2 className="w-3 h-3 animate-spin" />}
            </label>
            {availableModules.length > 0 ? (
              <select
                value={nodeData.customModule || ''}
                onChange={(e) => updateNodeData({ customModule: e.target.value, customFunction: undefined })}
                className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded text-sm font-mono focus:outline-none focus:border-gray-500 dark:focus:border-gray-400"
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
                value={nodeData.customModule || ''}
                onChange={(e) => updateNodeData({ customModule: e.target.value, customFunction: undefined })}
                placeholder="coin"
                className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded text-sm font-mono focus:outline-none focus:border-gray-500 dark:focus:border-gray-400"
              />
            )}
          </div>
        )}

        {/* Function Name */}
        {nodeData.customModule && (
          <div>
            <label className="text-xs text-gray-600 dark:text-gray-300 mb-1 block">
              Function Name
            </label>
            {availableFunctions.length > 0 ? (
              <>
                <select
                  value={nodeData.customFunction || ''}
                  onChange={(e) => updateNodeData({ customFunction: e.target.value })}
                  className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded text-sm font-mono focus:outline-none focus:border-gray-500 dark:focus:border-gray-400"
                >
                  <option value="">Select function...</option>
                  {availableFunctions.filter(f => f.isEntry).length > 0 && (
                    <optgroup label="✓ Entry Functions (Callable)">
                      {availableFunctions.filter(f => f.isEntry).map((func) => {
                        // Count only user-fillable params (exclude signer, txcontext, &mut)
                        const userParamCount = func.params.filter((p: any) => {
                          const pStr = typeof p === 'string' ? p : JSON.stringify(p);
                          const pLower = pStr.toLowerCase();
                          return !pLower.includes('signer') && !pLower.includes('txcontext') && !pLower.includes('&mut');
                        }).length;

                        return (
                          <option key={func.name} value={func.name}>
                            {func.name} ({userParamCount} {userParamCount === 1 ? 'param' : 'params'})
                          </option>
                        );
                      })}
                    </optgroup>
                  )}
                  {availableFunctions.filter(f => !f.isEntry).length > 0 && (
                    <optgroup label="⚠️ View Functions (Read-only, not callable)">
                      {availableFunctions.filter(f => !f.isEntry).map((func) => (
                        <option key={func.name} value={func.name} disabled>
                          {func.name} ({func.params.length} params) - View only
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
                {availableFunctions.filter(f => f.isEntry).length === 0 && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                    ⚠️ This module has only view functions (read-only). Try a different module or package for executable functions.
                  </p>
                )}
              </>
            ) : (
              <>
                <input
                  type="text"
                  value={nodeData.customFunction || ''}
                  onChange={(e) => updateNodeData({ customFunction: e.target.value })}
                  placeholder="function_name"
                  className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded text-sm font-mono focus:outline-none focus:border-gray-500 dark:focus:border-gray-400"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  No functions found. Enter function name manually or try a different module.
                </p>
              </>
            )}
            {/* Example presets for specific functions */}
            {nodeData.customPackageId === '0xd384ded6b9e7f4d2c4c9007b0291ef88fbfed8e709bce83d2da69de2d79d013d' &&
             nodeData.customModule === 'mint' &&
             nodeData.customFunction === 'mint_entry' && (
              <button
                onClick={() => {
                  updateNodeData({
                    customTypeArguments: '["0x2::sui::SUI"]',
                    customArguments: JSON.stringify([
                      '0x07871c4b3c847a0f674510d4978d5cf6f960452795e8ff6f189fd2088a3f6ac7',
                      '0xa757975255146dc9686aa823b7838b507f315d704f428cbadad2f4ea061939d9',
                      '1000000000',
                      '0x0000000000000000000000000000000000000000000000000000000000000006'
                    ])
                  });
                }}
                className="mt-1 text-xs text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 flex items-center gap-1"
              >
                <span className="text-purple-500">💡</span> Load example: 1 SUI Deposit
              </button>
            )}
          </div>
        )}

        {/* Type Arguments */}
        {nodeData.customFunction && (
          <div>
            <label className="text-xs text-gray-600 dark:text-gray-300 mb-1 block">
              Type Arguments (optional)
              <span className="text-gray-500 ml-1">- for generic functions</span>
            </label>
            <textarea
              value={nodeData.customTypeArguments || ''}
              onChange={(e) => updateNodeData({ customTypeArguments: e.target.value })}
              rows={2}
              placeholder='["0x2::sui::SUI"]'
              className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded text-sm font-mono focus:outline-none focus:border-gray-500 dark:focus:border-gray-400"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Example: ["0x2::sui::SUI"] for functions like mint&lt;T&gt;
            </p>
          </div>
        )}

        {/* Arguments - Individual Parameter Fields */}
        {nodeData.customFunction && availableFunctions.length > 0 && (() => {
          const selectedFunc = availableFunctions.find(f => f.name === nodeData.customFunction);
          if (!selectedFunc) return null;

          console.log('Selected function:', selectedFunc.name);
          console.log('Raw parameters:', selectedFunc.params);
          selectedFunc.params.forEach((p: any, i: number) => {
            console.log(`  Param ${i + 1}:`, p);
          });

          // Parse existing arguments or initialize empty array
          let currentArgs: any[] = [];
          try {
            if (nodeData.customArguments) {
              currentArgs = JSON.parse(nodeData.customArguments as string);
              if (!Array.isArray(currentArgs)) currentArgs = [];
            }
          } catch {
            currentArgs = [];
          }

          // Filter out special parameters like &signer, &mut signer, &TxContext
          const userParams = selectedFunc.params.filter((param: any) => {
            // Params might be strings or objects, handle both
            const paramStr = typeof param === 'string' ? param : JSON.stringify(param);
            const p = paramStr.toLowerCase();
            return !p.includes('signer') && !p.includes('txcontext') && !p.includes('&mut');
          });

          if (userParams.length === 0) {
            return (
              <div className="text-xs text-gray-500 dark:text-gray-400 italic">
                No additional parameters required
              </div>
            );
          }

          const handleParamChange = (index: number, value: string) => {
            const newArgs = [...currentArgs];
            while (newArgs.length <= index) {
              newArgs.push('');
            }
            newArgs[index] = value;
            updateNodeData({ customArguments: JSON.stringify(newArgs) });
          };

          return (
            <div className="space-y-2">
              <label className="text-xs text-gray-600 dark:text-gray-300 mb-1 block font-medium">
                Function Parameters
              </label>
              {userParams.map((param: any, idx: number) => {
                // Extract type information from param structure
                let paramName = `Param ${idx + 1}`;
                let paramType = 'unknown';
                let placeholder = 'Enter value';
                let inputType = 'text';
                let typeHint = '';

                if (typeof param === 'string') {
                  paramType = param;
                  typeHint = param;
                } else if (param) {
                  // Extract the parameter name from the structure
                  // The structure can be: Object, Reference, MutableReference, Struct, TypeParameter, etc.
                  const extractName = (obj: any): string | null => {
                    if (!obj) return null;
                    if (obj.name) return obj.name;
                    if (obj.Reference?.Struct?.name) return obj.Reference.Struct.name;
                    if (obj.MutableReference?.Struct?.name) return obj.MutableReference.Struct.name;
                    if (obj.Struct?.name) return obj.Struct.name;
                    return null;
                  };

                  const name = extractName(param);
                  if (name) {
                    paramName = name;
                  }

                  const paramJson = JSON.stringify(param);
                  const paramLower = paramJson.toLowerCase();

                  // Determine type and placeholder based on structure
                  if (paramLower.includes('"u64"')) {
                    paramType = 'u64';
                    typeHint = 'number';
                    placeholder = '123';
                    inputType = 'number';
                  } else if (paramLower.includes('"u128"')) {
                    paramType = 'u128';
                    typeHint = 'large number';
                    placeholder = '123';
                    inputType = 'number';
                  } else if (paramLower.includes('"u8"')) {
                    paramType = 'u8';
                    typeHint = '0-255';
                    placeholder = '0-255';
                    inputType = 'number';
                  } else if (paramLower.includes('"bool"')) {
                    paramType = 'bool';
                    typeHint = 'true/false';
                  } else if (paramLower.includes('"address"') && !paramLower.includes('struct')) {
                    paramType = 'address';
                    typeHint = 'wallet address';
                    placeholder = '0x...';
                  } else if (paramLower.includes('mutablereference')) {
                    paramType = 'reference';
                    typeHint = 'mutable object ID';
                    placeholder = '0x... (object ID)';
                  } else if (paramLower.includes('reference')) {
                    paramType = 'reference';
                    typeHint = 'object ID';
                    placeholder = '0x... (object ID)';
                  } else if (paramLower.includes('struct')) {
                    paramType = 'object';
                    typeHint = 'object ID';
                    placeholder = '0x... (object ID)';
                  } else if (paramLower.includes('typeparameter')) {
                    paramType = 'type param';
                    typeHint = 'type argument';
                    placeholder = '0x...';
                  } else {
                    paramType = 'value';
                    typeHint = 'enter value';
                    placeholder = 'value';
                  }
                }

                const isBool = paramType === 'bool';

                return (
                  <div key={idx}>
                    <label className="text-xs text-gray-600 dark:text-gray-300 mb-0.5 block font-medium">
                      {paramName}
                      {typeHint && <span className="text-gray-500 dark:text-gray-400 font-normal ml-1">({typeHint})</span>}
                    </label>
                    {isBool ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={currentArgs[idx] === true || currentArgs[idx] === 'true'}
                          onChange={(e) => handleParamChange(idx, e.target.checked.toString())}
                          className="w-4 h-4 rounded border-gray-300 dark:border-gray-600"
                        />
                        <span className="text-xs text-gray-500">
                          {currentArgs[idx] === true || currentArgs[idx] === 'true' ? 'true' : 'false'}
                        </span>
                      </div>
                    ) : (
                      <input
                        type={inputType}
                        value={currentArgs[idx] || ''}
                        onChange={(e) => handleParamChange(idx, e.target.value)}
                        placeholder={placeholder}
                        className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded text-sm font-mono focus:outline-none focus:border-gray-500 dark:focus:border-gray-400"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>

      {/* Handles */}
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-gray-500 !w-3 !h-3"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!bg-gray-500 !w-3 !h-3"
      />
    </div>
  );
}

export default memo(CustomNode);
