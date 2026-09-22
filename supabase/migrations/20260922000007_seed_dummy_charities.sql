-- Insert 5 dummy charities for testing the charity selection dashboard

INSERT INTO charities (name, description, is_active, is_spotlight)
VALUES 
  ('Global Golf Foundation', 'Supporting youth golf programs worldwide and promoting the sport for the next generation.', true, true),
  ('Tees for Trees', 'Planting a tree for every golf round played to help combat climate change and restore forests.', true, false),
  ('Fairways to Health', 'Funding medical research and healthcare access for underprivileged communities through golf.', true, false),
  ('Birdies for Books', 'Providing educational resources and libraries to schools in developing regions.', true, false),
  ('The Mulligan Project', 'Offering a second chance to rescue animals by funding local shelters and adoption drives.', true, false);
