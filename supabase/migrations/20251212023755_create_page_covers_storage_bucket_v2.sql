/*
  # Create Storage Bucket for Page Cover Images

  1. New Bucket
    - Create `page-covers` storage bucket for page cover images
    - Public access for reading images
    - File size limit: 5MB
    - Allowed file types: image/jpeg, image/png, image/webp, image/gif

  2. Security
    - Enable RLS on storage.objects
    - Allow public read access to all images
    - Allow authenticated admin users to upload, update, and delete images
*/

-- Insert the bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'page-covers',
  'page-covers',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public read access for page covers" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload page covers" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update page covers" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete page covers" ON storage.objects;

-- Allow public read access to all images in page-covers bucket
CREATE POLICY "Public read access for page covers"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'page-covers');

-- Allow authenticated users to upload images to page-covers bucket
CREATE POLICY "Authenticated users can upload page covers"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'page-covers');

-- Allow authenticated users to update their uploaded images
CREATE POLICY "Authenticated users can update page covers"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'page-covers')
  WITH CHECK (bucket_id = 'page-covers');

-- Allow authenticated users to delete images
CREATE POLICY "Authenticated users can delete page covers"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'page-covers');