'use client';

import React, { useState } from 'react';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'profile';
type RingRole = 'admin' | 'coadmin' | 'mod' | 'member' | 'none';

interface AvatarProps {
  src?: string | null;
  alt?: string;
  name?: string;
  size?: AvatarSize;
  online?: boolean;
  ring?: RingRole;
  anonymous?: boolean;
  className?: string;
}

const sizeMap: Record<AvatarSize, { container: string; text: string; dot: string }> = {
  xs: { container: 'h-5 w-5 sm:h-6 sm:w-6', text: 'text-[9px] sm:text-[10px]', dot: 'h-1.5 w-1.5 sm:h-2 sm:w-2 border' },
  sm: { container: 'h-6 w-6 sm:h-8 sm:w-8', text: 'text-[10px] sm:text-xs', dot: 'h-2 w-2 sm:h-2.5 sm:w-2.5 border sm:border-[1.5px]' },
  md: { container: 'h-8 w-8 sm:h-10 sm:w-10', text: 'text-xs sm:text-sm', dot: 'h-2.5 w-2.5 sm:h-3 sm:w-3 border-[1.5px] sm:border-2' },
  lg: { container: 'h-10 w-10 sm:h-14 sm:w-14', text: 'text-sm sm:text-lg', dot: 'h-3 w-3 sm:h-3.5 sm:w-3.5 border-2' },
  xl: { container: 'h-14 w-14 sm:h-20 sm:w-20', text: 'text-xl sm:text-2xl', dot: 'h-3.5 w-3.5 sm:h-4 sm:w-4 border-2' },
  profile: { container: 'h-20 w-20 sm:h-24 sm:w-24', text: 'text-2xl sm:text-3xl', dot: 'h-4 w-4 sm:h-4.5 sm:w-4.5 border-2' },
};

// DESIGN.md: role rings use semantic colors; member ring uses hairline; ring-offset is white (canvas)
const ringMap: Record<RingRole, string> = {
  admin:   'ring-2 ring-red-500 ring-offset-2 ring-offset-white',
  coadmin: 'ring-2 ring-orange-500 ring-offset-2 ring-offset-white',
  mod:     'ring-2 ring-amber-500 ring-offset-2 ring-offset-white',
  member:  'ring-1 ring-[#e6e6e6] ring-offset-1 ring-offset-white',
  none:    '',
};

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

const SilhouetteIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v1.2c0 .7.5 1.2 1.2 1.2h16.8c.7 0 1.2-.5 1.2-1.2v-1.2c0-3.2-6.4-4.8-9.6-4.8z" />
  </svg>
);

export default function Avatar({
  src,
  alt = '',
  name,
  size = 'md',
  online,
  ring = 'none',
  anonymous = false,
  className = '',
}: AvatarProps) {
  const [imgError, setImgError] = useState(false);
  const s = sizeMap[size];

  const showImage = src && !imgError && !anonymous;
  const showInitials = !showImage && name && !anonymous;
  const showSilhouette = !showImage && !showInitials;

  return (
    <div className={`relative inline-flex flex-shrink-0 ${className}`}>
      <div
        className={`
          ${s.container} rounded-full overflow-hidden
          flex items-center justify-center
          bg-[#f7f7f5]
          ${ringMap[ring]}
          transition-all duration-200
        `}
      >
        {showImage && (
          <img
            src={src!}
            alt={alt}
            onError={() => setImgError(true)}
            className="h-full w-full object-cover"
          />
        )}
        {showInitials && (
          <span className={`font-[540] text-[#000000] select-none ${s.text}`}>
            {getInitials(name!)}
          </span>
        )}
        {showSilhouette && (
          <SilhouetteIcon className="h-[60%] w-[60%] text-[#999]" />
        )}
      </div>

      {/* Online indicator — white border on white bg */}
      {online !== undefined && (
        <span
          className={`
            absolute bottom-0 right-0
            ${s.dot} rounded-full
            border-white
            ${online ? 'bg-[#1ea64a]' : 'bg-[#ccc]'}
            transition-colors duration-300
          `}
        />
      )}
    </div>
  );
}
