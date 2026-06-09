'use client';

import React from 'react';

interface VerifiedBadgeProps {
  className?: string;
}

export default function VerifiedBadge({ className = 'w-4 h-4' }: VerifiedBadgeProps) {
  return (
    <svg
      className={`${className} text-blue-500 fill-current inline-block shrink-0 align-middle select-none`}
      viewBox="0 0 24 24"
      aria-label="Verified user badge"
    >
      <title>Verified Account</title>
      <path d="M23 12l-2.44-2.78.34-3.68-3.61-.82-1.89-3.18L12 3 8.6 1.54 6.71 4.72l-3.61.81.34 3.68L1 12l2.44 2.78-.34 3.69 3.61.82 1.89 3.18L12 21l3.4 1.46 1.89-3.18 3.61-.82-.34-3.68L23 12zm-13 5l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z" />
    </svg>
  );
}
