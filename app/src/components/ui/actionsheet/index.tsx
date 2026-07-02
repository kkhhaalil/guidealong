import { type ReactNode, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { t } from '../../../i18n';
import { cn } from '../utils/cn';

export interface ActionsheetProps {
  isOpen: boolean;
  onClose: () => void;
  children?: ReactNode;
  className?: string;
}

export function Actionsheet({ isOpen, onClose, children, className }: ActionsheetProps) {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-sheet flex items-end justify-center">
      <button
        type="button"
        className="absolute inset-0 bg-ink/40"
        aria-label={t('ariaClose')}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          'relative z-sheet w-full max-w-lg rounded-t-poster bg-surface p-4 shadow-poster',
          className
        )}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}

export function ActionsheetBackdrop({ onPress }: { onPress?: () => void }) {
  return <button type="button" className="absolute inset-0" aria-hidden onClick={onPress} />;
}

export function ActionsheetContent({
  className,
  children,
}: {
  className?: string;
  children?: ReactNode;
}) {
  return <div className={cn(className)}>{children}</div>;
}

export function ActionsheetItem({
  className,
  children,
  onPress,
}: {
  className?: string;
  children?: ReactNode;
  onPress?: () => void;
}) {
  return (
    <button
      type="button"
      className={cn('flex min-h-12 w-full items-center px-4 text-left text-body-md text-ink', className)}
      onClick={onPress}
    >
      {children}
    </button>
  );
}

export function ActionsheetDragIndicator() {
  return <div className="mx-auto mb-3 h-1 w-10 rounded-chip bg-border" aria-hidden />;
}
