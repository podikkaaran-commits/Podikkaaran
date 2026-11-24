'use client';
import { useState } from 'react';
import files from '@/lib/optimized-images.json';

const optimizedFiles = new Set(files.map(file => '/images/' + file));
const placeholder = '/images/optimized/logo-384.webp';

export default function StoreImage({ src, alt, fill, sizes, priority, className = '', ...dimensions }) {
  const [failed, setFailed] = useState(null);
  const usePlaceholder = !src || failed === src;
  const optimized = !usePlaceholder && optimizedFiles.has(src);
  const variant = width => src.replace('/images/', '/images/optimized/').replace('.jpg', '-' + width + '.webp');

  return (
    <img
      {...dimensions}
      src={usePlaceholder ? placeholder : optimized ? variant(384) : src}
      srcSet={optimized ? [96, 384, 768].map(width => variant(width) + ' ' + width + 'w').join(', ') : undefined}
      sizes={optimized ? sizes || (dimensions.width ? dimensions.width + 'px' : '100vw') : undefined}
      alt={alt}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : undefined}
      decoding="async"
      className={fill ? 'absolute inset-0 h-full w-full ' + className : className}
      onError={usePlaceholder ? undefined : () => setFailed(src)}
    />
  );
}
