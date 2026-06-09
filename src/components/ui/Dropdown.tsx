'use client';

import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  createContext,
  useContext,
} from 'react';
import { createPortal } from 'react-dom';

/* ────────────────────── Types ────────────────────── */

interface DropdownContextValue {
  isOpen: boolean;
  toggle: () => void;
  close: () => void;
  activeIndex: number;
  setActiveIndex: (i: number) => void;
  registerItem: () => number;
  containerRef: React.RefObject<HTMLDivElement | null>;
  menuRef: React.RefObject<HTMLDivElement | null>;
}

/* ────────────────────── Context ────────────────────── */

const DropdownContext = createContext<DropdownContextValue | null>(null);

function useDropdown() {
  const ctx = useContext(DropdownContext);
  if (!ctx) throw new Error('Dropdown components must be used within <Dropdown>');
  return ctx;
}

/* ────────────────────── Root ────────────────────── */

interface DropdownProps {
  children: React.ReactNode;
  className?: string;
  onOpenChange?: (isOpen: boolean) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Dropdown({
  children,
  className = '',
  onOpenChange,
  isOpen: controlledIsOpen,
  onClose,
}: DropdownProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isControlled = controlledIsOpen !== undefined;
  const isOpen = isControlled ? controlledIsOpen : internalIsOpen;
  const [activeIndex, setActiveIndex] = useState(-1);
  const itemCountRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const toggle = useCallback(() => {
    if (isControlled) {
      if (isOpen) {
        onClose?.();
        onOpenChange?.(false);
      } else {
        onOpenChange?.(true);
      }
    } else {
      setInternalIsOpen((prev) => {
        const next = !prev;
        onOpenChange?.(next);
        return next;
      });
    }
    setActiveIndex(-1);
    itemCountRef.current = 0;
  }, [isControlled, isOpen, onClose, onOpenChange]);

  const close = useCallback(() => {
    if (isControlled) {
      onClose?.();
      onOpenChange?.(false);
    } else {
      setInternalIsOpen(false);
      onOpenChange?.(false);
    }
    setActiveIndex(-1);
    itemCountRef.current = 0;
  }, [isControlled, onClose, onOpenChange]);

  const registerItem = useCallback(() => {
    return itemCountRef.current++;
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      const clickInsideContainer = containerRef.current && containerRef.current.contains(target);
      const clickInsideMenu = menuRef.current && menuRef.current.contains(target);

      if (!clickInsideContainer && !clickInsideMenu) {
        close();
      }
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [isOpen, close]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          close();
          break;
        case 'ArrowDown':
          e.preventDefault();
          setActiveIndex((prev) =>
            prev < itemCountRef.current - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setActiveIndex((prev) =>
            prev > 0 ? prev - 1 : itemCountRef.current - 1
          );
          break;
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, close]);

  useEffect(() => {
    if (isOpen) itemCountRef.current = 0;
  }, [isOpen]);

  return (
    <DropdownContext.Provider
      value={{
        isOpen,
        toggle,
        close,
        activeIndex,
        setActiveIndex,
        registerItem,
        containerRef,
        menuRef,
      }}
    >
      <div ref={containerRef} className={`relative inline-flex ${className}`}>
        {children}
      </div>
    </DropdownContext.Provider>
  );
}

/* ────────────────────── Trigger ────────────────────── */

interface TriggerProps {
  children: React.ReactNode;
  className?: string;
}

Dropdown.Trigger = function DropdownTrigger({
  children,
  className = '',
}: TriggerProps) {
  const { toggle } = useDropdown();
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        toggle();
      }}
      onMouseDown={(e) => e.stopPropagation()}
      onMouseUp={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      onTouchEnd={(e) => e.stopPropagation()}
      className={`cursor-pointer ${className}`}
      aria-haspopup="true"
    >
      {children}
    </button>
  );
};

/* ────────────────────── Menu ────────────────────── */

type MenuAlign = 'left' | 'right' | 'auto';
type MenuPosition = 'top' | 'bottom' | 'auto';

interface MenuProps {
  children: React.ReactNode;
  align?: MenuAlign;
  position?: MenuPosition;
  className?: string;
}

