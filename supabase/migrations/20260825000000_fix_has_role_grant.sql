-- Fix: has_role() must be executable by authenticated users because RLS policies
-- on profiles, loans, payments and user_roles call it directly during query evaluation.
-- Migration 20260819152820 incorrectly revoked this grant.

GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
