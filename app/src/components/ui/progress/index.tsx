import { cn } from '../utils/cn';
import { t } from '../../../i18n';

export interface ProgressProps {
  value?: number;
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  orientation?: 'horizontal' | 'vertical';
  /** Override default Chinese aria-label (播放进度). */
  ariaLabel?: string;
}

export function Progress({ value = 0, className, orientation = 'horizontal', ariaLabel }: ProgressProps) {
  const pct = Math.min(100, Math.max(0, value));
  return (
    <div
      role="progressbar"
      aria-label={ariaLabel ?? t('ariaProgress')}
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn(
        'overflow-hidden rounded-chip bg-secondary',
        orientation === 'horizontal' ? 'h-2 w-full' : 'h-24 w-2',
        className
      )}
    >
      <div
        className={cn('bg-primary transition-all', orientation === 'horizontal' ? 'h-full' : 'w-full')}
        style={orientation === 'horizontal' ? { width: `${pct}%` } : { height: `${pct}%` }}
      />
    </div>
  );
}
