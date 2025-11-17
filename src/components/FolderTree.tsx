import { useState, useRef } from 'react';
import { useDrop } from 'react-dnd';
import { Folder, FolderOpen, ChevronRight, ChevronDown, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface FolderNode {
  id: string;
  name: string;
  parentId: string | null;
  path: string;
  color?: string;
  children?: FolderNode[];
}

interface FolderTreeProps {
  folders: FolderNode[];
  selectedFolderId?: string | null;
  onFolderSelect: (folderId: string | null) => void;
  onCreateFolder?: (parentId: string | null) => void;
  onFileDrop?: (fileId: string, targetFolderId: string | null) => void;
}

interface DragItem {
  type: string;
  fileId: string;
  index: number;
}

const DRAG_TYPE = 'FILE';

export function FolderTree({ 
  folders, 
  selectedFolderId, 
  onFolderSelect,
  onCreateFolder,
  onFileDrop 
}: FolderTreeProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  // Build folder hierarchy
  const buildTree = (folders: FolderNode[]): FolderNode[] => {
    const folderMap = new Map<string, FolderNode>();
    const rootFolders: FolderNode[] = [];

    // Create map of all folders
    folders.forEach(folder => {
      folderMap.set(folder.id, { ...folder, children: [] });
    });

    // Build tree structure
    folders.forEach(folder => {
      const node = folderMap.get(folder.id);
      if (!node) return;

      if (!folder.parentId) {
        rootFolders.push(node);
      } else {
        const parent = folderMap.get(folder.parentId);
        if (parent) {
          parent.children = parent.children || [];
          parent.children.push(node);
        }
      }
    });

    return rootFolders;
  };

  const toggleFolder = (folderId: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  const renderFolder = (folder: FolderNode, depth: number = 0) => {
    const isExpanded = expandedFolders.has(folder.id);
    const isSelected = selectedFolderId === folder.id;
    const hasChildren = folder.children && folder.children.length > 0;
    const ref = useRef<HTMLDivElement>(null);

    const [{ isOver, canDrop }, drop] = useDrop({
      accept: DRAG_TYPE,
      drop: (item: DragItem) => {
        if (onFileDrop) {
          onFileDrop(item.fileId, folder.id);
        }
      },
      collect: (monitor) => ({
        isOver: monitor.isOver(),
        canDrop: monitor.canDrop(),
      }),
    });

    drop(ref);

    return (
      <div key={folder.id}>
        <div
          ref={ref}
          className={cn(
            'flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-all duration-200 group',
            isSelected 
              ? 'bg-primary/20 text-primary font-medium' 
              : 'hover:bg-primary/5 text-foreground',
            isOver && canDrop && 'bg-primary/30 ring-2 ring-primary',
          )}
          style={{ paddingLeft: `${depth * 1.5 + 0.5}rem` }}
          onClick={() => onFolderSelect(folder.id)}
        >
          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleFolder(folder.id);
              }}
              className="p-0.5 hover:bg-primary/10 rounded transition-colors"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
          )}
          {!hasChildren && <div className="w-5" />}
          
          <div 
            className="p-1 rounded"
            style={{ 
              backgroundColor: folder.color ? `${folder.color}20` : undefined 
            }}
          >
            {isExpanded ? (
              <FolderOpen 
                className="h-4 w-4" 
                style={{ color: folder.color || 'currentColor' }}
              />
            ) : (
              <Folder 
                className="h-4 w-4" 
                style={{ color: folder.color || 'currentColor' }}
              />
            )}
          </div>
          
          <span className="flex-1 text-sm truncate">{folder.name}</span>
          
          {onCreateFolder && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                onCreateFolder(folder.id);
              }}
              title="Create subfolder"
            >
              <Plus className="h-3 w-3" />
            </Button>
          )}
        </div>

        {isExpanded && hasChildren && (
          <div>
            {folder.children!.map(child => renderFolder(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const tree = buildTree(folders);
  const rootRef = useRef<HTMLDivElement>(null);

  const [{ isOver: isRootOver, canDrop: canDropRoot }, dropRoot] = useDrop({
    accept: DRAG_TYPE,
    drop: (item: DragItem) => {
      if (onFileDrop) {
        onFileDrop(item.fileId, null);
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  });

  dropRoot(rootRef);

  return (
    <div className="space-y-1">
      {/* Root folder */}
      <div
        ref={rootRef}
        className={cn(
          'flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-all duration-200 group',
          selectedFolderId === null 
            ? 'bg-primary/20 text-primary font-medium' 
            : 'hover:bg-primary/5 text-foreground',
          isRootOver && canDropRoot && 'bg-primary/30 ring-2 ring-primary',
        )}
        onClick={() => onFolderSelect(null)}
      >
        <Folder className="h-4 w-4 ml-5" />
        <span className="flex-1 text-sm">All Files</span>
        {onCreateFolder && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              onCreateFolder(null);
            }}
            title="Create folder"
          >
            <Plus className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Folder tree */}
      {tree.map(folder => renderFolder(folder))}
    </div>
  );
}
