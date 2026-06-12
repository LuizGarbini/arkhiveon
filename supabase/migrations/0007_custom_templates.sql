-- Migration: 0007_custom_templates
-- Description: Create table for custom character sheet templates

CREATE TABLE custom_templates (
  id TEXT PRIMARY KEY,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL DEFAULT auth.uid(),
  created_by UUID NOT NULL DEFAULT auth.uid(),
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE custom_templates ENABLE ROW LEVEL SECURITY;

-- Create policies (similarly to other entities, based on memberships if campaign_id is present, or user_id for global ones)
-- We will allow users to read templates from campaigns they are members of, OR templates they own.
CREATE POLICY "Users can read their own templates"
  ON custom_templates FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Members can read campaign templates"
  ON custom_templates FOR SELECT
  USING (
    campaign_id IS NOT NULL AND 
    EXISTS (
      SELECT 1 FROM memberships 
      WHERE memberships.campaign_id = custom_templates.campaign_id 
      AND memberships.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own templates"
  ON custom_templates FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own templates"
  ON custom_templates FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own templates"
  ON custom_templates FOR DELETE
  USING (user_id = auth.uid());

-- Add updated_at trigger
CREATE TRIGGER set_custom_templates_updated_at
  BEFORE UPDATE ON custom_templates
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- Index for querying by campaign or user
CREATE INDEX idx_custom_templates_user_id ON custom_templates(user_id);
CREATE INDEX idx_custom_templates_campaign_id ON custom_templates(campaign_id);
