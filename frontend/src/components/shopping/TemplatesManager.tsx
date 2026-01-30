import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import {
  templatesAPI,
  type TemplateItem,
  type CreateTemplateRequest,
} from '@/lib/api';
import { getCurrentWorkspace } from '@/lib/workspace';
import { TemplateModal } from './TemplateModal';
import {
  Loader2,
  Star,
  Clock,
  ListPlus,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface TemplatesManagerProps {
  onAddToList?: (templateIds: string[]) => void;
}

export const TemplatesManager = ({ onAddToList }: TemplatesManagerProps) => {
  const queryClient = useQueryClient();
  const workspaceId = getCurrentWorkspace();

  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TemplateItem | null>(null);

  // Fetch templates
  const { data: templateList, isLoading } = useQuery({
    queryKey: ['shopping-templates', workspaceId],
    queryFn: () => templatesAPI.getAll(workspaceId!),
    enabled: !!workspaceId,
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: CreateTemplateRequest) =>
      templatesAPI.create(workspaceId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopping-templates', workspaceId] });
      setShowModal(false);
      toast.success('Favorite added');
    },
    onError: () => {
      toast.error('Failed to add favorite');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateTemplateRequest> }) =>
      templatesAPI.update(workspaceId!, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopping-templates', workspaceId] });
      setShowModal(false);
      setEditingTemplate(null);
      toast.success('Favorite updated');
    },
    onError: () => {
      toast.error('Failed to update favorite');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (template: TemplateItem) => templatesAPI.delete(workspaceId!, template.id),
    onSuccess: (_, deletedTemplate) => {
      queryClient.invalidateQueries({ queryKey: ['shopping-templates', workspaceId] });
      toast.success('Removed from favorites', {
        action: {
          label: 'Undo',
          onClick: () => {
            // Recreate the template with the same data
            createMutation.mutate({
              name: deletedTemplate.name,
              canonical_name: deletedTemplate.canonical_name,
              category: deletedTemplate.category,
              default_quantity: deletedTemplate.default_quantity,
              frequency: deletedTemplate.frequency,
              is_favorite: deletedTemplate.is_favorite,
            });
          },
        },
      });
    },
    onError: () => {
      toast.error('Failed to remove favorite');
    },
  });

  const handleRemoveFromFavorites = (template: TemplateItem) => {
    deleteMutation.mutate(template);
  };

  const handleSave = async (data: CreateTemplateRequest) => {
    if (editingTemplate) {
      await updateMutation.mutateAsync({ id: editingTemplate.id, data });
    } else {
      await createMutation.mutateAsync(data);
    }
  };

  const handleEdit = (template: TemplateItem) => {
    setEditingTemplate(template);
    setShowModal(true);
  };

  // Group templates by category
  const groupedTemplates = templateList?.items.reduce((acc, template) => {
    const category = template.category || 'Other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(template);
    return acc;
  }, {} as Record<string, TemplateItem[]>) || {};

  const totalCount = templateList?.items.length || 0;
  const favoriteCount = templateList?.items.filter(t => t.is_favorite).length || 0;

  const frequencyLabels: Record<string, string> = {
    weekly: 'Weekly',
    biweekly: 'Bi-weekly',
    monthly: 'Monthly',
    as_needed: 'As needed',
  };

  if (!workspaceId) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Header - count only, no add button */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {totalCount} item{totalCount !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && totalCount === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Star className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">No favorites yet</p>
          <p className="text-sm mt-1">
            Star items in your Inventory to add them here
          </p>
        </div>
      )}

      {/* Templates grouped by category - styled like Inventory */}
      {!isLoading && totalCount > 0 && (
        <div className="rounded-2xl bg-card shadow-soft overflow-hidden">
          {Object.entries(groupedTemplates)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([category, templates]) => (
              <div key={category}>
                {/* Category header */}
                <div className="px-4 py-2 bg-muted/30 border-b border-border">
                  <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {category}
                  </h3>
                </div>
                {/* Items in category */}
                {templates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => handleEdit(template)}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors',
                      'border-b border-border/50 last:border-b-0',
                      'hover:bg-muted/30 active:bg-muted/50 group'
                    )}
                  >
                    {/* Star - clickable to remove */}
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveFromFavorites(template);
                      }}
                      className="shrink-0 hover:scale-110 transition-transform cursor-pointer"
                      title="Remove from favorites"
                    >
                      <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                    </div>

                    {/* Item name */}
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-foreground capitalize truncate">
                        {template.name}
                      </span>
                    </div>

                    {/* Frequency badge */}
                    {template.frequency && (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground px-2 py-0.5 rounded-full bg-muted/50">
                        <Clock className="w-3 h-3" />
                        <span className="hidden sm:inline">{frequencyLabels[template.frequency]}</span>
                      </span>
                    )}
                  </button>
                ))}
              </div>
            ))}
        </div>
      )}

      {/* Template Modal */}
      <TemplateModal
        open={showModal}
        onOpenChange={(open) => {
          setShowModal(open);
          if (!open) setEditingTemplate(null);
        }}
        template={editingTemplate}
        onSave={handleSave}
        isPending={createMutation.isPending || updateMutation.isPending}
      />
    </div>
  );
};
