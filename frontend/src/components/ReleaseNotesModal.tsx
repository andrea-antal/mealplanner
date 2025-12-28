import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { APP_VERSION } from '@/lib/version';

interface ReleaseNotesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReleaseNotesModal({ open, onOpenChange }: ReleaseNotesModalProps) {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open) {
      // Fetch release notes markdown file from public folder
      fetch('/docs/RELEASE_NOTES.md')
        .then(res => {
          if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
          }
          return res.text();
        })
        .then(text => {
          // Remove metadata header (lines between first and second '---')
          const lines = text.split('\n');
          const firstDashIndex = lines.findIndex(line => line.trim() === '---');
          const secondDashIndex = lines.findIndex((line, idx) => idx > firstDashIndex && line.trim() === '---');

          if (firstDashIndex !== -1 && secondDashIndex !== -1) {
            // Content starts after the second '---'
            const contentOnly = lines.slice(secondDashIndex + 1).join('\n');
            setContent(contentOnly.trim());
          } else {
            // No metadata header found, use full content
            setContent(text);
          }

          setLoading(false);
        })
        .catch(err => {
          console.error('Failed to load release notes:', err);
          setContent('Failed to load release notes. Please try again later.');
          setLoading(false);
        });
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            What's New in Meal Planner
          </DialogTitle>
          <DialogDescription>
            Version {APP_VERSION}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4 prose prose-sm max-w-none dark:prose-invert [&_ul]:space-y-3 [&_li]:leading-relaxed [&_h2]:mt-6 [&_h2]:mb-4 [&_h3]:mt-5 [&_h3]:mb-3">
          {loading ? (
            <p className="text-muted-foreground">Loading release notes...</p>
          ) : (
            <ReactMarkdown>{content}</ReactMarkdown>
          )}
        </div>

        <DialogFooter className="border-t pt-4">
          <Button
            onClick={() => onOpenChange(false)}
            variant="default"
            className="w-full md:w-auto"
          >
            Got it!
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
