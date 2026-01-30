-- Enable RLS on all public schema tables
-- This migration fixes the Supabase security warning about RLS being disabled

-- ============================================================================
-- PROFILES TABLE (links auth users to workspaces)
-- ============================================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can only view their own profile
CREATE POLICY "Users can view their own profile"
    ON profiles FOR SELECT
    USING (auth.uid() = id);

-- Users can insert their own profile
CREATE POLICY "Users can insert their own profile"
    ON profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update their own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id);

-- Users can delete their own profile
CREATE POLICY "Users can delete their own profile"
    ON profiles FOR DELETE
    USING (auth.uid() = id);

GRANT ALL ON profiles TO service_role;

-- ============================================================================
-- RECIPES TABLE
-- ============================================================================
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own recipes"
    ON recipes FOR SELECT
    USING (auth.uid()::text = workspace_id OR workspace_id IN (
        SELECT workspace_id FROM profiles WHERE id = auth.uid()
    ));

CREATE POLICY "Users can insert their own recipes"
    ON recipes FOR INSERT
    WITH CHECK (auth.uid()::text = workspace_id OR workspace_id IN (
        SELECT workspace_id FROM profiles WHERE id = auth.uid()
    ));

CREATE POLICY "Users can update their own recipes"
    ON recipes FOR UPDATE
    USING (auth.uid()::text = workspace_id OR workspace_id IN (
        SELECT workspace_id FROM profiles WHERE id = auth.uid()
    ));

CREATE POLICY "Users can delete their own recipes"
    ON recipes FOR DELETE
    USING (auth.uid()::text = workspace_id OR workspace_id IN (
        SELECT workspace_id FROM profiles WHERE id = auth.uid()
    ));

GRANT ALL ON recipes TO service_role;

-- ============================================================================
-- MEAL_PLANS TABLE
-- ============================================================================
ALTER TABLE meal_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own meal plans"
    ON meal_plans FOR SELECT
    USING (auth.uid()::text = workspace_id OR workspace_id IN (
        SELECT workspace_id FROM profiles WHERE id = auth.uid()
    ));

CREATE POLICY "Users can insert their own meal plans"
    ON meal_plans FOR INSERT
    WITH CHECK (auth.uid()::text = workspace_id OR workspace_id IN (
        SELECT workspace_id FROM profiles WHERE id = auth.uid()
    ));

CREATE POLICY "Users can update their own meal plans"
    ON meal_plans FOR UPDATE
    USING (auth.uid()::text = workspace_id OR workspace_id IN (
        SELECT workspace_id FROM profiles WHERE id = auth.uid()
    ));

CREATE POLICY "Users can delete their own meal plans"
    ON meal_plans FOR DELETE
    USING (auth.uid()::text = workspace_id OR workspace_id IN (
        SELECT workspace_id FROM profiles WHERE id = auth.uid()
    ));

GRANT ALL ON meal_plans TO service_role;

-- ============================================================================
-- HOUSEHOLD_PROFILES TABLE
-- ============================================================================
ALTER TABLE household_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own household profile"
    ON household_profiles FOR SELECT
    USING (auth.uid()::text = workspace_id OR workspace_id IN (
        SELECT workspace_id FROM profiles WHERE id = auth.uid()
    ));

CREATE POLICY "Users can insert their own household profile"
    ON household_profiles FOR INSERT
    WITH CHECK (auth.uid()::text = workspace_id OR workspace_id IN (
        SELECT workspace_id FROM profiles WHERE id = auth.uid()
    ));

CREATE POLICY "Users can update their own household profile"
    ON household_profiles FOR UPDATE
    USING (auth.uid()::text = workspace_id OR workspace_id IN (
        SELECT workspace_id FROM profiles WHERE id = auth.uid()
    ));

CREATE POLICY "Users can delete their own household profile"
    ON household_profiles FOR DELETE
    USING (auth.uid()::text = workspace_id OR workspace_id IN (
        SELECT workspace_id FROM profiles WHERE id = auth.uid()
    ));

GRANT ALL ON household_profiles TO service_role;

-- ============================================================================
-- GROCERIES TABLE
-- ============================================================================
ALTER TABLE groceries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own groceries"
    ON groceries FOR SELECT
    USING (auth.uid()::text = workspace_id OR workspace_id IN (
        SELECT workspace_id FROM profiles WHERE id = auth.uid()
    ));

CREATE POLICY "Users can insert their own groceries"
    ON groceries FOR INSERT
    WITH CHECK (auth.uid()::text = workspace_id OR workspace_id IN (
        SELECT workspace_id FROM profiles WHERE id = auth.uid()
    ));

CREATE POLICY "Users can update their own groceries"
    ON groceries FOR UPDATE
    USING (auth.uid()::text = workspace_id OR workspace_id IN (
        SELECT workspace_id FROM profiles WHERE id = auth.uid()
    ));

CREATE POLICY "Users can delete their own groceries"
    ON groceries FOR DELETE
    USING (auth.uid()::text = workspace_id OR workspace_id IN (
        SELECT workspace_id FROM profiles WHERE id = auth.uid()
    ));

GRANT ALL ON groceries TO service_role;

-- ============================================================================
-- RECIPE_RATINGS TABLE
-- ============================================================================
ALTER TABLE recipe_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own recipe ratings"
    ON recipe_ratings FOR SELECT
    USING (auth.uid()::text = workspace_id OR workspace_id IN (
        SELECT workspace_id FROM profiles WHERE id = auth.uid()
    ));

CREATE POLICY "Users can insert their own recipe ratings"
    ON recipe_ratings FOR INSERT
    WITH CHECK (auth.uid()::text = workspace_id OR workspace_id IN (
        SELECT workspace_id FROM profiles WHERE id = auth.uid()
    ));

CREATE POLICY "Users can update their own recipe ratings"
    ON recipe_ratings FOR UPDATE
    USING (auth.uid()::text = workspace_id OR workspace_id IN (
        SELECT workspace_id FROM profiles WHERE id = auth.uid()
    ));

CREATE POLICY "Users can delete their own recipe ratings"
    ON recipe_ratings FOR DELETE
    USING (auth.uid()::text = workspace_id OR workspace_id IN (
        SELECT workspace_id FROM profiles WHERE id = auth.uid()
    ));

GRANT ALL ON recipe_ratings TO service_role;

-- ============================================================================
-- ADMIN-ONLY TABLES (no user access, service_role only)
-- ============================================================================

-- INVITE_CODES TABLE
ALTER TABLE invite_codes ENABLE ROW LEVEL SECURITY;
-- No user policies - only service_role can access
GRANT ALL ON invite_codes TO service_role;

-- INVITE_REDEMPTIONS TABLE
ALTER TABLE invite_redemptions ENABLE ROW LEVEL SECURITY;
-- No user policies - only service_role can access
GRANT ALL ON invite_redemptions TO service_role;

-- WORKSPACE_MIGRATIONS TABLE
ALTER TABLE workspace_migrations ENABLE ROW LEVEL SECURITY;
-- No user policies - only service_role can access
GRANT ALL ON workspace_migrations TO service_role;
