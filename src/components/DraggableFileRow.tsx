import { useRef } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { useNavigate } from 'react-router-dom';
import { FileMetadata } from '@/services/files';
import { localFilesService, LocalFileMetadata } from '@/services/localFiles';
import { TableCell, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, Share2, Trash2, Lock, Unlock, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DraggableFileRowProps {
  file: FileMetadata;
  index: number;
  onShare: (file: FileMetadata) => void;
  onDelete: (file: FileMetadata) => void;
  onMove?: (fileId: string, targetFolderId: string | null) => void;
}

interface DragItem {
  type: string;
  fileId: string;
  index: number;
}

const DRAG_TYPE = 'FILE';

export function DraggableFileRow({ 
  file, 
  index, 
  onShare, 
  onDelete,
  onMove 
}: DraggableFileRowProps) {
  const navigate = useNavigate();
  const ref = useRef<HTMLTableRowElement>(null);

  const [{ isDragging }, drag, preview] = useDrag({
    type: DRAG_TYPE,
    item: { type: DRAG_TYPE, fileId: file.id, index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [{ isOver }, drop] = useDrop({
    accept: DRAG_TYPE,
    hover: (item: DragItem) => {
      if (!ref.current) return;
      
      const dragIndex = item.index;
      const hoverIndex = index;

      if (dragIndex === hoverIndex) return;
      
      // Update the index for visual feedback
      item.index = hoverIndex;
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  });

  // Combine drag and drop refs
  preview(drop(ref));

  const localFile = localFilesService.getFile(file.id);

  return (
    <TableRow
      ref={ref}
      className={cn(
        'hover:bg-primary/5 transition-colors duration-200 border-white/5 animate-fade-in',
        isDragging && 'opacity-50',
        isOver && 'bg-primary/10'
      )}
      style={{ 
        animationDelay: `${index * 0.05}s`,
        cursor: isDragging ? 'grabbing' : 'grab'
      }}
    >
      <TableCell className="w-8">
        <div ref={drag} className="cursor-grab active:cursor-grabbing">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
      </TableCell>
      <TableCell className="font-medium">{file.file_id || 'Unknown'}</TableCell>
      <TableCell className="text-muted-foreground">
        {localFile?.size 
          ? localFilesService.formatFileSize(localFile.size)
          : 'Unknown'}
      </TableCell>
      <TableCell className="text-muted-foreground">
        {file.uploadedAt.toLocaleDateString()}
      </TableCell>
      <TableCell>
        <Badge 
          variant={file.visibility === 'public' ? 'default' : 'secondary'}
          className="gap-1.5 font-medium"
        >
          {file.visibility === 'public' ? (
            <Unlock className="h-3 w-3" />
          ) : (
            <Lock className="h-3 w-3" />
          )}
          {file.visibility}
        </Badge>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(`/file/${file.id}`)}
            className="hover:bg-primary/10 hover:text-primary transition-all duration-200 hover:scale-110"
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onShare(file)}
            className="hover:bg-primary/10 hover:text-primary transition-all duration-200 hover:scale-110"
          >
            <Share2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(file)}
            className="hover:bg-destructive/10 hover:text-destructive transition-all duration-200 hover:scale-110"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
