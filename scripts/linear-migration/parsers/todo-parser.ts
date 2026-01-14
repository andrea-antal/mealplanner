import { readFileSync } from 'fs';
import type { ParsedTodo } from '../types.js';

/**
 * Parse to-do.md file and extract actionable items
 */
export function parseTodoMd(filePath: string): ParsedTodo[] {
  const content = readFileSync(filePath, 'utf-8');
  const todos: ParsedTodo[] = [];

  // Split into sections by # headers
  const sections = content.split(/^#\s+/m).filter(Boolean);

  for (const section of sections) {
    const lines = section.trim().split('\n');
    const sectionTitle = lines[0]?.trim().toUpperCase() || '';

    // Skip the main "TO DO" header section that contains meta tasks about Linear
    if (sectionTitle === 'TO DO') {
      continue;
    }

    // Map section titles to categories
    let category: ParsedTodo['category'];
    let labels: string[] = [];
    let defaultPriority: 1 | 2 | 3 | 4 = 3;

    switch (sectionTitle) {
      case 'FEATURES':
        category = 'feature';
        labels = ['feature'];
        defaultPriority = 3;
        break;
      case 'DISCUSS':
        category = 'discuss';
        labels = ['feature'];
        defaultPriority = 4;
        break;
      case 'UI/UX':
        category = 'feature';
        labels = ['feature', 'frontend'];
        defaultPriority = 3;
        break;
      case 'BUGS TO FIX':
        category = 'bug';
        labels = ['bug'];
        defaultPriority = 2;
        break;
      case 'META/DEVOPS':
        category = 'devops';
        labels = ['devops'];
        defaultPriority = 2;
        break;
      default:
        continue;
    }

    // Parse items (lines starting with -)
    let currentItem: ParsedTodo | null = null;

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();

      // Skip empty lines
      if (!trimmedLine) continue;

      // Main item (starts with - at beginning)
      if (line.startsWith('- ')) {
        // Save previous item if exists
        if (currentItem) {
          todos.push(currentItem);
        }

        const title = trimmedLine.slice(2).trim();

        // Skip if empty or if it's about setting up Linear (meta/circular)
        if (!title || title.toLowerCase().includes('set up linear')) {
          currentItem = null;
          continue;
        }

        // Infer additional labels from content
        const inferredLabels = [...labels];
        if (title.toLowerCase().includes('daycare') || title.toLowerCase().includes('household')) {
          inferredLabels.push('household');
        }
        if (title.toLowerCase().includes('grocery') || title.toLowerCase().includes('pantry') || title.toLowerCase().includes('freezer')) {
          inferredLabels.push('groceries');
        }
        if (title.toLowerCase().includes('meal plan') || title.toLowerCase().includes('vibe')) {
          inferredLabels.push('meal-plans');
        }
        if (title.toLowerCase().includes('recipe')) {
          inferredLabels.push('recipes');
        }
        if (title.toLowerCase().includes('volume') || title.toLowerCase().includes('backend') || title.toLowerCase().includes('railway')) {
          inferredLabels.push('backend');
        }

        // Create the todo item
        currentItem = {
          title: formatTitle(title, category),
          category,
          details: [],
          priority: defaultPriority,
          labels: [...new Set(inferredLabels)], // Dedupe
          migrationId: `todo:${slugify(title)}`,
        };
      }
      // Sub-item (starts with whitespace + -)
      else if (line.match(/^\s+-\s+/) || line.match(/^\t-\s+/)) {
        if (currentItem) {
          currentItem.details = currentItem.details || [];
          currentItem.details.push(trimmedLine.slice(2).trim());
        }
      }
    }

    // Don't forget the last item
    if (currentItem) {
      todos.push(currentItem);
    }
  }

  return todos;
}

/**
 * Format title based on category
 */
function formatTitle(title: string, category: ParsedTodo['category']): string {
  // Capitalize first letter
  const capitalizedTitle = title.charAt(0).toUpperCase() + title.slice(1);

  // Add prefix for discussion items
  if (category === 'discuss') {
    return `[Discussion] ${capitalizedTitle}`;
  }

  return capitalizedTitle;
}

/**
 * Create a URL-safe slug from a string
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
}

/**
 * Format todo item as Linear issue description
 */
export function formatTodoDescription(todo: ParsedTodo): string {
  let description = `## Summary\n${todo.title}\n`;

  if (todo.details && todo.details.length > 0) {
    description += `\n## Details\n`;
    for (const detail of todo.details) {
      description += `- ${detail}\n`;
    }
  }

  description += `\n## Source\nMigrated from \`to-do.md\` (${todo.category} section)`;

  return description;
}
