/*
  # Add Admin Management Policies

  ## Changes
  - Adds policy for admins to view all admin_users records
  - Adds policy for admins to insert new admin_users records (grant admin privileges)
  - Adds policy for admins to delete admin_users records (revoke admin privileges)
  
  ## Security
  These policies only allow existing admins to manage admin privileges.
  The policies check if the user making the request is in the admin_users table.
*/

-- Allow admins to view all admin_users
CREATE POLICY "Admins can view all admin users"
  ON admin_users
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
    )
  );

-- Allow admins to grant admin privileges
CREATE POLICY "Admins can grant admin privileges"
  ON admin_users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
    )
  );

-- Allow admins to revoke admin privileges
CREATE POLICY "Admins can revoke admin privileges"
  ON admin_users
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
    )
  );
