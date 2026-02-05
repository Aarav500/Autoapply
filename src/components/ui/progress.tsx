'use client';

import * as React from 'react';
import * as ProgressPrimitive from '@radix-ui/react-progress';
import { cva, type VariantProps } from 'class-variance-authority';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const progressVariants = cva('relative w-full overflow-hidden rounded-full', {
  variants: {
    size: {
      sm: 'h-1.5',
      default: 'h-2',
      lg: 'h-3',
      xl: 'h-4',
    },
    variant: {
      default: 'bg-zinc-800',
      ghost: 'bg-white/5',
    },
  },
  defaultVariants: {
    size: 'default',
    variant: 'default',
  },
});

const indicatorVariants = cva('h-full w-full flex-1 rounded-full transition-all', {
  variants: {
    color: {
      default: 'bg-gradient-to-r from-blue-500 to-blue-600',
      success: 'bg-gradient-to-r from-emerald-500 to-emerald-600',
      warning: 'bg-gradient-to-r from-amber-500 to-amber-600',
      error: 'bg-gradient-to-r from-red-500 to-red-600',
      purple: 'bg-gradient-to-r from-purple-500 to-purple-600',
      teal: 'bg-gradient-to-r from-teal-500 to-teal-600',
      gradient: 'bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500',
    },
    glow: {
      true: 'shadow-lg',
      false: '',
    },
  },
  defaultVariants: {
    color: 'default',
    glow: true,
  },
});

const glowColors = {
  default: 'shadow-blue-500/40',
  success: 'shadow-emerald-500/40',
  warning: 'shadow-amber-500/40',
  error: 'shadow-red-500/40',
  purple: 'shadow-purple-500/40',
  teal: 'shadow-teal-500/40',
  gradient: 'shadow-purple-500/40',
};

export interface ProgressProps
  extends Omit<React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>, 'color'>,
    VariantProps<typeof progressVariants>,
    VariantProps<typeof indicatorVariants> {
  showValue?: boolean;
  label?: string;
  animated?: boolean;
}

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  ProgressProps
>(
  (
    {
      className,
      value,
      size,
      variant,
      color,
      glow,
      showValue,
      label,
      animated = true,
      ...props
    },
    ref
  ) => {
    const percentage = value ?? 0;

    return (
      <div className="space-y-2">
        {(label || showValue) && (
          <div className="flex items-center justify-between text-sm">
            {label && <span className="text-zinc-400">{label}</span>}
            {showValue && (
              <span className="font-medium text-zinc-200">
                {Math.round(percentage)}%
              </span>
            )}
          </div>
        )}
        <ProgressPrimitive.Root
          ref={ref}
          className={cn(progressVariants({ size, variant }), className)}
          {...props}
        >
          <ProgressPrimitive.Indicator asChild>
            <motion.div
              className={cn(
                indicatorVariants({ color, glow }),
                glow && glowColors[color || 'default']
              )}
              initial={animated ? { width: 0 } : false}
              animate={{ width: `${percentage}%` }}
              transition={{
                duration: 0.6,
                ease: [0.4, 0, 0.2, 1],
              }}
            />
          </ProgressPrimitive.Indicator>
        </ProgressPrimitive.Root>
      </div>
    );
  }
);
Progress.displayName = ProgressPrimitive.Root.displayName;

// Circular Progress Component
interface CircularProgressProps {
  value: number;
  size?: 'sm' | 'default' | 'lg' | 'xl';
  color?: 'default' | 'success' | 'warning' | 'error' | 'purple' | 'teal';
  showValue?: boolean;
  label?: string;
  className?: string;
  strokeWidth?: number;
}

const circularSizes = {
  sm: { size: 48, fontSize: 'text-xs' },
  default: { size: 64, fontSize: 'text-sm' },
  lg: { size: 80, fontSize: 'text-base' },
  xl: { size: 120, fontSize: 'text-xl' },
};

const circularColors = {
  default: { stroke: '#3b82f6', gradient: 'url(#blue-gradient)' },
  success: { stroke: '#10b981', gradient: 'url(#green-gradient)' },
  warning: { stroke: '#f59e0b', gradient: 'url(#amber-gradient)' },
  error: { stroke: '#ef4444', gradient: 'url(#red-gradient)' },
  purple: { stroke: '#8b5cf6', gradient: 'url(#purple-gradient)' },
  teal: { stroke: '#14b8a6', gradient: 'url(#teal-gradient)' },
};

const CircularProgress = React.forwardRef<HTMLDivElement, CircularProgressProps>(
  (
    {
      value,
      size = 'default',
      color = 'default',
      showValue = true,
      label,
      className,
      strokeWidth = 4,
    },
    ref
  ) => {
    const { size: circleSize, fontSize } = circularSizes[size];
    const { stroke, gradient } = circularColors[color];

    const radius = (circleSize - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (value / 100) * circumference;

    return (
      <div
        ref={ref}
        className={cn('relative inline-flex flex-col items-center gap-2', className)}
      >
        <svg width={circleSize} height={circleSize} className="transform -rotate-90">
          <defs>
            <linearGradient id="blue-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#1d4ed8" />
            </linearGradient>
            <linearGradient id="green-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>
            <linearGradient id="amber-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#d97706" />
            </linearGradient>
            <linearGradient id="red-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#dc2626" />
            </linearGradient>
            <linearGradient id="purple-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#8b5cf6" />
              <stop offset="100%" stopColor="#7c3aed" />
            </linearGradient>
            <linearGradient id="teal-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#14b8a6" />
              <stop offset="100%" stopColor="#0d9488" />
            </linearGradient>
          </defs>

          {/* Background Circle */}
          <circle
            cx={circleSize / 2}
            cy={circleSize / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-zinc-800"
          />

          {/* Progress Circle */}
          <motion.circle
            cx={circleSize / 2}
            cy={circleSize / 2}
            r={radius}
            fill="none"
            stroke={gradient}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            style={{
              filter: `drop-shadow(0 0 6px ${stroke}50)`,
            }}
          />
        </svg>

        {showValue && (
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.span
              className={cn('font-bold text-zinc-100', fontSize)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              {Math.round(value)}%
            </motion.span>
          </div>
        )}

        {label && (
          <span className="text-xs text-zinc-400 text-center">{label}</span>
        )}
      </div>
    );
  }
);
CircularProgress.displayName = 'CircularProgress';

export { Progress, progressVariants, CircularProgress };
