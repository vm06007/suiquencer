import { Maximize2, Minimize2, GitBranch, Moon, Sun, Save, FolderOpen, Upload, Plus, X } from 'lucide-react';
import { useState } from 'react';

interface Tab {
    id: string;
    name: string;
}

interface SidebarProps {
    isFullscreen: boolean;
    onToggleFullscreen: () => void;
    edgeType: 'default' | 'straight' | 'step' | 'smoothstep';
    onEdgeTypeChange: (type: 'default' | 'straight' | 'step' | 'smoothstep') => void;
    isDark: boolean;
    onToggleTheme: () => void;
    onSave: () => void;
    onLoad: () => void;
    onExport: () => void;
    tabs: Tab[];
    activeTabId: string;
    onTabChange: (tabId: string) => void;
    onTabClose: (tabId: string) => void;
    onTabAdd: () => void;
}

export function Sidebar({
    isFullscreen,
    onToggleFullscreen,
    edgeType,
    onEdgeTypeChange,
    isDark,
    onToggleTheme,
    onSave,
    onLoad,
    onExport,
    tabs,
    activeTabId,
    onTabChange,
    onTabClose,
    onTabAdd,
}: SidebarProps) {
    const [showEdgeMenu, setShowEdgeMenu] = useState(false);
    const [hoveredTab, setHoveredTab] = useState<string | null>(null);

    return (
        <div className="fixed left-0 top-0 h-screen w-16 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col items-center py-4 gap-2 z-50">
            {/* Logo */}
            <div className="mb-2">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-xl">S</span>
                </div>
            </div>

            {/* Divider */}
            <div className="w-10 h-px bg-gray-200 dark:bg-gray-700" />

            {/* Tabs Section */}
            <div className="flex flex-col gap-2 py-2">
                {tabs.map((tab, index) => (
                    <div
                        key={tab.id}
                        className="relative group"
                        onMouseEnter={() => setHoveredTab(tab.id)}
                        onMouseLeave={() => setHoveredTab(null)}
                    >
                        <button
                            onClick={() => onTabChange(tab.id)}
                            className={`w-10 h-10 flex items-center justify-center rounded-lg text-sm font-semibold transition-all ${
                                activeTabId === tab.id
                                    ? 'bg-blue-600 text-white shadow-lg scale-105'
                                    : 'bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700'
                            }`}
                            title={tab.name}
                        >
                            {index + 1}
                        </button>
                        {tabs.length > 1 && hoveredTab === tab.id && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onTabClose(tab.id);
                                }}
                                className="absolute -top-1 -right-1 w-4 h-4 flex items-center justify-center rounded-full bg-red-500 hover:bg-red-600 text-white shadow-lg"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        )}
                    </div>
                ))}
                {/* Add new tab button */}
                <button
                    onClick={onTabAdd}
                    className="w-10 h-10 flex items-center justify-center rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-blue-500 hover:text-blue-500 dark:hover:border-blue-500 dark:hover:text-blue-500 transition-colors"
                    title="New sequence"
                >
                    <Plus className="w-5 h-5" />
                </button>
            </div>

            {/* Divider */}
            <div className="w-10 h-px bg-gray-200 dark:bg-gray-700" />

            {/* File Operations & Tools */}
            <div className="flex flex-col gap-2">
                {/* Save to localStorage */}
                <button
                    onClick={onSave}
                    className="w-10 h-10 flex items-center justify-center rounded-lg text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    title="Save to memory"
                >
                    <Save className="w-5 h-5" />
                </button>

                {/* Load from file */}
                <button
                    onClick={onLoad}
                    className="w-10 h-10 flex items-center justify-center rounded-lg text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    title="Load from file"
                >
                    <FolderOpen className="w-5 h-5" />
                </button>

                {/* Export to file */}
                <button
                    onClick={onExport}
                    className="w-10 h-10 flex items-center justify-center rounded-lg text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    title="Export to file"
                >
                    <Upload className="w-5 h-5" />
                </button>

                {/* Divider */}
                <div className="w-10 h-px bg-gray-200 dark:bg-gray-700" />

                {/* Edge Style Selector */}
                <div className="relative">
                    <button
                        onClick={() => setShowEdgeMenu(!showEdgeMenu)}
                        className="w-10 h-10 flex items-center justify-center rounded-lg text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        title={`Edge Style: ${edgeType}`}
                    >
                        <GitBranch className="w-5 h-5" />
                    </button>

                    {/* Dropdown menu */}
                    {showEdgeMenu && (
                        <div className="absolute left-full ml-2 top-0 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-2 min-w-[140px]">
                            <div className="text-xs text-gray-500 dark:text-gray-400 mb-2 px-2">Edge Style</div>
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
                                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
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
                    className="w-10 h-10 flex items-center justify-center rounded-lg text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
                >
                    {isFullscreen ? (
                        <Minimize2 className="w-5 h-5" />
                    ) : (
                        <Maximize2 className="w-5 h-5" />
                    )}
                </button>
            </div>

            {/* Spacer to push dark mode to bottom */}
            <div className="flex-1" />

            {/* Dark mode toggle at bottom */}
            <div className="pt-2 border-t border-gray-200 dark:border-gray-700 w-full flex justify-center">
                <button
                    onClick={onToggleTheme}
                    className="w-10 h-10 flex items-center justify-center rounded-lg text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                >
                    {isDark ? (
                        <Sun className="w-5 h-5" />
                    ) : (
                        <Moon className="w-5 h-5" />
                    )}
                </button>
            </div>
        </div>
    );
}
