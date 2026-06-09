'use client';

import React, { forwardRef, useState } from 'react';

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  helperText?: string;
  maxChars?: number;
  rightIcon?: React.ReactNode;
  rightAction?: React.ReactNode;
  inputSize?: 'sm' | 'md' | 'lg';
}

const EyeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeOffIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
    <line x1="1" y1="1" x2="23" y2="23" />
    <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
  </svg>
);

// DESIGN.md: text-input — white bg, black text, hairline border (#e6e6e6), rounded-md (8px), focus = black ring
const inputSizeStyles = {
  sm: 'px-3 py-2 text-sm rounded-[8px]',
  md: 'px-4 py-[11px] text-[15px] rounded-[8px]',
  lg: 'px-4 py-3.5 text-base rounded-[8px]',
};

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      maxChars,
      rightIcon,
      rightAction,
      type = 'text',
      inputSize = 'md',
      className = '',
      value,
      onChange,
      id,
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = useState(false);
    const [internalValue, setInternalValue] = useState('');

    const currentValue = (value ?? internalValue) as string;
    const charCount = currentValue.length;
    const isPassword = type === 'password';
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (maxChars && e.target.value.length > maxChars) return;
      if (!onChange) setInternalValue(e.target.value);
      onChange?.(e);
    };

    return (
      <div className="w-full">
        {/* Label — DESIGN.md: body-sm weight 330, black ink */}
        {label && (
          <label
            htmlFor={inputId}
            className="mb-1.5 block text-sm font-[330] text-[#000000] tracking-[-0.14px]"
          >
            {label}
          </label>
        )}

        {/* Input Wrapper */}
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            type={isPassword && showPassword ? 'text' : type}
            value={value}
            onChange={handleChange}
            className={`
              w-full bg-white text-[#000000] placeholder-[#999]
              border transition-all duration-200 ease-out
              focus:outline-none focus:ring-2 focus:border-[#000000]
              ${error
                ? 'border-red-500 focus:ring-red-500/20 focus:border-red-500'
                : 'border-[#e6e6e6] hover:border-[#ccc] focus:ring-black/10'
              }
              ${(rightIcon || rightAction || isPassword) ? 'pr-11' : ''}
              ${inputSizeStyles[inputSize]}
              ${className}
            `}
            {...props}
          />

          {/* Right-side elements */}
          {(isPassword || rightIcon || rightAction) && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
              {isPassword && (
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-[#999] hover:text-[#000] transition-colors cursor-pointer"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              )}
              {rightIcon && <span className="text-[#999]">{rightIcon}</span>}
              {rightAction}
            </div>
          )}
        </div>

        {/* Bottom row: error/helper + char count */}
        <div className="mt-1.5 flex items-center justify-between">
          <div>
            {error && (
              <p className="text-xs text-red-600 flex items-center gap-1 font-[330]">
                <svg className="h-3 w-3 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {error}
              </p>
            )}
            {helperText && !error && (
              <p className="text-xs text-[#666]">{helperText}</p>
            )}
          </div>
          {maxChars && (
            <p
              className={`text-xs tabular-nums ${
                charCount >= maxChars ? 'text-red-600' : 'text-[#999]'
              }`}
            >
              {charCount}/{maxChars}
            </p>
          )}
        </div>
      </div>
    );
  }
);

Input.displayName = 'Input';
export default Input;
