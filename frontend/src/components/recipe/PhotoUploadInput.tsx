import { useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, Upload, Loader2 } from 'lucide-react';

interface PhotoUploadInputProps {
  onPhotoSelected: (base64: string, previewUrl: string) => void;
  disabled?: boolean;
}

/**
 * Photo upload component with drag-and-drop, file input, and image compression.
 * Used for uploading recipe photos for OCR parsing.
 */
export function PhotoUploadInput({ onPhotoSelected, disabled }: PhotoUploadInputProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  /**
   * Compress image to reduce upload size and normalize dimensions.
   * Returns base64 string (without data URL prefix) for API calls.
   */
  const compressImage = async (file: File): Promise<{ base64: string; previewUrl: string }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          // Create canvas for compression
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');

          if (!ctx) {
            reject(new Error('Could not get canvas context'));
            return;
          }

          // Calculate resize ratio (max 1500px for recipe photos - need detail for OCR)
          const maxSize = 1500;
          let width = img.width;
          let height = img.height;

          if (width > height && width > maxSize) {
            height = (height / width) * maxSize;
            width = maxSize;
          } else if (height > maxSize) {
            width = (width / height) * maxSize;
            height = maxSize;
          }

          // Resize image
          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);

          // Export as JPEG at 85% quality (higher than receipts for OCR accuracy)
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

          // Strip data URL prefix for API (data:image/jpeg;base64,)
          const base64Data = dataUrl.split(',')[1];

          resolve({
            base64: base64Data,
            previewUrl: dataUrl, // Keep full data URL for preview
          });
        };

        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = e.target?.result as string;
      };

      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  };

  const handleFileSelect = async (file: File | null) => {
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return;
    }

    setIsProcessing(true);
    try {
      const { base64, previewUrl } = await compressImage(file);
      onPhotoSelected(base64, previewUrl);
    } catch (error) {
      console.error('Error processing image:', error);
    } finally {
      setIsProcessing(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    handleFileSelect(file ?? null);
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && !isProcessing) {
      setIsDragOver(true);
    }
  }, [disabled, isProcessing]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (disabled || isProcessing) return;

    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      handleFileSelect(file);
    }
  }, [disabled, isProcessing]);

  return (
    <div
      className={`
        border-2 border-dashed rounded-lg p-6 text-center transition-colors
        ${isDragOver ? 'border-primary bg-primary/5' : 'border-border'}
        ${disabled || isProcessing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-primary/50'}
      `}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => !disabled && !isProcessing && fileInputRef.current?.click()}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp,image/heif,image/heic,.heif,.heic"
        onChange={handleFileInputChange}
        className="hidden"
        disabled={disabled || isProcessing}
        aria-label="Upload recipe photo"
      />

      <div className="flex flex-col items-center gap-3">
        {isProcessing ? (
          <>
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Processing image...</p>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <Camera className="h-6 w-6 text-muted-foreground" />
              <Upload className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium">
                {isDragOver ? 'Drop image here' : 'Upload recipe photo'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Drag and drop or click to select
              </p>
              <p className="text-xs text-muted-foreground">
                Supports printed or handwritten recipes
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
