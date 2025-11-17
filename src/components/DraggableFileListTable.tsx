import { useState } from 'react';
import { FileMetadata } from '@/services/files';
import { localFilesService, LocalFileMetadata } from '@/services/localFiles';
import { storageService } from '@/services/storage';
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { FolderOpen } from 'lucide-react';
import { ShareModal } from './ShareModal';
import { DraggableFileRow } from './DraggableFileRow';
import { toast } from '@/hooks/use-toast';

interface DraggableFileListTableProps {
  files: FileMetadata[];
  onRefresh: () => void;
  onFileMove?: (fileId: string, targetFolderId: string | null) => void;
}

export function DraggableFileListTable({ 
  files, 
  onRefresh,
  onFileMove 
}: DraggableFileListTableProps) {
  const [shareModalFile, setShareModalFile] = useState<LocalFileMetadata | null>(null);

  const handleDelete = async (file: FileMetadata) => {
    try {
      await storageService.deleteBlob(file.id);
      localFilesService.deleteFile(file.id);
      onRefresh();
      toast({
        title: "File Deleted",
        description: "File has been removed.",
      });
    } catch (error) {
      toast({
        title: "Delete Failed",
        description: "Could not delete file",
        variant: "destructive",
      });
    }
  };

  const handleShare = (file: FileMetadata) => {
    const localFile = localFilesService.getFile(file.id);
    if (localFile) {
      setShareModalFile(localFile);
    } else {
      const newLocalFile: LocalFileMetadata = {
        id: file.id,
        name: file.file_id || 'Unknown',
        size: 0,
        type: 'application/octet-stream',
        uploadedAt: file.uploadedAt,
        visibility: file.visibility,
        allowedWallets: file.allowedWallets,
      };
      localFilesService.saveFile(newLocalFile);
      setShareModalFile(newLocalFile);
    }
  };

  if (files.length === 0) {
    return (
      <div className="glass-effect p-16 rounded-2xl text-center border border-white/5">
        <div className="inline-flex p-4 rounded-2xl bg-primary/10 mb-4">
          <FolderOpen className="h-12 w-12 text-primary" />
        </div>
        <p className="text-muted-foreground text-lg">No files in this folder</p>
        <p className="text-sm text-muted-foreground mt-2">Upload files or drag them here</p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-xl glass-effect border border-white/10 overflow-hidden shadow-elevated animate-fade-in">
        <Table>
          <TableHeader>
            <TableRow className="bg-card/50 hover:bg-card/50">
              <TableHead className="w-8"></TableHead>
              <TableHead className="font-semibold">Name</TableHead>
              <TableHead className="font-semibold">Size</TableHead>
              <TableHead className="font-semibold">Uploaded</TableHead>
              <TableHead className="font-semibold">Visibility</TableHead>
              <TableHead className="text-right font-semibold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {files.map((file, index) => (
              <DraggableFileRow
                key={file.id}
                file={file}
                index={index}
                onShare={handleShare}
                onDelete={handleDelete}
                onMove={onFileMove}
              />
            ))}
          </TableBody>
        </Table>
      </div>

      {shareModalFile && (
        <ShareModal
          file={shareModalFile}
          onClose={() => setShareModalFile(null)}
          onUpdate={onRefresh}
        />
      )}
    </>
  );
}
