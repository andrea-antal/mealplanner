import { useMemo } from 'react';
import type { BoundingBox } from '@/lib/api';

interface PhotoCropProps {
  imageUrl: string;
  boundingBox?: BoundingBox;
  padding?: number; // Extra padding around crop (0-0.2)
  className?: string;
}

/**
 * Displays a cropped portion of an image based on bounding box coordinates.
 * Falls back to showing the full image if no bounding box is provided.
 */
export function PhotoCrop({
  imageUrl,
  boundingBox,
  padding = 0.1,
  className = '',
}: PhotoCropProps) {
  // Calculate crop styles based on bounding box
  const cropStyles = useMemo(() => {
    if (!boundingBox) {
      // No bounding box - show full image
      return {
        objectFit: 'contain' as const,
        objectPosition: 'center',
      };
    }

    const { x, y, width, height } = boundingBox;

    // Add padding and clamp to valid range
    const paddedX = Math.max(0, x - padding);
    const paddedY = Math.max(0, y - padding);
    const paddedWidth = Math.min(1 - paddedX, width + 2 * padding);
    const paddedHeight = Math.min(1 - paddedY, height + 2 * padding);

    // Calculate scale to fit the cropped region
    const scaleX = 1 / paddedWidth;
    const scaleY = 1 / paddedHeight;

    // Position to center the cropped region
    const offsetX = -paddedX * scaleX * 100;
    const offsetY = -paddedY * scaleY * 100;

    return {
      transform: `scale(${Math.min(scaleX, scaleY)})`,
      transformOrigin: `${paddedX * 100}% ${paddedY * 100}%`,
      objectFit: 'none' as const,
      objectPosition: `${offsetX}% ${offsetY}%`,
      width: `${scaleX * 100}%`,
      height: `${scaleY * 100}%`,
    };
  }, [boundingBox, padding]);

  // Simpler approach using clip-path for cropping
  const clipStyles = useMemo(() => {
    if (!boundingBox) return undefined;

    const { x, y, width, height } = boundingBox;

    // Add padding
    const paddedX = Math.max(0, x - padding);
    const paddedY = Math.max(0, y - padding);
    const paddedWidth = Math.min(1 - paddedX, width + 2 * padding);
    const paddedHeight = Math.min(1 - paddedY, height + 2 * padding);

    // Inset from edges (top, right, bottom, left)
    const top = paddedY * 100;
    const right = (1 - paddedX - paddedWidth) * 100;
    const bottom = (1 - paddedY - paddedHeight) * 100;
    const left = paddedX * 100;

    return {
      clipPath: `inset(${top}% ${right}% ${bottom}% ${left}%)`,
    };
  }, [boundingBox, padding]);

  if (!boundingBox) {
    // No bounding box - just show the full image
    return (
      <div className={`overflow-hidden ${className}`}>
        <img
          src={imageUrl}
          alt="Recipe region"
          className="w-full h-full object-contain"
        />
      </div>
    );
  }

  // With bounding box - show cropped region using CSS transform
  return (
    <div className={`overflow-hidden relative ${className}`}>
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{ overflow: 'hidden' }}
      >
        <img
          src={imageUrl}
          alt="Recipe region"
          className="max-w-none"
          style={{
            // Scale up the image so the cropped region fills the container
            transform: `scale(${1 / Math.max(boundingBox.width + 2 * padding, boundingBox.height + 2 * padding)})`,
            transformOrigin: `${(boundingBox.x + boundingBox.width / 2) * 100}% ${(boundingBox.y + boundingBox.height / 2) * 100}%`,
          }}
        />
      </div>
      {/* Highlight overlay to show the region */}
      <div
        className="absolute pointer-events-none"
        style={{
          left: `${Math.max(0, boundingBox.x - padding) * 100}%`,
          top: `${Math.max(0, boundingBox.y - padding) * 100}%`,
          width: `${Math.min(1 - boundingBox.x + padding, boundingBox.width + 2 * padding) * 100}%`,
          height: `${Math.min(1 - boundingBox.y + padding, boundingBox.height + 2 * padding) * 100}%`,
          border: '2px solid hsl(var(--primary))',
          borderRadius: '4px',
        }}
      />
    </div>
  );
}

/**
 * Simpler version that shows the full image with a highlight box overlay.
 * More reliable than trying to crop with CSS transforms.
 */
export function PhotoWithHighlight({
  imageUrl,
  boundingBox,
  className = '',
}: PhotoCropProps) {
  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Full image */}
      <img
        src={imageUrl}
        alt="Recipe"
        className="w-full h-full object-contain"
      />

      {/* Highlight overlay */}
      {boundingBox && (
        <>
          {/* Dimming overlay for areas outside the region */}
          <div
            className="absolute inset-0 bg-black/30 pointer-events-none"
            style={{
              clipPath: `polygon(
                0% 0%, 100% 0%, 100% 100%, 0% 100%,
                0% ${boundingBox.y * 100}%,
                ${boundingBox.x * 100}% ${boundingBox.y * 100}%,
                ${boundingBox.x * 100}% ${(boundingBox.y + boundingBox.height) * 100}%,
                ${(boundingBox.x + boundingBox.width) * 100}% ${(boundingBox.y + boundingBox.height) * 100}%,
                ${(boundingBox.x + boundingBox.width) * 100}% ${boundingBox.y * 100}%,
                0% ${boundingBox.y * 100}%
              )`,
            }}
          />
          {/* Border around highlighted region */}
          <div
            className="absolute border-2 border-primary rounded pointer-events-none"
            style={{
              left: `${boundingBox.x * 100}%`,
              top: `${boundingBox.y * 100}%`,
              width: `${boundingBox.width * 100}%`,
              height: `${boundingBox.height * 100}%`,
            }}
          />
        </>
      )}
    </div>
  );
}
