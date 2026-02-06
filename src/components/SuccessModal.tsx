import { CheckCircle2, ExternalLink, X, Copy } from 'lucide-react';
import { useState } from 'react';

interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  digest: string;
  stepCount: number;
  network?: 'mainnet' | 'testnet' | 'devnet';
  hasBridgeOperation?: boolean;
}

export function SuccessModal({ isOpen, onClose, digest, stepCount, network = 'mainnet', hasBridgeOperation = false }: SuccessModalProps) {
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
            Transaction Successful!
          </h2>

          {/* Subtitle */}
          <p className="text-gray-600 text-center mb-6">
            All {stepCount} operation{stepCount !== 1 ? 's' : ''} executed in one atomic transaction
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

          {/* Bridge Next Steps */}
          {hasBridgeOperation && (
            <div className="mt-4 bg-purple-50 border-2 border-purple-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-purple-900 mb-2 flex items-center gap-2">
                <span className="text-lg">🌉</span>
                Cross-Chain Bridge in Progress
              </h3>
              <p className="text-xs text-purple-800 mb-3">
                Your assets have been locked on Sui. The bridge process will continue on the destination chain.
              </p>
              <div className="space-y-2">
                <div className="flex items-start gap-2 text-xs text-purple-700">
                  <span className="font-medium">1.</span>
                  <span>Bridge relayers will transfer your assets to the destination chain (5-15 min)</span>
                </div>
                <div className="flex items-start gap-2 text-xs text-purple-700">
                  <span className="font-medium">2.</span>
                  <span>LI.FI will route your swap to the best DEX/protocol</span>
                </div>
                <div className="flex items-start gap-2 text-xs text-purple-700">
                  <span className="font-medium">3.</span>
                  <span>Final assets will be delivered to your destination address</span>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-purple-200">
                <a
                  href="https://li.fi/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 bg-gradient-to-r from-purple-600 to-purple-700 text-white py-2 rounded-lg font-semibold hover:from-purple-700 hover:to-purple-800 transition-all shadow-md hover:shadow-lg text-sm w-full"
                >
                  <span>Track on LI.FI</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
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
