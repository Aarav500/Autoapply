'use client';

import * as React from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { cn } from '@/lib/utils';

interface CardProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
  children?: React.ReactNode;
  hover?: boolean;
  glow?: boolean;
  gradient?: 'none' | 'blue' | 'purple' | 'teal' | 'surface';
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, children, hover = true, glow = false, gradient = 'none', ...props }, ref) => {
    const gradientStyles = {
      none: '',
      blue: 'before:absolute before:inset-0 before:rounded-2xl before:bg-gradient-to-br before:from-blue-500/10 before:to-transparent before:pointer-events-none',
      purple: 'before:absolute before:inset-0 before:rounded-2xl before:bg-gradient-to-br before:from-purple-500/10 before:to-transparent before:pointer-events-none',
      teal: 'before:absolute before:inset-0 before:rounded-2xl before:bg-gradient-to-br before:from-teal-500/10 before:to-transparent before:pointer-events-none',
      surface: 'before:absolute before:inset-0 before:rounded-2xl before:bg-gradient-to-b before:from-white/5 before:to-transparent before:pointer-events-none',
    };

    return (
      <motion.div
        ref={ref}
        className={cn(
          'relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#12121a]/80 backdrop-blur-xl p-6',
          gradient !== 'none' && gradientStyles[gradient],
          glow && 'shadow-lg shadow-blue-500/10',
          className
        )}
        whileHover={
          hover
            ? {
                y: -2,
                borderColor: 'rgba(59, 130, 246, 0.3)',
                boxShadow: glow
                  ? '0 20px 40px rgba(0, 0, 0, 0.4), 0 0 60px rgba(59, 130, 246, 0.15)'
                  : '0 16px 48px rgba(0, 0, 0, 0.5)',
              }
            : {}
        }
        transition={{ duration: 0.25, ease: 'easeOut' }}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);
Card.displayName = 'Card';

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex flex-col space-y-1.5 pb-4', className)}
      {...props}
    />
  )
);
CardHeader.displayName = 'CardHeader';

const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn(
        'text-lg font-semibold leading-none tracking-tight text-zinc-100',
        className
      )}
      {...props}
    />
  )
);
CardTitle.displayName = 'CardTitle';

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p ref={ref} className={cn('text-sm text-zinc-400', className)} {...props} />
));
CardDescription.displayName = 'CardDescription';

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('', className)} {...props} />
  )
);
CardContent.displayName = 'CardContent';

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex items-center pt-4 border-t border-white/[0.08]', className)}
      {...props}
    />
  )
);
CardFooter.displayName = 'CardFooter';

// Stats Card Component
interface StatsCardProps extends CardProps {
  value: string | number;
  label: string;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  accentColor?: 'blue' | 'green' | 'purple' | 'amber' | 'rose';
}

const accentColorMap = {
  blue: {
    bg: 'bg-blue-500/15',
    text: 'text-blue-400',
    gradient: 'from-blue-500 to-blue-600',
  },
  green: {
    bg: 'bg-emerald-500/15',
    text: 'text-emerald-400',
    gradient: 'from-emerald-500 to-emerald-600',
  },
  purple: {
    bg: 'bg-purple-500/15',
    text: 'text-purple-400',
    gradient: 'from-purple-500 to-purple-600',
  },
  amber: {
    bg: 'bg-amber-500/15',
    text: 'text-amber-400',
    gradient: 'from-amber-500 to-amber-600',
  },
  rose: {
    bg: 'bg-rose-500/15',
    text: 'text-rose-400',
    gradient: 'from-rose-500 to-rose-600',
  },
};

const StatsCard = React.forwardRef<HTMLDivElement, StatsCardProps>(
  ({ value, label, icon, trend, accentColor = 'blue', className, ...props }, ref) => {
    const colors = accentColorMap[accentColor];

    return (
      <Card ref={ref} className={className} {...props}>
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-1">
            <motion.span
              className={cn(
                'text-3xl font-bold bg-gradient-to-r bg-clip-text text-transparent',
                colors.gradient
              )}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              {value}
            </motion.span>
            <span className="text-sm text-zinc-400">{label}</span>
            {trend && (
              <span
                className={cn(
                  'text-xs font-medium',
                  trend.isPositive ? 'text-emerald-400' : 'text-rose-400'
                )}
              >
                {trend.isPositive ? '+' : '-'}{Math.abs(trend.value)}% from last week
              </span>
            )}
          </div>
          {icon && (
            <div
              className={cn(
                'w-12 h-12 rounded-xl flex items-center justify-center',
                colors.bg
              )}
            >
              <div className={colors.text}>{icon}</div>
            </div>
          )}
        </div>
      </Card>
    );
  }
);
StatsCard.displayName = 'StatsCard';

export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  StatsCard,
};
