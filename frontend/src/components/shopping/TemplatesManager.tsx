import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  templatesAPI,
  type TemplateItem,
  type CreateTemplateRequest,
} from '@/lib/api';
import { getCurrentWorkspace } from '@/lib/workspace';
import { TemplateModal } from './TemplateModal';
import {
  Plus,
  Trash2,
  Edit2,
  Loader2,
  Star,
  Clock,
  ListPlus,
  Bookmark,
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
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<TemplateItem | null>(null);

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
      toast.success('Template created');
    },
    onError: () => {
      toast.error('Failed to create template');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateTemplateRequest> }) =>
      templatesAPI.update(workspaceId!, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopping-templates', workspaceId] });
      setShowModal(false);
      setEditingTemplate(null);
      toast.success('Template updated');
    },
    onError: () => {
      toast.error('Failed to update template');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => templatesAPI.delete(workspaceId!, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopping-templates', workspaceId] });
      setShowDeleteDialog(false);
      setTemplateToDelete(null);
      toast.success('Template deleted');
    },
    onError: () => {
      toast.error('Failed to delete template');
    },
  });

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

  const handleDeleteRequest = (template: TemplateItem) => {
    setTemplateToDelete(template);
    setShowDeleteDialog(true);
  };

  const confirmDelete = () => {
    if (templateToDelete) {
      deleteMutation.mutate(templateToDelete.id);
    }
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
          <Bookmark className="w-5 h-5 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {totalCount} template{totalCount !== 1 ? 's' : ''}
            {favoriteCount > 0 && (
              <span className="ml-1">({favoriteCount} favorite{favoriteCount !== 1 ? 's' : ''})</span>
            )}
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
          <Plus className="w-4 h-4 mr-1" />
          New Template
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
          <Bookmark className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">No templates yet</p>
          <p className="text-sm mt-1 mb-4">Create templates for items you buy regularly</p>
          <Button
            variant="outline"
            onClick={() => {
              setEditingTemplate(null);
              setShowModal(true);
            }}
          >
            <Plus className="w-4 h-4 mr-1" />
            Create First Template
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
                      className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors group"
                    >
                      {/* Favorite indicator */}
                      {template.is_favorite && (
                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500 shrink-0" />
                      )}

                      {/* Template info */}
                      <div className="flex-1 min-w-0">
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
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {onAddToList && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onAddToList([template.id])}
                            title="Add to shopping list"
                          >
                            <ListPlus className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(template)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteRequest(template)}
                        >
                          <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                        </Button>
                      </div>
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

      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{templateToDelete?.name}"?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
