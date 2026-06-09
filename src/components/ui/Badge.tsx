'use client';

import React from 'react';

type BadgeVariant = 'admin' | 'coadmin' | 'mod' | 'member';

interface BadgeProps {
  variant?: BadgeVariant;
  children?: React.ReactNode;
  className?: string;
}

// DESIGN.md: badges use semantic role colors. member uses surface-soft + hairline border (no purple).
const variantStyles: Record<BadgeVariant, string> = {
  admin: [
    'bg-red-50 text-red-600 border-red-200',
  ].join(' '),
  coadmin: 'bg-orange-50 text-orange-600 border-orange-200',
  mod:     'bg-amber-50 text-amber-700 border-amber-200',
  member:  'bg-[#f7f7f5] text-[#000000] border-[#e6e6e6]',
};

const defaultLabels: Record<BadgeVariant, string> = {
  admin:   'Admin',
  coadmin: 'Co-Admin',
  mod:     'Moderator',
  member:  'Member',
};

export default function Badge({
  variant = 'member',
  children,
  className = '',
}: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center
        px-2.5 py-0.5 rounded-[50px] text-[11px] font-[540] uppercase tracking-wider
        border transition-all duration-200
        ${variantStyles[variant]}
        ${className}
      `}
    >
      {/* Animated glow dot for admin only */}
      {variant === 'admin' && (
        <span className="relative mr-1.5 flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-red-500" />
        </span>
      )}
      {children ?? defaultLabels[variant]}
    </span>
  );
}
