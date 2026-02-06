import { useState } from 'react';
import { Search, ExternalLink } from 'lucide-react';

interface ENSHelperProps {
  onSelectName: (name: string) => void;
}

// Famous ENS names that are well-known
const COMMON_NAMES = [
  'vitalik.eth',
  'nick.eth',
  'brantly.eth',
  'dao.eth',
  'ethereum.eth',
  'uniswap.eth',
];

export function ENSHelper({ onSelectName }: ENSHelperProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="text-xs text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 flex items-center gap-1 mt-1"
      >
        <Search className="w-3 h-3" />
        <span>Find ENS names</span>
      </button>
    );
  }

  return (
    <div className="mt-2 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1">
          <Search className="w-3 h-3 text-purple-600 dark:text-purple-400" />
          <span className="text-xs font-semibold text-purple-900 dark:text-purple-100">Find ENS Names</span>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="text-xs text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-200"
        >
          Close
        </button>
      </div>

      <div className="space-y-2 mb-3">
        <p className="text-xs text-purple-800 dark:text-purple-200">
          Try these famous ENS names (click to use):
        </p>
        <div className="flex flex-wrap gap-1">
          {COMMON_NAMES.map((name) => (
            <button
              key={name}
              onClick={() => {
                onSelectName(name);
                setIsOpen(false);
              }}
              className="text-xs bg-white dark:bg-gray-700 hover:bg-purple-100 dark:hover:bg-purple-900/40 border border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300 px-2 py-1 rounded transition-colors"
            >
              {name}
            </button>
          ))}
        </div>
      </div>

      <div className="border-t border-purple-200 dark:border-purple-800 pt-2 space-y-2">
        <p className="text-xs text-purple-800 dark:text-purple-200 font-medium">Browse registered names:</p>

        <a
          href="https://ens.domains"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-200 hover:underline"
        >
          <ExternalLink className="w-3 h-3" />
          <span>ENS Official Website</span>
        </a>

        <a
          href="https://etherscan.io/enslookup"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-200 hover:underline"
        >
          <ExternalLink className="w-3 h-3" />
          <span>Etherscan ENS Lookup</span>
        </a>

        <a
          href="https://app.ens.domains"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-200 hover:underline"
        >
          <ExternalLink className="w-3 h-3" />
          <span>ENS App</span>
        </a>
      </div>
    </div>
  );
}
