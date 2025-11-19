/*
  # Trigger to set created_at from pub_date on insert

  1. Trigger Function
    - Automatically sets created_at to pub_date when a new topic is inserted
    - If pub_date is null, created_at defaults to now()
    - This ensures the "Started" date from CSV is always used as created_at
    
  2. Notes
    - Trigger fires BEFORE INSERT
    - Only affects new records being inserted
    - Ensures consistency between pub_date and created_at
*/

-- Create trigger function
CREATE OR REPLACE FUNCTION set_created_at_from_pub_date()
RETURNS TRIGGER AS $$
BEGIN
  -- If pub_date is set, use it for created_at
  IF NEW.pub_date IS NOT NULL THEN
    NEW.created_at = NEW.pub_date;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it exists
DROP TRIGGER IF EXISTS trigger_set_created_at_from_pub_date ON trending_topics;

-- Create trigger
CREATE TRIGGER trigger_set_created_at_from_pub_date
  BEFORE INSERT ON trending_topics
  FOR EACH ROW
  EXECUTE FUNCTION set_created_at_from_pub_date();