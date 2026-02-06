import { MoreVertical, Trash2, RotateCcw, Settings } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

interface NodeMenuProps {
  onDelete: (e: React.MouseEvent) => void;
  onReplace?: (e: React.MouseEvent) => void;
  onSettings?: (e: React.MouseEvent) => void;
  showReplace?: boolean;
  showSettings?: boolean;
  isDark?: boolean;
}

export function NodeMenu({ onDelete, onReplace, onSettings, showReplace = true, showSettings = false, isDark = true }: NodeMenuProps) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          onClick={(e) => e.stopPropagation()}
          className={`hover:bg-white/20 rounded p-1 transition-colors ${
            isDark ? 'text-white' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
          aria-label="Node options"
        >
          <MoreVertical className="w-4 h-4" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="min-w-[180px] bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-1 z-50"
          sideOffset={5}
        >
          {showSettings && onSettings && (
            <DropdownMenu.Item
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 rounded hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer outline-none"
              onClick={(e) => {
                e.stopPropagation();
                onSettings(e as React.MouseEvent);
              }}
            >
              <Settings className="w-4 h-4" />
              <span>Settings</span>
            </DropdownMenu.Item>
          )}
          {showReplace && onReplace && (
            <DropdownMenu.Item
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 rounded hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer outline-none"
              onClick={(e) => {
                e.stopPropagation();
                onReplace(e as React.MouseEvent);
              }}
            >
              <RotateCcw className="w-4 h-4" />
              <span>Replace Node</span>
            </DropdownMenu.Item>
          )}
          <DropdownMenu.Item
            className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 rounded hover:bg-red-50 dark:hover:bg-red-900/20 cursor-pointer outline-none"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(e as React.MouseEvent);
            }}
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete Node</span>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
