'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const inputVariants = cva(
  'flex w-full rounded-xl border bg-[#12121a] text-zinc-100 transition-all duration-200 file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-zinc-500 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'border-white/10 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20',
        ghost:
          'border-transparent bg-white/5 focus:bg-white/10 focus:border-white/20',
        error:
          'border-red-500/50 focus:border-red-500 focus:ring-2 focus:ring-red-500/20',
      },
      inputSize: {
        default: 'h-10 px-4 py-2 text-sm',
        sm: 'h-8 px-3 py-1.5 text-xs',
        lg: 'h-12 px-5 py-3 text-base',
      },
    },
    defaultVariants: {
      variant: 'default',
      inputSize: 'default',
    },
  }
);

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof inputVariants> {
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  error?: string;
  label?: string;
  hint?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type,
      variant,
      inputSize,
      leftIcon,
      rightIcon,
      error,
      label,
      hint,
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || React.useId();
    const hasError = !!error;

    return (
      <div className="space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-zinc-300"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
              {leftIcon}
            </div>
          )}
          <input
            type={type}
            id={inputId}
            className={cn(
              inputVariants({
                variant: hasError ? 'error' : variant,
                inputSize,
              }),
              leftIcon && 'pl-10',
              rightIcon && 'pr-10',
              className
            )}
            ref={ref}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500">
              {rightIcon}
            </div>
          )}
        </div>
        {(error || hint) && (
          <p
            className={cn(
              'text-xs',
              hasError ? 'text-red-400' : 'text-zinc-500'
            )}
          >
            {error || hint}
          </p>
        )}
      </div>
    );
  }
);
Input.displayName = 'Input';

// Search Input with animation
interface SearchInputProps extends InputProps {
  onSearch?: (value: string) => void;
}

const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  ({ className, onSearch, ...props }, ref) => {
    const [isFocused, setIsFocused] = React.useState(false);

    return (
      <motion.div
        className="relative"
        animate={{
          scale: isFocused ? 1.02 : 1,
        }}
        transition={{ duration: 0.2 }}
      >
        <Input
          ref={ref}
          type="search"
          className={cn('pr-10', className)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onChange={(e) => onSearch?.(e.target.value)}
          {...props}
        />
        <motion.div
          className="absolute right-3 top-1/2 -translate-y-1/2"
          animate={{
            color: isFocused ? 'rgb(59, 130, 246)' : 'rgb(113, 113, 122)',
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
        </motion.div>
      </motion.div>
    );
  }
);
SearchInput.displayName = 'SearchInput';

// Textarea component
interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
  label?: string;
  hint?: string;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, label, hint, id, ...props }, ref) => {
    const textareaId = id || React.useId();
    const hasError = !!error;

    return (
      <div className="space-y-1.5">
        {label && (
          <label
            htmlFor={textareaId}
            className="block text-sm font-medium text-zinc-300"
          >
            {label}
          </label>
        )}
        <textarea
          id={textareaId}
          className={cn(
            'flex min-h-[120px] w-full rounded-xl border bg-[#12121a] px-4 py-3 text-sm text-zinc-100 transition-all duration-200 placeholder:text-zinc-500 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 resize-none',
            hasError
              ? 'border-red-500/50 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
              : 'border-white/10 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20',
            className
          )}
          ref={ref}
          {...props}
        />
        {(error || hint) && (
          <p
            className={cn(
              'text-xs',
              hasError ? 'text-red-400' : 'text-zinc-500'
            )}
          >
            {error || hint}
          </p>
        )}
      </div>
    );
  }
);
Textarea.displayName = 'Textarea';

export { Input, inputVariants, SearchInput, Textarea };
