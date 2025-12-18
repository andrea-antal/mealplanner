import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  className?: string;
}

export function StatCard({ icon: Icon, label, value, className }: StatCardProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-4 rounded-2xl bg-card p-5 shadow-soft transition-all duration-300 hover:shadow-medium',
        className
      )}
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-secondary">
        <Icon className="h-6 w-6 text-secondary-foreground" />
      </div>
      <div>
        <p className="text-2xl font-display font-semibold text-foreground">{value}</p>
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}
