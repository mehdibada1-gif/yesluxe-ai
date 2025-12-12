
'use client';

import Image from 'next/image';
import { Card } from '@/components/ui/card';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import type { ImagePlaceholder } from '@/lib/placeholder-images';

type MediaGalleryProps = {
  media: ImagePlaceholder[];
};

export default function MediaGallery({ media }: MediaGalleryProps) {
  return (
    <Card className="overflow-hidden">
      <Carousel className="w-full">
        <CarouselContent>
          {media.map((image, index) => (
            <CarouselItem key={image.id}>
              <div className="aspect-video relative">
                <Image
                  src={image.imageUrl}
                  alt={image.description}
                  fill
                  className="object-cover"
                  data-ai-hint={image.imageHint}
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  priority={index === 0}
                />
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="absolute left-4" />
        <CarouselNext className="absolute right-4" />
      </Carousel>
    </Card>
  );
}
