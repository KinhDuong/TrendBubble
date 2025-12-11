/*
  # Create contact submissions table

  1. New Tables
    - `contact_submissions`
      - `id` (uuid, primary key)
      - `name` (text, required) - Name of person contacting
      - `email` (text, required) - Email address
      - `phone` (text, optional) - Phone number
      - `message` (text, required) - Message content
      - `created_at` (timestamptz) - Submission timestamp
      - `status` (text) - Status of submission (pending, read, archived)
  
  2. Security
    - Enable RLS on `contact_submissions` table
    - Add policy for admin users to view submissions
    - Public can insert (form submissions)
*/

CREATE TABLE IF NOT EXISTS contact_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  message text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'read', 'archived')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE contact_submissions ENABLE ROW LEVEL SECURITY;

-- Anyone can insert contact submissions
CREATE POLICY "Anyone can submit contact form"
  ON contact_submissions
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Admin users can view all contact submissions
CREATE POLICY "Admin users can view contact submissions"
  ON contact_submissions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.email = auth.jwt() ->> 'email'
    )
  );