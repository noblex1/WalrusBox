import { useState } from 'react';
import { Folder, Palette } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface NewFolderModalProps {
  open: boolean;
  parentFolderId: string | null;
  parentFolderName?: string;
  onClose: () => void;
  onCreateFolder: (name: string, color: string, parentId: string | null) => Promise<void>;
}

const FOLDER_COLORS = [
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Green', value: '#10b981' },
  { name: 'Yellow', value: '#f59e0b' },
  { name: 'Red', value: '#ef4444' },
  { name: 'Purple', value: '#8b5cf6' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'Indigo', value: '#6366f1' },
  { name: 'Teal', value: '#14b8a6' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Gray', value: '#6b7280' },
];

export function NewFolderModal({
  open,
  parentFolderId,
  parentFolderName,
  onClose,
  onCreateFolder,
}: NewFolderModalProps) {
  const [folderName, setFolderName] = useState('');
  const [selectedColor, setSelectedColor] = useState(FOLDER_COLORS[0].value);
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    if (!folderName.trim()) return;

    setIsCreating(true);
    try {
      await onCreateFolder(folderName.trim(), selectedColor, parentFolderId);
      setFolderName('');
      setSelectedColor(FOLDER_COLORS[0].value);
      onClose();
    } catch (error) {
      console.error('Failed to create folder:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    if (!isCreating) {
      setFolderName('');
      setSelectedColor(FOLDER_COLORS[0].value);
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="glass-effect border-primary/20">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Folder className="h-5 w-5 text-primary" />
            Create New Folder
          </DialogTitle>
          <DialogDescription>
            {parentFolderId 
              ? `Create a new folder inside "${parentFolderName}"`
              : 'Create a new folder in the root directory'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="folderName">Folder Name</Label>
            <Input
              id="folderName"
              placeholder="Enter folder name"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleCreate()}
              className="glass-effect"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Folder Color
            </Label>
            <div className="grid grid-cols-5 gap-2">
              {FOLDER_COLORS.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => setSelectedColor(color.value)}
                  className={cn(
                    'h-10 rounded-lg border-2 transition-all duration-200 hover:scale-110',
                    selectedColor === color.value
                      ? 'border-primary shadow-glow-sm scale-105'
                      : 'border-transparent hover:border-primary/30'
                  )}
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                  aria-label={color.name}
                />
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="p-4 rounded-lg bg-primary/5 border border-primary/10">
            <p className="text-xs text-muted-foreground mb-2">Preview:</p>
            <div className="flex items-center gap-2">
              <div 
                className="p-2 rounded"
                style={{ backgroundColor: `${selectedColor}20` }}
              >
                <Folder 
                  className="h-5 w-5" 
                  style={{ color: selectedColor }}
                />
              </div>
              <span className="font-medium">
                {folderName.trim() || 'New Folder'}
              </span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isCreating}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!folderName.trim() || isCreating}
            className="bg-gradient-primary hover:shadow-glow"
          >
            {isCreating ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Creating...
              </span>
            ) : (
              'Create Folder'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
