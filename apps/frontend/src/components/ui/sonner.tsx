import type * as React from 'react';
import { Toaster as Sonner, type ToasterProps } from 'sonner';

function Toaster({ ...props }: ToasterProps) {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      style={
        {
          '--normal-bg': 'var(--card)',
          '--normal-text': 'var(--foreground)',
          '--normal-border': 'var(--border)',
          '--success-bg': 'var(--secondary)',
          '--success-text': 'var(--secondary-foreground)',
          '--error-bg': 'var(--destructive)',
          '--error-text': 'var(--destructive-foreground)',
        } as React.CSSProperties
      }
      {...props}
    />
  );
}

export { Toaster };
