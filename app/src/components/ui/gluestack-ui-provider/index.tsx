import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../utils/cn';

export type ModeType = 'light' | 'dark' | 'system';

export function GluestackUIProvider({
  children,
  mode = 'system',
}: {
  children?: ReactNode;
  mode?: ModeType;
}) {
  return (
    <div data-theme-mode={mode} className="contents">
      {children}
    </div>
  );
}

export function Box({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn(className)} {...props}>
      {children}
    </div>
  );
}
