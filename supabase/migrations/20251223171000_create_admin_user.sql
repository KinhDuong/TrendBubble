/*
  # Create Admin User
  
  1. Creates a new admin user with credentials
    - Email: admin@example.com
    - Password: Kinsanitytv2012!!!$$$
  
  2. Adds the user to admin_users table
    - Grants admin privileges
    - Allows access to admin functions
  
  3. Important Notes
    - User will be able to login immediately
    - Password is securely hashed by Supabase Auth
*/

-- Create the admin user in auth.users
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  aud,
  role
)
SELECT
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'admin@example.com',
  crypt('Kinsanitytv2012!!!$$$', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{}'::jsonb,
  'authenticated',
  'authenticated'
WHERE NOT EXISTS (
  SELECT 1 FROM auth.users WHERE email = 'admin@example.com'
)
RETURNING id;

-- Add the user to admin_users table
INSERT INTO admin_users (id, email)
SELECT id, email
FROM auth.users
WHERE email = 'admin@example.com'
ON CONFLICT (email) DO NOTHING;