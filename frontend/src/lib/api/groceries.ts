import { API_BASE_URL, APIError, handleResponse } from './client';
import type {
  GroceryItem,
  GroceryList,
  VoiceParseResponse,
  ReceiptParseResponse,
  ShoppingList,
  ShoppingListItem,
  AddShoppingItemRequest,
  TemplateList,
  TemplateItem,
  CreateTemplateRequest,
} from './types';

export const groceriesAPI = {
  async getAll(workspaceId: string): Promise<GroceryList> {
    const response = await fetch(`${API_BASE_URL}/groceries?workspace_id=${encodeURIComponent(workspaceId)}`);
    return handleResponse<GroceryList>(response);
  },

  async add(workspaceId: string, item: GroceryItem): Promise<GroceryItem> {
    const response = await fetch(`${API_BASE_URL}/groceries?workspace_id=${encodeURIComponent(workspaceId)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });
    return handleResponse<GroceryItem>(response);
  },

  async delete(workspaceId: string, name: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/groceries/${encodeURIComponent(name)}?workspace_id=${encodeURIComponent(workspaceId)}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new APIError(response.status, `Failed to delete grocery: ${errorText}`);
    }
  },

  async getExpiringSoon(workspaceId: string, daysAhead: number = 1): Promise<GroceryList> {
    const response = await fetch(`${API_BASE_URL}/groceries/expiring-soon?workspace_id=${encodeURIComponent(workspaceId)}&days_ahead=${daysAhead}`);
    return handleResponse<GroceryList>(response);
  },

  async parseVoice(workspaceId: string, transcription: string): Promise<VoiceParseResponse> {
    const response = await fetch(`${API_BASE_URL}/groceries/parse-voice?workspace_id=${encodeURIComponent(workspaceId)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcription }),
    });
    return handleResponse<VoiceParseResponse>(response);
  },

  async batchAdd(workspaceId: string, items: GroceryItem[]): Promise<GroceryList> {
    const response = await fetch(`${API_BASE_URL}/groceries/batch?workspace_id=${encodeURIComponent(workspaceId)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items }),
    });
    return handleResponse<GroceryList>(response);
  },

  async batchDelete(workspaceId: string, itemNames: string[]): Promise<GroceryList> {
    const response = await fetch(`${API_BASE_URL}/groceries/batch?workspace_id=${encodeURIComponent(workspaceId)}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item_names: itemNames }),
    });
    return handleResponse<GroceryList>(response);
  },

  async parseReceipt(workspaceId: string, imageBase64: string): Promise<ReceiptParseResponse> {
    const response = await fetch(`${API_BASE_URL}/groceries/parse-receipt?workspace_id=${encodeURIComponent(workspaceId)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_base64: imageBase64 }),
    });
    return handleResponse<ReceiptParseResponse>(response);
  },

  async updateStorageLocation(
    workspaceId: string,
    itemNames: string[],
    storageLocation: 'fridge' | 'pantry'
  ): Promise<GroceryList> {
    const response = await fetch(`${API_BASE_URL}/groceries/storage-location?workspace_id=${encodeURIComponent(workspaceId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item_names: itemNames, storage_location: storageLocation }),
    });
    return handleResponse<GroceryList>(response);
  },
};

export const shoppingListAPI = {
  async getAll(workspaceId: string): Promise<ShoppingList> {
    const response = await fetch(`${API_BASE_URL}/shopping-list?workspace_id=${encodeURIComponent(workspaceId)}`);
    return handleResponse<ShoppingList>(response);
  },

  async addItem(workspaceId: string, item: AddShoppingItemRequest): Promise<ShoppingListItem> {
    const response = await fetch(`${API_BASE_URL}/shopping-list/items?workspace_id=${encodeURIComponent(workspaceId)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });
    return handleResponse<ShoppingListItem>(response);
  },

  async updateItem(
    workspaceId: string,
    itemId: string,
    updates: { name?: string; quantity?: string; is_checked?: boolean }
  ): Promise<ShoppingListItem> {
    const response = await fetch(`${API_BASE_URL}/shopping-list/items/${itemId}?workspace_id=${encodeURIComponent(workspaceId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    return handleResponse<ShoppingListItem>(response);
  },

  async deleteItem(workspaceId: string, itemId: string): Promise<ShoppingList> {
    const response = await fetch(`${API_BASE_URL}/shopping-list/items/${itemId}?workspace_id=${encodeURIComponent(workspaceId)}`, {
      method: 'DELETE',
    });
    return handleResponse<ShoppingList>(response);
  },

  async clearAll(workspaceId: string): Promise<ShoppingList> {
    const response = await fetch(`${API_BASE_URL}/shopping-list?workspace_id=${encodeURIComponent(workspaceId)}`, {
      method: 'DELETE',
    });
    return handleResponse<ShoppingList>(response);
  },

  async checkOff(workspaceId: string, itemId: string, addToInventory: boolean = false): Promise<ShoppingListItem> {
    const response = await fetch(`${API_BASE_URL}/shopping-list/check-off?workspace_id=${encodeURIComponent(workspaceId)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item_id: itemId, add_to_inventory: addToInventory }),
    });
    return handleResponse<ShoppingListItem>(response);
  },

  async addFromTemplates(workspaceId: string, templateIds: string[]): Promise<ShoppingList> {
    const response = await fetch(`${API_BASE_URL}/shopping-list/from-templates?workspace_id=${encodeURIComponent(workspaceId)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ template_ids: templateIds }),
    });
    return handleResponse<ShoppingList>(response);
  },

  async addFromFavorites(workspaceId: string): Promise<ShoppingList> {
    const response = await fetch(`${API_BASE_URL}/shopping-list/from-favorites?workspace_id=${encodeURIComponent(workspaceId)}`, {
      method: 'POST',
    });
    return handleResponse<ShoppingList>(response);
  },

  async batchAdd(workspaceId: string, items: AddShoppingItemRequest[]): Promise<ShoppingList> {
    const response = await fetch(
      `${API_BASE_URL}/shopping-list/items/batch?workspace_id=${encodeURIComponent(workspaceId)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      }
    );
    return handleResponse<ShoppingList>(response);
  },
};

export const templatesAPI = {
  async getAll(workspaceId: string): Promise<TemplateList> {
    const response = await fetch(`${API_BASE_URL}/shopping-templates?workspace_id=${encodeURIComponent(workspaceId)}`);
    return handleResponse<TemplateList>(response);
  },

  async create(workspaceId: string, template: CreateTemplateRequest): Promise<TemplateItem> {
    const response = await fetch(`${API_BASE_URL}/shopping-templates?workspace_id=${encodeURIComponent(workspaceId)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(template),
    });
    return handleResponse<TemplateItem>(response);
  },

  async update(
    workspaceId: string,
    templateId: string,
    updates: Partial<CreateTemplateRequest>
  ): Promise<TemplateItem> {
    const response = await fetch(`${API_BASE_URL}/shopping-templates/${templateId}?workspace_id=${encodeURIComponent(workspaceId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    return handleResponse<TemplateItem>(response);
  },

  async delete(workspaceId: string, templateId: string): Promise<TemplateList> {
    const response = await fetch(`${API_BASE_URL}/shopping-templates/${templateId}?workspace_id=${encodeURIComponent(workspaceId)}`, {
      method: 'DELETE',
    });
    return handleResponse<TemplateList>(response);
  },
};
