import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '../utils/cn';

type TextSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl';

const sizeClasses: Record<TextSize, string> = {
  '2xs': 'text-body-sm',
  xs: 'text-body-sm',
  sm: 'text-body-sm',
  md: 'text-body-md',
  lg: 'text-body-lg',
  xl: 'text-title-md',
  '2xl': 'text-title-lg',
  '3xl': 'text-display-md',
  '4xl': 'text-display-lg',
  '5xl': 'text-display-xl',
  '6xl': 'text-display-xl',
};

export interface TextProps extends HTMLAttributes<HTMLParagraphElement> {
  size?: TextSize;
  bold?: boolean;
  underline?: boolean;
  strikeThrough?: boolean;
  italic?: boolean;
  isTruncated?: boolean;
  sub?: boolean;
  highlight?: boolean;
  className?: string;
}

export const Text = forwardRef<HTMLParagraphElement, TextProps>(function Text(
  { size = 'md', bold, underline, strikeThrough, italic, isTruncated, className, children, ...props },
  ref
) {
  return (
    <p
      ref={ref}
      className={cn(
        sizeClasses[size],
        bold && 'font-semibold',
        underline && 'underline',
        strikeThrough && 'line-through',
        italic && 'italic',
        isTruncated && 'truncate',
        className
      )}
      {...props}
    >
      {children}
    </p>
  );
});
