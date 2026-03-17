-- CollabSpace Activity Feed Tables
-- Run this in Supabase SQL Editor

-- Activity logs for dashboard feed
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  user_email TEXT DEFAULT '',
  action TEXT NOT NULL,
  target_type TEXT,
  target_id UUID,
  target_name TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_workspace ON activity_logs(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_user ON activity_logs(user_id, created_at DESC);

-- RLS
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access on activity_logs" ON activity_logs;
CREATE POLICY "Service role full access on activity_logs"
  ON activity_logs FOR ALL USING (true) WITH CHECK (true);
