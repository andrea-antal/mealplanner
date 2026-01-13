-- Shopping List V1 Migration
-- Run this in Supabase SQL Editor to create the required tables

-- Shopping Lists table (ephemeral, per-shopping-trip)
CREATE TABLE IF NOT EXISTS shopping_lists (
    workspace_id TEXT PRIMARY KEY,
    items JSONB DEFAULT '[]'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Shopping Templates table (persistent, user's recurring items)
CREATE TABLE IF NOT EXISTS shopping_templates (
    workspace_id TEXT PRIMARY KEY,
    items JSONB DEFAULT '[]'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE shopping_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for shopping_lists
-- Allow authenticated users to read/write their own workspace data
CREATE POLICY "Users can view their own shopping list"
    ON shopping_lists FOR SELECT
    USING (auth.uid()::text = workspace_id OR workspace_id IN (
        SELECT workspace_id FROM profiles WHERE id = auth.uid()
    ));

CREATE POLICY "Users can insert their own shopping list"
    ON shopping_lists FOR INSERT
    WITH CHECK (auth.uid()::text = workspace_id OR workspace_id IN (
        SELECT workspace_id FROM profiles WHERE id = auth.uid()
    ));

CREATE POLICY "Users can update their own shopping list"
    ON shopping_lists FOR UPDATE
    USING (auth.uid()::text = workspace_id OR workspace_id IN (
        SELECT workspace_id FROM profiles WHERE id = auth.uid()
    ));

CREATE POLICY "Users can delete their own shopping list"
    ON shopping_lists FOR DELETE
    USING (auth.uid()::text = workspace_id OR workspace_id IN (
        SELECT workspace_id FROM profiles WHERE id = auth.uid()
    ));

-- RLS Policies for shopping_templates
CREATE POLICY "Users can view their own templates"
    ON shopping_templates FOR SELECT
    USING (auth.uid()::text = workspace_id OR workspace_id IN (
        SELECT workspace_id FROM profiles WHERE id = auth.uid()
    ));

CREATE POLICY "Users can insert their own templates"
    ON shopping_templates FOR INSERT
    WITH CHECK (auth.uid()::text = workspace_id OR workspace_id IN (
        SELECT workspace_id FROM profiles WHERE id = auth.uid()
    ));

CREATE POLICY "Users can update their own templates"
    ON shopping_templates FOR UPDATE
    USING (auth.uid()::text = workspace_id OR workspace_id IN (
        SELECT workspace_id FROM profiles WHERE id = auth.uid()
    ));

CREATE POLICY "Users can delete their own templates"
    ON shopping_templates FOR DELETE
    USING (auth.uid()::text = workspace_id OR workspace_id IN (
        SELECT workspace_id FROM profiles WHERE id = auth.uid()
    ));

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_shopping_lists_updated
    ON shopping_lists(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_shopping_templates_updated
    ON shopping_templates(updated_at DESC);

-- Grant service role access (for admin operations)
GRANT ALL ON shopping_lists TO service_role;
GRANT ALL ON shopping_templates TO service_role;
