import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '../utils/cn';

export interface SwitchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  onValueChange?: (value: boolean) => void;
}

export const Switch = forwardRef<HTMLInputElement, SwitchProps>(function Switch(
  { className, size = 'md', onValueChange, onChange, ...props },
  ref
) {
  return (
    <label
      className={cn(
        'relative inline-flex cursor-pointer items-center',
        size === 'sm' && 'h-5 w-9',
        size === 'md' && 'h-6 w-11',
        size === 'lg' && 'h-7 w-14',
        className
      )}
    >
      <input
        ref={ref}
        type="checkbox"
        role="switch"
        className="peer sr-only"
        onChange={(e) => {
          onChange?.(e);
          onValueChange?.(e.target.checked);
        }}
        {...props}
      />
      <span className="absolute inset-0 rounded-chip bg-secondary transition-colors peer-checked:bg-primary peer-focus-visible:ring-2 peer-focus-visible:ring-primary" />
      <span
        className={cn(
          'absolute left-0.5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-full',
          size === 'sm' && 'h-4 w-4 peer-checked:-translate-x-0.5',
          size === 'md' && 'h-5 w-5',
          size === 'lg' && 'h-6 w-6'
        )}
      />
    </label>
  );
});
