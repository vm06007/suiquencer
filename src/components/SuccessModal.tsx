import { CheckCircle2, ExternalLink, X, Copy, Loader2, AlertCircle, ArrowRight } from 'lucide-react';
import { useState } from 'react';
import type { BridgeStatus } from '@/hooks/useExecuteSequence';

interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  digest: string;
  stepCount: number;
  network?: 'mainnet' | 'testnet' | 'devnet';
  hasBridgeOperation?: boolean;
  bridgeStatus?: BridgeStatus | null;
}

export function SuccessModal({ isOpen, onClose, digest, stepCount, network = 'mainnet', hasBridgeOperation = false, bridgeStatus }: SuccessModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const suiscanUrl = network === 'mainnet'
    ? `https://suiscan.xyz/mainnet/tx/${digest}`
    : `https://suiscan.xyz/${network}/tx/${digest}`;

  const suivisionUrl = network === 'mainnet'
    ? `https://suivision.xyz/txblock/${digest}`
    : `https://suivision.xyz/txblock/${digest}?network=${network}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(digest);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4"
        onClick={onClose}
      >
        {/* Modal */}
        <div
          className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 relative"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Success Icon */}
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            </div>
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">
            {hasBridgeOperation ? 'Bridge Transaction Submitted!' : 'Transaction Successful!'}
          </h2>

          {/* Subtitle */}
          <p className="text-gray-600 text-center mb-6">
            {hasBridgeOperation
              ? `${stepCount} operation${stepCount !== 1 ? 's' : ''} including cross-chain bridge`
              : `All ${stepCount} operation${stepCount !== 1 ? 's' : ''} executed in one atomic transaction`
            }
          </p>

          {/* Transaction Hash */}
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Transaction Hash</span>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 transition-colors"
              >
                {copied ? (
                  <span className="text-green-600">Copied!</span>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
            <div className="font-mono text-xs text-gray-900 break-all bg-white rounded p-2 border border-gray-200">
              {digest}
            </div>
          </div>

          {/* Explorer Links */}
          <div className="space-y-2">
            <p className="text-xs text-gray-600 text-center mb-2">View transaction on:</p>
            <div className="grid grid-cols-2 gap-2">
              <a
                href={suiscanUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white py-2.5 rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 transition-all shadow-md hover:shadow-lg text-sm"
              >
                <span>SuiScan</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <a
                href={suivisionUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 bg-gradient-to-r from-purple-600 to-purple-700 text-white py-2.5 rounded-lg font-semibold hover:from-purple-700 hover:to-purple-800 transition-all shadow-md hover:shadow-lg text-sm"
              >
                <span>SuiVision</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Bridge Live Tracking */}
          {hasBridgeOperation && (
            <div className="mt-4 bg-purple-50 border-2 border-purple-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-purple-900 mb-2 flex items-center gap-2">
                <span className="text-lg">🌉</span>
                Cross-Chain Bridge
                {bridgeStatus?.fromAsset && bridgeStatus?.toAsset && (
                  <span className="text-xs font-normal text-purple-600">
                    {bridgeStatus.fromAsset} <ArrowRight className="w-3 h-3 inline" /> {bridgeStatus.toAsset}
                  </span>
                )}
              </h3>

              {bridgeStatus?.tool && (
                <p className="text-xs text-purple-600 mb-3">
                  via {bridgeStatus.tool} | {bridgeStatus.fromChain} → {bridgeStatus.toChain}
                </p>
              )}

              {/* Live Status Steps */}
              <div className="space-y-2 mb-3">
                {/* Source Chain Transaction */}
                <BridgeStep
                  label="Source transaction (Sui)"
                  status={
                    bridgeStatus?.processes?.find((p) => p.type === 'CROSS_CHAIN' || p.type === 'SWAP')?.status ||
                    (bridgeStatus?.status === 'signing' ? 'ACTION_REQUIRED' : 'STARTED')
                  }
                  txHash={bridgeStatus?.processes?.find((p) => p.txHash)?.txHash}
                  txLink={bridgeStatus?.processes?.find((p) => p.txLink)?.txLink}
                />

                {/* Bridge Relay */}
                <BridgeStep
                  label={`Bridge relay to ${bridgeStatus?.toChain || 'destination'}`}
                  status={
                    bridgeStatus?.status === 'done' ? 'DONE' :
                    bridgeStatus?.status === 'bridging' ? 'PENDING' :
                    bridgeStatus?.status === 'failed' ? 'FAILED' :
                    'WAITING'
                  }
                  txHash={bridgeStatus?.processes?.find((p, i) => i > 0 && p.txHash)?.txHash}
                  txLink={bridgeStatus?.processes?.find((p, i) => i > 0 && p.txLink)?.txLink}
                />

                {/* Destination Delivery */}
                <BridgeStep
                  label={`Deliver ${bridgeStatus?.toAsset || 'tokens'} on ${bridgeStatus?.toChain || 'destination'}`}
                  status={
                    bridgeStatus?.status === 'done' ? 'DONE' :
                    bridgeStatus?.status === 'failed' ? 'FAILED' :
                    'WAITING'
                  }
                />
              </div>

              {/* Error Message */}
              {bridgeStatus?.status === 'failed' && bridgeStatus?.error && (
                <div className="flex items-start gap-2 p-2 bg-red-50 border border-red-200 rounded mb-3">
                  <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-700">{bridgeStatus.error}</p>
                </div>
              )}

              {/* Overall Status Banner */}
              {bridgeStatus?.status === 'done' && (
                <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded mb-3">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <p className="text-xs text-green-700 font-medium">Bridge complete! Assets delivered.</p>
                </div>
              )}
              {(bridgeStatus?.status === 'bridging' || bridgeStatus?.status === 'pending') && (
                <div className="flex items-center gap-2 p-2 bg-yellow-50 border border-yellow-200 rounded mb-3">
                  <Loader2 className="w-4 h-4 text-yellow-600 animate-spin" />
                  <p className="text-xs text-yellow-700">Bridge in progress - assets are being relayed (5-15 min)...</p>
                </div>
              )}

              <div className="pt-3 border-t border-purple-200">
                {digest && digest !== 'bridge-pending' && (
                  <a
                    href={`https://scan.li.fi/tx/${digest}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 bg-gradient-to-r from-purple-600 to-purple-700 text-white py-2 rounded-lg font-semibold hover:from-purple-700 hover:to-purple-800 transition-all shadow-md hover:shadow-lg text-sm w-full"
                  >
                    <span>Track on LI.FI Explorer</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
                <p className="text-xs text-purple-600 text-center mt-2">
                  Powered by LI.FI cross-chain routing
                </p>
              </div>
            </div>
          )}

          {/* Network Badge */}
          <div className="mt-4 text-center">
            <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
              {network.charAt(0).toUpperCase() + network.slice(1)} Network
            </span>
          </div>
        </div>
      </div>
    </>
  );
}

function BridgeStep({ label, status, txHash, txLink }: {
  label: string;
  status: string;
  txHash?: string;
  txLink?: string;
}) {
  const getStatusIcon = () => {
    switch (status) {
      case 'DONE':
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case 'PENDING':
      case 'STARTED':
      case 'ACTION_REQUIRED':
        return <Loader2 className="w-4 h-4 text-purple-600 animate-spin" />;
      case 'FAILED':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default: // WAITING
        return <div className="w-4 h-4 rounded-full border-2 border-gray-300" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'DONE': return 'text-green-700';
      case 'PENDING': case 'STARTED': case 'ACTION_REQUIRED': return 'text-purple-700';
      case 'FAILED': return 'text-red-700';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="flex items-center gap-2">
      {getStatusIcon()}
      <div className="flex-1 min-w-0">
        <span className={`text-xs font-medium ${getStatusColor()}`}>{label}</span>
        {txHash && (
          <div className="flex items-center gap-1 mt-0.5">
            <span className="text-xs text-gray-500 font-mono truncate">
              {txHash.slice(0, 10)}...{txHash.slice(-6)}
            </span>
            {txLink && (
              <a href={txLink} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-700 flex-shrink-0">
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
