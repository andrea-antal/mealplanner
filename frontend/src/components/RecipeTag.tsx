import { Badge } from '@/components/ui/badge';
import type { BadgeProps } from '@/components/ui/badge';

interface RecipeTagProps {
  tag: string;
}

const tagVariantMap: Record<string, BadgeProps['variant']> = {
  'toddler-friendly': 'toddler',
  'quick': 'quick',
  'daycare-safe': 'daycare',
  'husband-approved': 'approved',
  'one-pot': 'onepot',
  'batch-cookable': 'batch',
  'breakfast': 'breakfast',
  'sheet pan': 'onepot',
};

const tagEmojiMap: Record<string, string> = {
  'toddler-friendly': '🍎',
  'quick': '⚡',
  'daycare-safe': '🏫',
  'husband-approved': '👍',
  'one-pot': '🍲',
  'batch-cookable': '🥘',
  'breakfast': '🍳',
  'sheet pan': '🍲',
};

export function RecipeTag({ tag }: RecipeTagProps) {
  const variant = tagVariantMap[tag] || 'secondary';
  const emoji = tagEmojiMap[tag] || '';

  return (
    <Badge variant={variant} className="gap-1">
      {emoji && <span>{emoji}</span>}
      {tag}
    </Badge>
  );
}
