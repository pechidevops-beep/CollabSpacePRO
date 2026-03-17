-- CollabSpace Phase 3: Notifications & RBAC
-- Run this in Supabase SQL Editor

-- ─── Notifications ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT DEFAULT '',
  link TEXT DEFAULT '',
  read BOOLEAN DEFAULT false,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  actor_id UUID,
  actor_email TEXT DEFAULT '',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read, created_at DESC);

-- ─── RBAC: Add role to workspace_members ─────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workspace_members' AND column_name = 'role'
  ) THEN
    ALTER TABLE workspace_members ADD COLUMN role TEXT DEFAULT 'editor';
  END IF;
END $$;

-- ─── RLS ─────────────────────────────────────────────────────────────
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access on notifications" ON notifications;
CREATE POLICY "Service role full access on notifications"
  ON notifications FOR ALL USING (true) WITH CHECK (true);
