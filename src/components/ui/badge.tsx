'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full text-xs font-semibold transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-blue-500/15 text-blue-400 border border-blue-500/20',
        secondary: 'bg-zinc-800/50 text-zinc-300 border border-white/10',
        success: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20',
        warning: 'bg-amber-500/15 text-amber-400 border border-amber-500/20',
        error: 'bg-red-500/15 text-red-400 border border-red-500/20',
        purple: 'bg-purple-500/15 text-purple-400 border border-purple-500/20',
        teal: 'bg-teal-500/15 text-teal-400 border border-teal-500/20',
        outline: 'border border-white/20 text-zinc-300 bg-transparent',
        ghost: 'text-zinc-400 bg-transparent',
      },
      size: {
        default: 'px-2.5 py-0.5',
        sm: 'px-2 py-0.5 text-[10px]',
        lg: 'px-3 py-1 text-sm',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean;
  dotColor?: string;
  pulse?: boolean;
  icon?: React.ReactNode;
  removable?: boolean;
  onRemove?: () => void;
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  (
    {
      className,
      variant,
      size,
      dot,
      dotColor,
      pulse,
      icon,
      removable,
      onRemove,
      children,
      ...props
    },
    ref
  ) => {
    const dotColorMap: Record<string, string> = {
      default: 'bg-blue-400',
      success: 'bg-emerald-400',
      warning: 'bg-amber-400',
      error: 'bg-red-400',
      purple: 'bg-purple-400',
      teal: 'bg-teal-400',
    };

    const resolvedDotColor =
      dotColor || dotColorMap[variant || 'default'] || 'bg-zinc-400';

    return (
      <span
        ref={ref}
        className={cn(badgeVariants({ variant, size }), className)}
        {...props}
      >
        {dot && (
          <span className="relative flex h-2 w-2">
            {pulse && (
              <span
                className={cn(
                  'absolute inline-flex h-full w-full animate-ping rounded-full opacity-75',
                  resolvedDotColor
                )}
              />
            )}
            <span
              className={cn(
                'relative inline-flex h-2 w-2 rounded-full',
                resolvedDotColor
              )}
            />
          </span>
        )}
        {icon && <span className="flex-shrink-0">{icon}</span>}
        {children}
        {removable && (
          <button
            type="button"
            onClick={onRemove}
            className="ml-1 -mr-1 hover:text-zinc-100 transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        )}
      </span>
    );
  }
);
Badge.displayName = 'Badge';

// Animated Badge for status indicators
interface StatusBadgeProps extends BadgeProps {
  status: 'online' | 'offline' | 'busy' | 'away' | 'pending';
}

const statusConfig = {
  online: {
    variant: 'success' as const,
    label: 'Online',
    dotColor: 'bg-emerald-400',
  },
  offline: {
    variant: 'secondary' as const,
    label: 'Offline',
    dotColor: 'bg-zinc-500',
  },
  busy: {
    variant: 'error' as const,
    label: 'Busy',
    dotColor: 'bg-red-400',
  },
  away: {
    variant: 'warning' as const,
    label: 'Away',
    dotColor: 'bg-amber-400',
  },
  pending: {
    variant: 'purple' as const,
    label: 'Pending',
    dotColor: 'bg-purple-400',
  },
};

const StatusBadge = React.forwardRef<HTMLSpanElement, StatusBadgeProps>(
  ({ status, children, ...props }, ref) => {
    const config = statusConfig[status];

    return (
      <Badge
        ref={ref}
        variant={config.variant}
        dot
        dotColor={config.dotColor}
        pulse={status === 'online' || status === 'pending'}
        {...props}
      >
        {children || config.label}
      </Badge>
    );
  }
);
StatusBadge.displayName = 'StatusBadge';

// Application Status Badge
interface ApplicationStatusBadgeProps extends Omit<BadgeProps, 'variant'> {
  status:
    | 'applied'
    | 'screening'
    | 'interview'
    | 'offer'
    | 'rejected'
    | 'withdrawn';
}

const applicationStatusConfig = {
  applied: {
    variant: 'default' as const,
    label: 'Applied',
  },
  screening: {
    variant: 'purple' as const,
    label: 'Screening',
  },
  interview: {
    variant: 'teal' as const,
    label: 'Interview',
  },
  offer: {
    variant: 'success' as const,
    label: 'Offer',
  },
  rejected: {
    variant: 'error' as const,
    label: 'Rejected',
  },
  withdrawn: {
    variant: 'secondary' as const,
    label: 'Withdrawn',
  },
};

const ApplicationStatusBadge = React.forwardRef<
  HTMLSpanElement,
  ApplicationStatusBadgeProps
>(({ status, children, ...props }, ref) => {
  const config = applicationStatusConfig[status];

  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
    >
      <Badge ref={ref} variant={config.variant} {...props}>
        {children || config.label}
      </Badge>
    </motion.span>
  );
});
ApplicationStatusBadge.displayName = 'ApplicationStatusBadge';

export { Badge, badgeVariants, StatusBadge, ApplicationStatusBadge };
