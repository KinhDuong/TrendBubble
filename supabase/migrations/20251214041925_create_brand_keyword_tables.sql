/*
  # Create Brand Keyword Analysis Tables

  ## Overview
  This migration creates tables for storing and analyzing brand SEO keyword data.
  Supports CSV uploads of keyword search volumes and monthly trend analysis.

  ## New Tables
  
  ### `brand_keyword_data`
  Stores individual keyword entries with search volume data
  - `id` (uuid, primary key) - Unique identifier
  - `brand` (text) - Brand name
  - `keyword` (text) - Search keyword
  - `search_volume` (integer) - Monthly search volume
  - `month` (date) - Month of the data
  - `user_id` (uuid) - User who uploaded the data
  - `created_at` (timestamptz) - When the record was created
  
  ### `brand_keyword_monthly_data`
  Stores monthly aggregated data for trend analysis
  - `id` (uuid, primary key) - Unique identifier
  - `brand` (text) - Brand name
  - `month` (date) - Month of the data
  - `total_volume` (integer) - Total search volume for the month
  - `keyword_count` (integer) - Number of keywords tracked
  - `top_keywords` (jsonb) - Array of top performing keywords
  - `user_id` (uuid) - User who uploaded the data
  - `created_at` (timestamptz) - When the record was created

  ## Security
  - Enable RLS on both tables
  - Authenticated users can read all data
  - Only data owners can insert, update, or delete their own data
  
  ## Indexes
  - Brand and month combination for fast filtering
  - User ID for ownership queries
*/

-- Create brand_keyword_data table
CREATE TABLE IF NOT EXISTS brand_keyword_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand text NOT NULL,
  keyword text NOT NULL,
  search_volume integer NOT NULL DEFAULT 0,
  month date NOT NULL,
  user_id uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- Create brand_keyword_monthly_data table
CREATE TABLE IF NOT EXISTS brand_keyword_monthly_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand text NOT NULL,
  month date NOT NULL,
  total_volume integer NOT NULL DEFAULT 0,
  keyword_count integer NOT NULL DEFAULT 0,
  top_keywords jsonb DEFAULT '[]'::jsonb,
  user_id uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_brand_keyword_data_brand_month 
  ON brand_keyword_data(brand, month);
CREATE INDEX IF NOT EXISTS idx_brand_keyword_data_user_id 
  ON brand_keyword_data(user_id);
CREATE INDEX IF NOT EXISTS idx_brand_keyword_monthly_data_brand_month 
  ON brand_keyword_monthly_data(brand, month);
CREATE INDEX IF NOT EXISTS idx_brand_keyword_monthly_data_user_id 
  ON brand_keyword_monthly_data(user_id);

-- Enable Row Level Security
ALTER TABLE brand_keyword_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_keyword_monthly_data ENABLE ROW LEVEL SECURITY;

-- RLS Policies for brand_keyword_data
CREATE POLICY "Authenticated users can read all brand keyword data"
  ON brand_keyword_data FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert their own brand keyword data"
  ON brand_keyword_data FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own brand keyword data"
  ON brand_keyword_data FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own brand keyword data"
  ON brand_keyword_data FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for brand_keyword_monthly_data
CREATE POLICY "Authenticated users can read all monthly brand data"
  ON brand_keyword_monthly_data FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert their own monthly brand data"
  ON brand_keyword_monthly_data FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own monthly brand data"
  ON brand_keyword_monthly_data FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own monthly brand data"
  ON brand_keyword_monthly_data FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);