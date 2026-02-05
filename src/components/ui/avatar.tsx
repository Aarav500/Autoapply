'use client';

import * as React from 'react';
import * as AvatarPrimitive from '@radix-ui/react-avatar';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const avatarVariants = cva(
  'relative flex shrink-0 overflow-hidden rounded-full',
  {
    variants: {
      size: {
        xs: 'h-6 w-6 text-xs',
        sm: 'h-8 w-8 text-xs',
        default: 'h-10 w-10 text-sm',
        lg: 'h-12 w-12 text-base',
        xl: 'h-16 w-16 text-lg',
        '2xl': 'h-20 w-20 text-xl',
      },
      ring: {
        none: '',
        default: 'ring-2 ring-white/10 ring-offset-2 ring-offset-[#0a0a0f]',
        primary: 'ring-2 ring-blue-500 ring-offset-2 ring-offset-[#0a0a0f]',
        success: 'ring-2 ring-emerald-500 ring-offset-2 ring-offset-[#0a0a0f]',
        warning: 'ring-2 ring-amber-500 ring-offset-2 ring-offset-[#0a0a0f]',
        error: 'ring-2 ring-red-500 ring-offset-2 ring-offset-[#0a0a0f]',
      },
    },
    defaultVariants: {
      size: 'default',
      ring: 'none',
    },
  }
);

export interface AvatarProps
  extends React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>,
    VariantProps<typeof avatarVariants> {
  src?: string;
  alt?: string;
  fallback?: string;
  status?: 'online' | 'offline' | 'busy' | 'away';
}

const statusColors = {
  online: 'bg-emerald-500',
  offline: 'bg-zinc-500',
  busy: 'bg-red-500',
  away: 'bg-amber-500',
};

const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  AvatarProps
>(({ className, size, ring, src, alt, fallback, status, ...props }, ref) => {
  // Generate initials from alt text or fallback
  const getInitials = (text: string) => {
    return text
      .split(' ')
      .map((word) => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const initials = fallback || (alt ? getInitials(alt) : '??');

  // Get fallback background color based on initials
  const getFallbackColor = (text: string) => {
    const colors = [
      'from-blue-500 to-blue-600',
      'from-purple-500 to-purple-600',
      'from-emerald-500 to-emerald-600',
      'from-amber-500 to-amber-600',
      'from-rose-500 to-rose-600',
      'from-teal-500 to-teal-600',
      'from-indigo-500 to-indigo-600',
      'from-cyan-500 to-cyan-600',
    ];
    const index = text.charCodeAt(0) % colors.length;
    return colors[index];
  };

  // Status indicator size based on avatar size
  const statusSizes = {
    xs: 'h-1.5 w-1.5',
    sm: 'h-2 w-2',
    default: 'h-2.5 w-2.5',
    lg: 'h-3 w-3',
    xl: 'h-4 w-4',
    '2xl': 'h-5 w-5',
  };

  return (
    <div className="relative inline-block">
      <AvatarPrimitive.Root
        ref={ref}
        className={cn(avatarVariants({ size, ring }), className)}
        {...props}
      >
        <AvatarPrimitive.Image
          src={src}
          alt={alt}
          className="aspect-square h-full w-full object-cover"
        />
        <AvatarPrimitive.Fallback
          className={cn(
            'flex h-full w-full items-center justify-center bg-gradient-to-br font-semibold text-white',
            getFallbackColor(initials)
          )}
        >
          {initials}
        </AvatarPrimitive.Fallback>
      </AvatarPrimitive.Root>

      {status && (
        <span
          className={cn(
            'absolute bottom-0 right-0 block rounded-full ring-2 ring-[#0a0a0f]',
            statusSizes[size || 'default'],
            statusColors[status]
          )}
        />
      )}
    </div>
  );
});
Avatar.displayName = 'Avatar';

// Avatar Group Component
interface AvatarGroupProps {
  children: React.ReactNode;
  max?: number;
  size?: VariantProps<typeof avatarVariants>['size'];
  className?: string;
}

const AvatarGroup = React.forwardRef<HTMLDivElement, AvatarGroupProps>(
  ({ children, max = 4, size = 'default', className }, ref) => {
    const childArray = React.Children.toArray(children);
    const visibleAvatars = childArray.slice(0, max);
    const remainingCount = childArray.length - max;

    // Spacing based on size
    const spacing = {
      xs: '-ml-1.5',
      sm: '-ml-2',
      default: '-ml-3',
      lg: '-ml-4',
      xl: '-ml-5',
      '2xl': '-ml-6',
    };

    return (
      <div ref={ref} className={cn('flex items-center', className)}>
        {visibleAvatars.map((child, index) => (
          <div
            key={index}
            className={cn(
              'relative inline-block',
              index !== 0 && spacing[size || 'default']
            )}
            style={{ zIndex: visibleAvatars.length - index }}
          >
            {React.isValidElement<AvatarProps>(child)
              ? React.cloneElement(child, {
                  size,
                  ring: 'default',
                })
              : child}
          </div>
        ))}

        {remainingCount > 0 && (
          <div
            className={cn(
              'relative inline-block',
              spacing[size || 'default']
            )}
          >
            <div
              className={cn(
                avatarVariants({ size, ring: 'default' }),
                'flex items-center justify-center bg-[#1a1a24] text-zinc-400 font-medium'
              )}
            >
              +{remainingCount}
            </div>
          </div>
        )}
      </div>
    );
  }
);
AvatarGroup.displayName = 'AvatarGroup';

export { Avatar, AvatarGroup, avatarVariants };
