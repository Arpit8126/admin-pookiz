'use client';

import React from 'react';

type CardPadding = 'none' | 'sm' | 'md' | 'lg';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  padding?: CardPadding;
  hover?: boolean;
}

const paddingMap: Record<CardPadding, string> = {
  none: 'p-0',
  sm: 'p-3',
  md: 'p-5',
  lg: 'p-7',
};

// DESIGN.md: pricing-card / template-card — white bg, hairline border (#e6e6e6), rounded-lg (24px), subtle shadow
export default function Card({
  children,
  padding = 'md',
  hover = false,
  className = '',
  onClick,
  ...props
}: CardProps) {
  return (
    <div
      onClick={onClick}
      className={`
        rounded-[24px]
        bg-white
        border border-[#e6e6e6]
        shadow-[0_4px_16px_rgba(0,0,0,0.06)]
        ${paddingMap[padding]}
        ${hover
          ? 'transition-all duration-200 ease-out hover:-translate-y-1 hover:shadow-[0_8px_32px_rgba(0,0,0,0.10)] hover:border-[#ccc] cursor-pointer'
          : ''
        }
        ${onClick && !hover ? 'cursor-pointer' : ''}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
}
