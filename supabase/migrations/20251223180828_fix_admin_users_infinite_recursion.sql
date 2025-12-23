/*
  # Fix Admin Users Infinite Recursion

  ## Problem
  The admin management policies created infinite recursion by checking admin_users 
  table within policies on the admin_users table itself.

  ## Solution
  1. Drop the problematic policies
  2. Create a security definer function to check admin status
  3. Recreate policies using the function instead of direct table queries
  
  ## Security
  - Function uses SECURITY DEFINER to bypass RLS when checking admin status
  - Policies still restrict access appropriately
*/

-- Drop the problematic policies
DROP POLICY IF EXISTS "Admins can view all admin users" ON admin_users;
DROP POLICY IF EXISTS "Admins can grant admin privileges" ON admin_users;
DROP POLICY IF EXISTS "Admins can revoke admin privileges" ON admin_users;

-- Create a function to check if a user is an admin (bypasses RLS)
CREATE OR REPLACE FUNCTION is_admin(user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM admin_users WHERE id = user_id
  );
$$;

-- Recreate policies using the function
CREATE POLICY "Admins can view all admin users"
  ON admin_users
  FOR SELECT
  TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can grant admin privileges"
  ON admin_users
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can revoke admin privileges"
  ON admin_users
  FOR DELETE
  TO authenticated
  USING (is_admin(auth.uid()));
