/*
  # Create Trending Topics History Table

  1. New Tables
    - `trending_topics_history`
      - `id` (uuid, primary key) - Unique identifier for each historical record
      - `topic_id` (uuid, foreign key) - References the trending_topics table
      - `name` (text) - Topic name (denormalized for easier queries)
      - `search_volume` (bigint) - Search volume at time of snapshot
      - `search_volume_raw` (text) - Raw formatted search volume (e.g., "50K+")
      - `rank` (int) - Position in trending list at time of snapshot
      - `url` (text) - Google Trends URL for the topic
      - `snapshot_at` (timestamptz) - When this snapshot was taken
      - `created_at` (timestamptz) - When this record was created in database

  2. Security
    - Enable RLS on `trending_topics_history` table
    - Add policy for public read access (historical data is public)
    - No write policies needed (only backend writes via edge functions)

  3. Indexes
    - Index on topic_id for efficient lookups by topic
    - Index on snapshot_at for time-range queries
    - Index on name for searching historical data by topic name

  4. Notes
    - Denormalized design for query performance
    - Allows historical analysis even if original topic is deleted
    - Snapshots captured on each RSS feed update and CSV upload
    - No automatic cleanup - keep all historical data for analytics
*/

CREATE TABLE IF NOT EXISTS trending_topics_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id uuid REFERENCES trending_topics(id) ON DELETE SET NULL,
  name text NOT NULL,
  search_volume bigint DEFAULT 0,
  search_volume_raw text DEFAULT '',
  rank int DEFAULT 0,
  url text,
  snapshot_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE trending_topics_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view trending topics history"
  ON trending_topics_history
  FOR SELECT
  TO public
  USING (true);

CREATE INDEX IF NOT EXISTS idx_trending_topics_history_topic_id 
  ON trending_topics_history(topic_id);

CREATE INDEX IF NOT EXISTS idx_trending_topics_history_snapshot_at 
  ON trending_topics_history(snapshot_at DESC);

CREATE INDEX IF NOT EXISTS idx_trending_topics_history_name 
  ON trending_topics_history(name);

CREATE INDEX IF NOT EXISTS idx_trending_topics_history_name_snapshot 
  ON trending_topics_history(name, snapshot_at DESC);