// DESIGN.md: dropdown — white bg, 1px hairline border, 8px radius, subtle shadow, surface-soft hover
Dropdown.Menu = function DropdownMenu({
  children,
  align = 'auto',
  position = 'auto',
  className = '',
}: MenuProps) {
  const { isOpen, containerRef, menuRef } = useDropdown();
  const [computedAlign, setComputedAlign] = useState<'left' | 'right'>('right');
  const [computedPosition, setComputedPosition] = useState<'top' | 'bottom'>('bottom');
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});
  const [mounted, setMounted] = useState(false);


  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen || !containerRef.current) return;

    const calculateLayout = () => {
      if (containerRef.current && menuRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const menuRect = menuRef.current.getBoundingClientRect();
        const menuWidth = menuRect.width || 200;
        const menuHeight = menuRect.height || 220;

        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;

        let computedAlignVal: 'left' | 'right' = 'right';
        if (align === 'auto') {
          const midpoint = rect.left + rect.width / 2;
          computedAlignVal = midpoint < screenWidth / 2 ? 'left' : 'right';
          setComputedAlign(computedAlignVal);
        } else {
          computedAlignVal = align;
        }

        let computedPositionVal: 'top' | 'bottom' = 'bottom';
        if (position === 'auto') {
          const spaceBelow = screenHeight - rect.bottom;
          const spaceAbove = rect.top;
          const isNearBottom = rect.top > screenHeight * 0.65;
          if (isNearBottom && spaceAbove > 100) {
            computedPositionVal = 'top';
          } else if (spaceBelow < menuHeight + 12 && spaceAbove > spaceBelow) {
            computedPositionVal = 'top';
          } else {
            computedPositionVal = 'bottom';
          }
          setComputedPosition(computedPositionVal);
        } else {
          computedPositionVal = position;
        }

        // Calculate screen-relative top & left coordinates for fixed position
        let top = 0;
        if (computedPositionVal === 'top') {
          top = rect.top - menuHeight - 8;
          if (top < 12) {
            // Check if it fits below
            if (screenHeight - rect.bottom > menuHeight + 12) {
              computedPositionVal = 'bottom';
              setComputedPosition('bottom');
              top = rect.bottom + 8;
            } else {
              top = 12;
            }
          }
        } else {
          top = rect.bottom + 8;
          if (top + menuHeight > screenHeight - 12) {
            // Check if it fits above
            if (rect.top > menuHeight + 12) {
              computedPositionVal = 'top';
              setComputedPosition('top');
              top = rect.top - menuHeight - 8;
            } else {
              top = screenHeight - menuHeight - 12;
            }
          }
        }

        let left = 0;
        if (computedAlignVal === 'left') {
          left = rect.left;
          if (left + menuWidth > screenWidth - 12) {
            left = screenWidth - 12 - menuWidth;
          }
          if (left < 12) left = 12;
        } else {
          left = rect.right - menuWidth;
          if (left < 12) {
            left = 12;
          }
          if (left + menuWidth > screenWidth - 12) {
            left = screenWidth - 12 - menuWidth;
          }
        }

        setMenuStyle({
          position: 'fixed',
          top: `${top}px`,
          left: `${left}px`,
          width: `${menuWidth}px`,
        });
      }
    };

    calculateLayout();
    const timeoutId = setTimeout(calculateLayout, 0);
    window.addEventListener('resize', calculateLayout);
    window.addEventListener('scroll', calculateLayout, true);
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', calculateLayout);
      window.removeEventListener('scroll', calculateLayout, true);
    };
  }, [isOpen, align, position, containerRef, children, className]);

  const finalPosition = position === 'auto' ? computedPosition : position;
  const isTop = finalPosition === 'top';

  if (!mounted || !isOpen) return null;

  return createPortal(
    <div
      ref={menuRef}
      role="menu"
      style={menuStyle}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
      onTouchEnd={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.stopPropagation()}
      className={`
        fixed z-[9999]
        min-w-[200px] max-w-[calc(100vw-24px)] py-1.5
        bg-white border border-[#e6e6e6]
        rounded-[12px] shadow-[0_16px_48px_rgba(0,0,0,0.08)]
        animate-scale-in
        ${className}
      `}
    >
      {children}
    </div>,
    document.body
  );
};

/* ────────────────────── Item ────────────────────── */

interface ItemProps {
  children: React.ReactNode;
  icon?: React.ReactNode;
  danger?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
}

Dropdown.Item = function DropdownItem({
  children,
  icon,
  danger = false,
  disabled = false,
  onClick,
  className = '',
}: ItemProps) {
  const { close, activeIndex, registerItem } = useDropdown();
  const indexRef = useRef<number>(-1);

  useEffect(() => {
    indexRef.current = registerItem();
  });

  const isActive = activeIndex === indexRef.current;

  const handleClick = (e?: React.MouseEvent | React.KeyboardEvent) => {
    if (disabled) return;
    e?.stopPropagation();
    close();
    onClick?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick(e);
    }
  };

  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={`
        w-full flex items-center gap-3 px-4 py-2 text-sm font-[330]
        transition-colors duration-100
        cursor-pointer
        ${danger
          ? 'text-red-600 hover:bg-red-50'
          : 'text-[#000000] hover:bg-[#f7f7f5]'
        }
        ${isActive ? (danger ? 'bg-red-50' : 'bg-[#f7f7f5]') : ''}
        ${disabled ? 'opacity-40 cursor-not-allowed' : ''}
        ${className}
      `}
    >
      {icon && (
        <span className={`flex-shrink-0 w-4 h-4 ${danger ? 'text-red-600' : 'text-[#666]'}`}>
          {icon}
        </span>
      )}
      <span className="flex-1 text-left">{children}</span>
    </button>
  );
};

/* ────────────────────── Divider ────────────────────── */

Dropdown.Divider = function DropdownDivider() {
  return <div className="my-1.5 border-t border-[#f1f1f1]" />;
};
