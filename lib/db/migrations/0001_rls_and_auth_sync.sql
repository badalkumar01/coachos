-- Row-level security + Supabase auth wiring.
--
-- RLS is defence-in-depth. The primary tenancy guarantee is the application
-- layer: every function in lib/db/queries/* takes workspaceId first and filters
-- on it. These policies make a mistake there fail closed rather than leak.
--
-- Note: the app connects with the Postgres role from DATABASE_URL, which is the
-- table owner and therefore BYPASSES RLS. These policies protect access made
-- through PostgREST / the Supabase client libraries (the client portal in
-- Phase 2, and anything using the anon or authenticated roles).

-- ---------------------------------------------------------------------------
-- Link our users mirror to Supabase's auth.users
-- ---------------------------------------------------------------------------

ALTER TABLE "users"
  ADD CONSTRAINT "users_id_auth_users_id_fk"
  FOREIGN KEY ("id") REFERENCES auth.users ("id") ON DELETE CASCADE;

-- Mirror new auth users into public.users automatically, so a workspace can be
-- created on the very first request after sign-up.
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name'),
    NEW.raw_user_meta_data ->> 'avatar_url'
  )
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, public.users.full_name),
        avatar_url = COALESCE(EXCLUDED.avatar_url, public.users.avatar_url),
        updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- ---------------------------------------------------------------------------
-- Helper: the workspaces the current auth user belongs to
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.current_user_workspace_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT workspace_id FROM public.memberships WHERE user_id = auth.uid();
$$;

-- ---------------------------------------------------------------------------
-- Enable RLS
-- ---------------------------------------------------------------------------

ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "workspaces" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "workspace_config" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "memberships" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "clients" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "action_items" ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Policies
-- ---------------------------------------------------------------------------

-- A user can see and update only their own mirror row.
CREATE POLICY "users_self_select" ON "users"
  FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "users_self_update" ON "users"
  FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- Workspaces: members read; only the owner writes.
CREATE POLICY "workspaces_member_select" ON "workspaces"
  FOR SELECT TO authenticated
  USING (id IN (SELECT public.current_user_workspace_ids()));
CREATE POLICY "workspaces_owner_update" ON "workspaces"
  FOR UPDATE TO authenticated
  USING (owner_user_id = auth.uid()) WITH CHECK (owner_user_id = auth.uid());
CREATE POLICY "workspaces_owner_insert" ON "workspaces"
  FOR INSERT TO authenticated WITH CHECK (owner_user_id = auth.uid());

-- Memberships: a user sees their own rows, plus everyone in their workspaces.
CREATE POLICY "memberships_member_select" ON "memberships"
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR workspace_id IN (SELECT public.current_user_workspace_ids()));

-- Workspace-owned tables: full access scoped to the caller's workspaces.
CREATE POLICY "workspace_config_member_all" ON "workspace_config"
  FOR ALL TO authenticated
  USING (workspace_id IN (SELECT public.current_user_workspace_ids()))
  WITH CHECK (workspace_id IN (SELECT public.current_user_workspace_ids()));

CREATE POLICY "clients_member_all" ON "clients"
  FOR ALL TO authenticated
  USING (workspace_id IN (SELECT public.current_user_workspace_ids()))
  WITH CHECK (workspace_id IN (SELECT public.current_user_workspace_ids()));

CREATE POLICY "sessions_member_all" ON "sessions"
  FOR ALL TO authenticated
  USING (workspace_id IN (SELECT public.current_user_workspace_ids()))
  WITH CHECK (workspace_id IN (SELECT public.current_user_workspace_ids()));

CREATE POLICY "action_items_member_all" ON "action_items"
  FOR ALL TO authenticated
  USING (workspace_id IN (SELECT public.current_user_workspace_ids()))
  WITH CHECK (workspace_id IN (SELECT public.current_user_workspace_ids()));
