import { useState } from 'react';
import { Search, ChevronDown, ChevronUp } from 'lucide-react';

interface PackageHelperProps {
  onSelectPackage: (packageId: string) => void;
}

const KNOWN_PACKAGES = [
  {
    name: 'Sui Framework',
    shortId: '0x2',
    fullId: '0x0000000000000000000000000000000000000000000000000000000000000002',
    description: 'Core Sui system modules (clock, coin, etc.)',
  },
  {
    name: 'Move Standard Library',
    shortId: '0x1',
    fullId: '0x0000000000000000000000000000000000000000000000000000000000000001',
    description: 'Standard Move library (option, vector, etc.)',
  },
  {
    name: 'USDC',
    shortId: 'USDC',
    fullId: '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7',
    description: 'Native Circle USDC on Sui',
  },
  {
    name: 'USDT',
    shortId: 'USDT',
    fullId: '0x375f70cf2ae4c00bf37117d0c85a2c71545e6ee05c4a5c7d282cd66a4504b068',
    description: 'Native USDT on Sui',
  },
  {
    name: 'Cetus Protocol',
    shortId: 'Cetus',
    fullId: '0x1eabed72c53feb3805120a081dc15963c204dc8d091542592abaf7a35689b2fb',
    description: 'Cetus DEX and pools',
  },
  {
    name: 'DeepBook',
    shortId: 'DeepBook',
    fullId: '0x000000000000000000000000000000000000000000000000000000000000dee9',
    description: 'DeepBook order book DEX',
  },
] as const;

export function PackageHelper({ onSelectPackage }: PackageHelperProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredPackages = KNOWN_PACKAGES.filter(
    (pkg) =>
      pkg.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pkg.shortId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pkg.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="mt-2">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 text-xs text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors"
      >
        <Search className="w-3 h-3" />
        <span>Browse known packages</span>
        {isOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>

      {isOpen && (
        <div className="mt-2 border border-purple-200 dark:border-purple-800 rounded-lg bg-purple-50 dark:bg-purple-900/20 p-2">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search packages..."
            className="w-full px-2 py-1 text-xs border border-purple-300 dark:border-purple-700 dark:bg-gray-800 dark:text-gray-100 rounded mb-2 focus:outline-none focus:border-purple-500"
          />

          <div className="space-y-1 max-h-48 overflow-y-auto">
            {filteredPackages.length > 0 ? (
              filteredPackages.map((pkg) => (
                <button
                  key={pkg.fullId}
                  onClick={() => {
                    onSelectPackage(pkg.fullId);
                    setIsOpen(false);
                    setSearchTerm('');
                  }}
                  className="w-full text-left px-2 py-1.5 rounded hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-purple-900 dark:text-purple-100">
                        {pkg.name}
                      </div>
                      <div className="text-[10px] text-gray-600 dark:text-gray-400 truncate">
                        {pkg.description}
                      </div>
                    </div>
                    <div className="text-[10px] font-mono text-purple-600 dark:text-purple-400 bg-white dark:bg-gray-800 px-1.5 py-0.5 rounded">
                      {pkg.shortId}
                    </div>
                  </div>
                </button>
              ))
            ) : (
              <div className="text-xs text-gray-500 text-center py-2">No packages found</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
