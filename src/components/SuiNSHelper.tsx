import { useState } from 'react';
import { Search, ExternalLink, Copy, CheckCircle } from 'lucide-react';

interface SuiNSHelperProps {
  onSelectName: (name: string) => void;
}

// Real registered SuiNS names with addresses configured
// Note: You can use either @name or name.sui format
const COMMON_NAMES = [
  '@joythedog',
  'joythedog.sui',
  '@kartik',
  '@surflux',
  '@americankennelclub',
  '@brando',
];

export function SuiNSHelper({ onSelectName }: SuiNSHelperProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const handleCopy = (name: string) => {
    navigator.clipboard.writeText(name);
    setCopied(name);
    setTimeout(() => setCopied(null), 2000);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 mt-1"
      >
        <Search className="w-3 h-3" />
        <span>Find SuiNS names</span>
      </button>
    );
  }

  return (
    <div className="mt-2 bg-blue-50 border border-blue-200 rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1">
          <Search className="w-3 h-3 text-blue-600" />
          <span className="text-xs font-semibold text-blue-900">Find SuiNS Names</span>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="text-xs text-blue-600 hover:text-blue-800"
        >
          Close
        </button>
      </div>

      <div className="space-y-2 mb-3">
        <p className="text-xs text-blue-800">
          Try these names with addresses configured (click to use):
        </p>
        <div className="flex flex-wrap gap-1">
          {COMMON_NAMES.map((name) => (
            <button
              key={name}
              onClick={() => {
                onSelectName(name);
                setIsOpen(false);
              }}
              className="text-xs bg-white hover:bg-blue-100 border border-blue-300 text-blue-700 px-2 py-1 rounded transition-colors"
            >
              {name}
            </button>
          ))}
        </div>
      </div>

      <div className="border-t border-blue-200 pt-2 space-y-2">
        <p className="text-xs text-blue-800 font-medium">Browse registered names:</p>

        <a
          href="https://suins.io"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline"
        >
          <ExternalLink className="w-3 h-3" />
          <span>SuiNS Official Website</span>
        </a>

        <a
          href="https://suiscan.xyz/mainnet/names"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline"
        >
          <ExternalLink className="w-3 h-3" />
          <span>SuiScan Names Explorer</span>
        </a>

        <a
          href="https://suivision.xyz/names"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline"
        >
          <ExternalLink className="w-3 h-3" />
          <span>SuiVision Names</span>
        </a>
      </div>
    </div>
  );
}
