import { cn } from '../utils/cn';

type BadgeAction = 'error' | 'warning' | 'success' | 'info' | 'muted';
type BadgeVariant = 'solid' | 'outline';
type BadgeSize = 'sm' | 'md' | 'lg';

const actionClasses: Record<BadgeAction, string> = {
  error: 'bg-danger text-white',
  warning: 'bg-warn text-ink',
  success: 'bg-success text-white',
  info: 'bg-poster-sky text-ink',
  muted: 'bg-secondary text-secondary-foreground',
};

export interface BadgeProps {
  action?: BadgeAction;
  variant?: BadgeVariant;
  size?: BadgeSize;
  className?: string;
  children?: React.ReactNode;
}

export function Badge({
  action = 'muted',
  variant = 'solid',
  size = 'md',
  className,
  children,
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-chip font-medium',
        size === 'sm' && 'px-2 py-0.5 text-body-sm',
        size === 'md' && 'px-2.5 py-1 text-label-md',
        size === 'lg' && 'px-3 py-1.5 text-body-md',
        variant === 'outline' && 'border border-border bg-transparent text-ink',
        variant === 'solid' && actionClasses[action],
        className
      )}
    >
      {children}
    </span>
  );
}

export function BadgeText({ className, children }: { className?: string; children?: React.ReactNode }) {
  return <span className={cn(className)}>{children}</span>;
}
