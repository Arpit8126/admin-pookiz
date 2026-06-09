'use client';

import React from 'react';
import Spinner from '@/components/ui/Spinner';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  children: React.ReactNode;
}

// DESIGN.md: All CTAs are pill-shaped. Primary = black, Secondary = white+border.
const variantStyles: Record<ButtonVariant, string> = {
  primary: [
    'bg-[#000000] text-white',
    'hover:opacity-85',
    'active:scale-[0.98]',
    'disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none',
    'shadow-[0_4px_16px_rgba(0,0,0,0.10)]',
  ].join(' '),
  secondary: [
    'bg-white text-[#000000] border border-[#000000]',
    'hover:bg-[#f7f7f5]',
    'active:scale-[0.98]',
    'disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none',
  ].join(' '),
  ghost: [
    'bg-transparent text-[#000000]',
    'hover:bg-[#f7f7f5]',
    'active:bg-[#f1f1f1]',
    'disabled:text-[#999] disabled:bg-transparent disabled:cursor-not-allowed',
  ].join(' '),
  danger: [
    'bg-red-600 text-white',
    'hover:bg-red-500',
    'active:scale-[0.98]',
    'disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none',
    'shadow-[0_4px_16px_rgba(220,38,38,0.15)]',
  ].join(' '),
};

// DESIGN.md: rounded-pill (50px) for all text CTAs.
const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-4 py-1.5 text-sm rounded-[50px] gap-1.5',
  md: 'px-6 py-2.5 text-base rounded-[50px] gap-2',
  lg: 'px-8 py-3.5 text-base rounded-[50px] gap-2.5',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  disabled,
  children,
  className = '',
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      disabled={isDisabled}
      className={`
        inline-flex items-center justify-center font-[480] tracking-[-0.1px]
        transition-all duration-200 ease-out
        focus:outline-none focus-visible:ring-2 focus-visible:ring-black/30 focus-visible:ring-offset-2 focus-visible:ring-offset-white
        whitespace-nowrap select-none cursor-pointer border border-transparent
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      {...props}
    >
      {loading && <Spinner size={size === 'lg' ? 'md' : 'sm'} />}
      {children}
    </button>
  );
}
