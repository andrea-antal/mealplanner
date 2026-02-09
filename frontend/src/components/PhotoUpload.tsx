import { useState, useRef, useCallback } from 'react';
import { Upload, X, Loader2, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PhotoUploadProps {
  onUpload: (file: File) => Promise<void>;
  onDelete?: () => Promise<void>;
  currentPhotoUrl?: string;
  isUploading?: boolean;
  className?: string;
}

export function PhotoUpload({
  onUpload,
  onDelete,
  currentPhotoUrl,
  isUploading = false,
  className = '',
}: PhotoUploadProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      if (!allowedTypes.includes(file.type)) {
        return;
      }

      // Show preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      // Upload
      await onUpload(file);
      setPreview(null);
    },
    [onUpload]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);

      const file = e.dataTransfer.files[0];
      if (file) {
        handleFile(file);
      }
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFile(file);
      }
      // Reset input so same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [handleFile]
  );

  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // Show current photo with delete option
  if (currentPhotoUrl && !isUploading) {
    return (
      <div className={`relative group ${className}`}>
        <div className="aspect-video w-full overflow-hidden rounded-xl">
          <img
            src={currentPhotoUrl}
            alt="Recipe photo"
            className="h-full w-full object-cover"
          />
        </div>
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors rounded-xl flex items-center justify-center">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleClick}
              className="shadow-lg"
            >
              <Upload className="h-4 w-4 mr-1" />
              Replace
            </Button>
            {onDelete && (
              <Button
                variant="destructive"
                size="sm"
                onClick={onDelete}
                className="shadow-lg"
              >
                <X className="h-4 w-4 mr-1" />
                Remove
              </Button>
            )}
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={handleInputChange}
          className="hidden"
        />
      </div>
    );
  }

  // Show upload area (with optional preview during upload)
  return (
    <div className={className}>
      {isUploading && preview ? (
        <div className="relative aspect-video w-full overflow-hidden rounded-xl">
          <img
            src={preview}
            alt="Upload preview"
            className="h-full w-full object-cover opacity-50"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </div>
      ) : (
        <div
          role="button"
          tabIndex={0}
          onClick={handleClick}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleClick();
            }
          }}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`
            flex flex-col items-center justify-center gap-2 p-6
            rounded-xl border-2 border-dashed border-border
            cursor-pointer transition-colors
            hover:border-primary/50 hover:bg-primary/5
            ${isDragOver ? 'border-primary bg-primary/10' : ''}
          `}
        >
          <ImageIcon className="h-8 w-8 text-muted-foreground" />
          <div className="text-center">
            <p className="text-sm font-medium text-foreground">
              Add a photo
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Drag and drop or click to upload
            </p>
          </div>
        </div>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleInputChange}
        className="hidden"
      />
    </div>
  );
}
