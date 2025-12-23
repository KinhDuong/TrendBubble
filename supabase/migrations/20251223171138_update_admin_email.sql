/*
  # Update Admin Email
  
  1. Changes admin user email
    - Old email: admin@example.com
    - New email: kinh@speeker.co
  
  2. Updates both tables
    - auth.users table
    - admin_users table
  
  3. Important Notes
    - Maintains same password
    - Keeps all admin privileges
*/

-- Update email in auth.users
UPDATE auth.users
SET email = 'kinh@speeker.co',
    updated_at = now()
WHERE email = 'admin@example.com';

-- Update email in admin_users
UPDATE admin_users
SET email = 'kinh@speeker.co'
WHERE email = 'admin@example.com';