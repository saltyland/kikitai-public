import * as React from 'react';
import { cn } from '@/lib/utils';

type Variant = 'default' | 'secondary' | 'outline' | 'ghost' | 'destructive';
type Size = 'sm' | 'md' | 'lg' | 'icon';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variants: Record<Variant, string> = {
  default:
    'btn-3d bg-gradient-to-b from-brand-500 to-brand-600 text-white hover:from-brand-400 hover:to-brand-600 [--btn-edge:var(--color-brand-800)]',
  secondary:
    'btn-3d bg-gradient-to-b from-white to-brand-50 text-brand-700 [--btn-edge:var(--color-brand-200)]',
  outline:
    'border-2 border-slate-200 bg-white text-slate-700 hover:border-brand-300 hover:text-brand-700 transition-colors rounded-2xl inline-flex items-center justify-center gap-2 font-bold',
  ghost:
    'text-slate-600 hover:bg-white/70 transition-colors rounded-2xl inline-flex items-center justify-center gap-2 font-bold',
  destructive:
    'btn-3d bg-gradient-to-b from-red-500 to-red-600 text-white [--btn-edge:var(--color-red-800)]',
};

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-11 px-5 text-sm',
  lg: 'h-13 px-7 py-3.5 text-base',
  icon: 'h-9 w-9',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'md', ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-2xl font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  )
);
Button.displayName = 'Button';
