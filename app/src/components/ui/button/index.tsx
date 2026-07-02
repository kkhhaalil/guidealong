import { forwardRef, type ButtonHTMLAttributes, type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '../utils/cn';

type ButtonAction = 'primary' | 'secondary' | 'positive' | 'negative' | 'default';
type ButtonVariant = 'solid' | 'outline' | 'link';
type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

const actionClasses: Record<ButtonAction, string> = {
  primary: 'bg-primary text-primary-foreground hover:opacity-90 active:opacity-90',
  secondary: 'bg-secondary text-secondary-foreground hover:opacity-90 active:opacity-90',
  positive: 'bg-success text-white hover:opacity-90 active:opacity-90',
  negative: 'bg-danger text-white hover:opacity-90 active:opacity-90',
  default: 'bg-primary text-primary-foreground hover:opacity-90 active:opacity-90',
};

const sizeClasses: Record<ButtonSize, string> = {
  xs: 'min-h-12 min-w-12 px-3 text-xs rounded-chip',
  sm: 'min-h-12 min-w-12 px-3 text-sm rounded-card',
  md: 'min-h-12 px-4 text-body-md rounded-card',
  lg: 'min-h-12 px-6 text-body-lg rounded-poster',
  xl: 'min-h-14 min-w-14 px-8 text-title-md rounded-poster',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  action?: ButtonAction;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  onPress?: () => void;
  testID?: string;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    action = 'primary',
    variant = 'solid',
    size = 'md',
    className,
    onPress,
    onClick,
    testID,
    children,
    ...props
  },
  ref
) {
  return (
    <button
      ref={ref}
      type="button"
      data-testid={testID}
      className={cn(
        'inline-flex items-center justify-center gap-2 font-sans font-medium transition-opacity duration-normal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:opacity-40',
        variant === 'outline' && 'border border-border bg-transparent text-ink hover:bg-secondary/40',
        variant === 'link' && 'bg-transparent underline-offset-4 hover:underline text-primary',
        variant === 'solid' && actionClasses[action],
        sizeClasses[size],
        className
      )}
      onClick={onPress ?? onClick}
      {...props}
    >
      {children}
    </button>
  );
});

export function ButtonText({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span className={cn('select-none', className)} {...props}>
      {children}
    </span>
  );
}

export function ButtonSpinner({ className }: { className?: string }) {
  return (
    <span
      className={cn('inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent', className)}
      aria-hidden
    />
  );
}

export function ButtonIcon({ className, children }: { className?: string; children?: ReactNode }) {
  return <span className={cn('shrink-0', className)}>{children}</span>;
}

export function ButtonGroup({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('flex flex-col gap-3', className)} {...props}>
      {children}
    </div>
  );
}
