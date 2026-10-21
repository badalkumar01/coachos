-- Deleting a coach's auth user must delete their workspace and its data.
--
-- Previously workspaces.owner_user_id was ON DELETE RESTRICT, which made the
-- owner's users row undeletable while a workspace existed. That in turn blocked
-- deleting the auth.users row, and Supabase surfaced it only as an opaque
-- "Database error deleting user" -- so account deletion was impossible.
--
-- Phase 3 (teams) must add an app-layer rule requiring ownership transfer
-- before an owner can be removed from a shared workspace.

ALTER TABLE "workspaces" DROP CONSTRAINT "workspaces_owner_user_id_users_id_fk";

ALTER TABLE "workspaces"
  ADD CONSTRAINT "workspaces_owner_user_id_users_id_fk"
  FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE CASCADE;
