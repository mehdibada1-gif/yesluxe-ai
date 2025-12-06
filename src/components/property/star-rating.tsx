
'use client';

import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StarRatingProps {
  rating: number;
  className?: string;
  starClassName?: string;
}

export function StarRating({ rating, className, starClassName }: StarRatingProps) {
  return (
    <div className={cn("flex items-center", className)}>
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          className={cn(
            'h-5 w-5',
            i < Math.round(rating) ? 'text-primary fill-primary' : 'text-muted-foreground/50',
            starClassName
          )}
        />
      ))}
    </div>
  );
}
