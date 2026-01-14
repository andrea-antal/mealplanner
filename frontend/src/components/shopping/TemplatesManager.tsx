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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Star className="w-5 h-5 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {totalCount} favorite{totalCount !== 1 ? 's' : ''}
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setEditingTemplate(null);
            setShowModal(true);
          }}
        >
          ⭐️ Add Favorite
        </Button>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && totalCount === 0 && (
        <div className="text-center py-12 text-muted-foreground border rounded-lg">
          <Star className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">No favorites yet</p>
          <p className="text-sm mt-1 mb-4">Add items you buy regularly for quick access</p>
          <Button
            variant="outline"
            onClick={() => {
              setEditingTemplate(null);
              setShowModal(true);
            }}
          >
            ⭐️ Add First Favorite
          </Button>
        </div>
      )}

      {/* Templates grouped by category */}
      {!isLoading && totalCount > 0 && (
        <div className="space-y-4">
          {Object.entries(groupedTemplates)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([category, templates]) => (
              <div key={category} className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground capitalize">
                  {category}
                </h3>
                <div className="space-y-1">
                  {templates.map((template) => (
                    <div
                      key={template.id}
                      className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors group"
                    >
                      {/* Star toggle - clickable to remove from favorites */}
                      <button
                        onClick={() => handleRemoveFromFavorites(template)}
                        className="shrink-0 hover:scale-110 transition-transform"
                        title="Remove from favorites"
                      >
                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                      </button>

                      {/* Template info - clickable to edit */}
                      <button
                        onClick={() => handleEdit(template)}
                        className="flex-1 min-w-0 text-left"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium truncate">
                            {template.name}
                          </span>
                          {template.default_quantity && (
                            <span className="text-xs text-muted-foreground">
                              ({template.default_quantity})
                            </span>
                          )}
                        </div>
                        {template.frequency && (
                          <div className="flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              {frequencyLabels[template.frequency]}
                            </span>
                          </div>
                        )}
                      </button>

                      {/* Add to list button (only if callback provided) */}
                      {onAddToList && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onAddToList([template.id])}
                          title="Add to shopping list"
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <ListPlus className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
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
