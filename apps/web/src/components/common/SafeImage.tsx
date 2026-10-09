'use client';

import { useState, useEffect } from 'react';
import { FileText, Image as ImageIcon } from 'lucide-react';
import { getMediaUrl, getMediaPlaceholder } from '@/lib/media-url';

interface SafeImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src?: string | null;
  alt: string;
  fallbackCategory?: string | null;
  fallbackTitle?: string | null;
  fallbackIcon?: 'file' | 'image' | 'letter';
  containerClassName?: string;
  fill?: boolean;
}

export default function SafeImage({
  src,
  alt,
  fallbackCategory,
  fallbackTitle,
  fallbackIcon = 'file',
  className = '',
  containerClassName = '',
  ...props
}: SafeImageProps) {
  const [hasError, setHasError] = useState(false);
  const resolvedSrc = getMediaUrl(src);

  // Reset error state if src changes
  useEffect(() => {
    setHasError(false);
  }, [resolvedSrc]);

  if (!resolvedSrc || hasError) {
    const placeholder = getMediaPlaceholder(fallbackCategory, fallbackTitle || alt);

    return (
      <div
        className={`flex items-center justify-center select-none bg-gray-100 text-gray-400 border border-gray-200 overflow-hidden ${className} ${containerClassName}`}
        title={alt || 'Image'}
      >
        {fallbackIcon === 'letter' ? (
          <div
            className={`w-full h-full bg-gradient-to-br ${placeholder.gradient} ${placeholder.textColor} flex items-center justify-center font-black text-sm sm:text-base`}
          >
            {placeholder.initial}
          </div>
        ) : fallbackIcon === 'image' ? (
          <ImageIcon className="w-5 h-5 text-gray-400 opacity-60" />
        ) : (
          <FileText className="w-5 h-5 text-gray-400 opacity-60" />
        )}
      </div>
    );
  }

  return (
    <img
      src={resolvedSrc}
      alt={alt}
      onError={() => setHasError(true)}
      className={className}
      loading="lazy"
      {...props}
    />
  );
}
