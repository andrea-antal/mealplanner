import { useState, useRef, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { groceriesAPI, shoppingListAPI, type GroceryItem, type ShoppingListItem } from '@/lib/api';
import { UndoCountdownToast } from '@/components/groceries/UndoCountdownToast';

export type NukeScope = 'inventory' | 'shopping' | 'both';

const UNDO_TIMEOUT_MS = 10000;

interface PendingNuke {
  id: string;
  scope: NukeScope;
  inventoryItems: GroceryItem[];
  shoppingItems: ShoppingListItem[];
}

interface UseNukeWithUndoOptions {
  workspaceId: string;
}

export function useNukeWithUndo({ workspaceId }: UseNukeWithUndoOptions) {
  const queryClient = useQueryClient();
  const [pendingNuke, setPendingNuke] = useState<PendingNuke | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const toastIdRef = useRef<string | number | null>(null);
  // Use ref to store nuke data for undo callback (avoids stale closure)
  const pendingNukeRef = useRef<PendingNuke | null>(null);

  // Cleanup on unmount - cancel pending delete (safe default)
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (toastIdRef.current) {
        toast.dismiss(toastIdRef.current);
      }
    };
  }, []);

  const executeActualDelete = useCallback(async (nuke: PendingNuke) => {
    try {
      const promises: Promise<unknown>[] = [];

      if (nuke.scope === 'inventory' || nuke.scope === 'both') {
        const itemNames = nuke.inventoryItems.map(item => item.name);
        if (itemNames.length > 0) {
          promises.push(groceriesAPI.batchDelete(workspaceId, itemNames));
        }
      }

      if (nuke.scope === 'shopping' || nuke.scope === 'both') {
        if (nuke.shoppingItems.length > 0) {
          promises.push(shoppingListAPI.clearAll(workspaceId));
        }
      }

      await Promise.all(promises);

      // Invalidate queries to sync with server
      queryClient.invalidateQueries({ queryKey: ['groceries', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['shopping-list', workspaceId] });

      toast.success('Items deleted');
    } catch (error) {
      console.error('Failed to delete items:', error);
      toast.error('Failed to delete items. Please refresh the page.');
    } finally {
      setPendingNuke(null);
      pendingNukeRef.current = null;
    }
  }, [workspaceId, queryClient]);

  const undoNuke = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (toastIdRef.current) {
      toast.dismiss(toastIdRef.current);
      toastIdRef.current = null;
    }

    // Read from ref to avoid stale closure issue
    const nukeData = pendingNukeRef.current;
    if (nukeData) {
      if (nukeData.scope === 'inventory' || nukeData.scope === 'both') {
        queryClient.setQueryData(['groceries', workspaceId], (old: { items: GroceryItem[] } | undefined) => ({
          items: [...(old?.items || []), ...nukeData.inventoryItems]
        }));
      }

      if (nukeData.scope === 'shopping' || nukeData.scope === 'both') {
        queryClient.setQueryData(['shopping-list', workspaceId], (old: { items: ShoppingListItem[] } | undefined) => ({
          items: [...(old?.items || []), ...nukeData.shoppingItems]
        }));
      }
    }

    setPendingNuke(null);
    pendingNukeRef.current = null;
    toast.success('Undo successful - items restored');
  }, [workspaceId, queryClient]);

  const executeNuke = useCallback((
    scope: NukeScope,
    inventoryItems: GroceryItem[],
    shoppingItems: ShoppingListItem[]
  ) => {
    // Cancel any existing pending nuke
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (toastIdRef.current) {
      toast.dismiss(toastIdRef.current);
    }

    const nukeData: PendingNuke = {
      id: crypto.randomUUID(),
      scope,
      inventoryItems: scope === 'shopping' ? [] : inventoryItems,
      shoppingItems: scope === 'inventory' ? [] : shoppingItems,
    };

    // Store in both state and ref
    setPendingNuke(nukeData);
    pendingNukeRef.current = nukeData;

    // Optimistically remove items from cache
    if (scope === 'inventory' || scope === 'both') {
      queryClient.setQueryData(['groceries', workspaceId], { items: [] });
    }

    if (scope === 'shopping' || scope === 'both') {
      queryClient.setQueryData(['shopping-list', workspaceId], { items: [] });
    }

    const totalCount = nukeData.inventoryItems.length + nukeData.shoppingItems.length;

    // Show toast with countdown and undo action
    toastIdRef.current = toast.custom(
      () => (
        <UndoCountdownToast
          itemCount={totalCount}
          durationMs={UNDO_TIMEOUT_MS}
          onUndo={undoNuke}
        />
      ),
      {
        duration: UNDO_TIMEOUT_MS + 500, // Slightly longer to avoid flicker
      }
    );

    // Schedule actual deletion
    timeoutRef.current = setTimeout(() => {
      executeActualDelete(nukeData);
      timeoutRef.current = null;
      if (toastIdRef.current) {
        toast.dismiss(toastIdRef.current);
        toastIdRef.current = null;
      }
    }, UNDO_TIMEOUT_MS);
  }, [workspaceId, queryClient, undoNuke, executeActualDelete]);

  return {
    pendingNuke,
    isNuking: pendingNuke !== null,
    executeNuke,
    undoNuke,
  };
}
