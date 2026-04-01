import type { ReactNode, ButtonHTMLAttributes } from 'react';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
}

const variants = {
  primary:
    'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-md hover:shadow-lg active:scale-[0.98]',
  secondary:
    'bg-white/80 border border-gray-200 text-gray-700 hover:bg-gray-50 shadow-sm',
  ghost: 'text-gray-500 hover:text-gray-700 hover:bg-gray-100',
};

const sizes = {
  sm: 'px-3 py-1 text-xs rounded-lg',
  md: 'px-4 py-2 text-sm rounded-xl',
  lg: 'px-6 py-2.5 text-base rounded-xl',
};

export default function Button({
  variant = 'secondary',
  size = 'md',
  className = '',
  children,
  ...props
}: Props) {
  return (
    <button
      className={`font-medium transition-all inline-flex items-center justify-center gap-1.5 ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
