import { Home, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface BreadcrumbItem {
  id: string | null;
  name: string;
  path: string;
}

interface FolderBreadcrumbsProps {
  items: BreadcrumbItem[];
  onNavigate: (folderId: string | null) => void;
  className?: string;
}

export function FolderBreadcrumbs({ items, onNavigate, className }: FolderBreadcrumbsProps) {
  return (
    <nav 
      className={cn('flex items-center gap-1 text-sm', className)}
      aria-label="Breadcrumb"
    >
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onNavigate(null)}
        className="h-8 px-2 hover:bg-primary/10"
      >
        <Home className="h-4 w-4" />
      </Button>

      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        
        return (
          <div key={item.id || 'root'} className="flex items-center gap-1">
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            
            {isLast ? (
              <span className="px-2 py-1 font-medium text-foreground">
                {item.name}
              </span>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onNavigate(item.id)}
                className="h-8 px-2 hover:bg-primary/10 text-muted-foreground hover:text-foreground"
              >
                {item.name}
              </Button>
            )}
          </div>
        );
      })}
    </nav>
  );
}
