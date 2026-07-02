import { cn } from '../utils/cn';

export interface SpinnerProps {
  className?: string;
  size?: 'small' | 'large' | number;
  color?: string;
  'aria-label'?: string;
}

export function Spinner({ className, size = 'small', 'aria-label': ariaLabel }: SpinnerProps) {
  const dim = size === 'large' ? 'h-8 w-8 border-[3px]' : 'h-5 w-5 border-2';
  return (
    <span
      role="status"
      aria-label={ariaLabel ?? '加载中'}
      className={cn('inline-block animate-spin rounded-full border-primary border-t-transparent', dim, className)}
    />
  );
}
