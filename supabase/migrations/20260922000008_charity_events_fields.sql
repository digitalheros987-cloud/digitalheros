-- Add upcoming events and golf events fields to charities table
ALTER TABLE charities
ADD COLUMN upcoming_events TEXT,
ADD COLUMN golf_events TEXT;
