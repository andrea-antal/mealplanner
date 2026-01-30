import { Snowflake, Package } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StorageTagProps {
  location: 'fridge' | 'pantry' | undefined;
  className?: string;
}

export function StorageTag({ location, className }: StorageTagProps) {
  const isFridge = location === 'fridge' || !location; // Default to fridge

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-xs text-muted-foreground px-1.5 sm:px-2 py-0.5 rounded-full bg-muted/50',
        className
      )}
      title={isFridge ? 'Fridge' : 'Pantry'}
    >
      {isFridge ? (
        <>
          <Snowflake className="h-3 w-3" />
          <span className="hidden sm:inline">Fridge</span>
        </>
      ) : (
        <>
          <Package className="h-3 w-3" />
          <span className="hidden sm:inline">Pantry</span>
        </>
      )}
    </span>
  );
}
