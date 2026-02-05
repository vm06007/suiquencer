import { Maximize2, Minimize2, GitBranch } from 'lucide-react';
import { useState } from 'react';

interface SidebarProps {
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  edgeType: 'default' | 'straight' | 'step' | 'smoothstep';
  onEdgeTypeChange: (type: 'default' | 'straight' | 'step' | 'smoothstep') => void;
}

export function Sidebar({
  isFullscreen,
  onToggleFullscreen,
  edgeType,
  onEdgeTypeChange,
}: SidebarProps) {
  const [showEdgeMenu, setShowEdgeMenu] = useState(false);
  return (
    <div className="fixed left-0 top-0 h-screen w-16 bg-gray-900 border-r border-gray-700 flex flex-col items-center py-4 gap-4 z-50">
      {/* Logo */}
      <div className="mb-4">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-xl">S</span>
        </div>
      </div>

      {/* Divider */}
      <div className="w-10 h-px bg-gray-700" />

      {/* Tools */}
      <div className="flex flex-col gap-2">
        {/* Edge Style Selector */}
        <div className="relative">
          <button
            onClick={() => setShowEdgeMenu(!showEdgeMenu)}
            className="w-10 h-10 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
            title={`Edge Style: ${edgeType}`}
          >
            <GitBranch className="w-5 h-5" />
          </button>

          {/* Dropdown menu */}
          {showEdgeMenu && (
            <div className="absolute left-full ml-2 top-0 bg-gray-800 rounded-lg shadow-lg p-2 min-w-[140px]">
              <div className="text-xs text-gray-400 mb-2 px-2">Edge Style</div>
              {['default', 'straight', 'step', 'smoothstep'].map((type) => (
                <button
                  key={type}
                  onClick={() => {
                    onEdgeTypeChange(type as any);
                    setShowEdgeMenu(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded text-sm capitalize transition-colors ${
                    edgeType === type
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Fullscreen Toggle */}
        <button
          onClick={onToggleFullscreen}
          className="w-10 h-10 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
        >
          {isFullscreen ? (
            <Minimize2 className="w-5 h-5" />
          ) : (
            <Maximize2 className="w-5 h-5" />
          )}
        </button>
      </div>
    </div>
  );
}
