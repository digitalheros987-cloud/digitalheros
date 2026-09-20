-- Add compound index for fast retrieval of a user's latest 5 scores.
-- docs/DATABASE.md specifies: scores(user_id, date_played DESC)
-- The initial migration created two separate single-column indexes;
-- this compound index is more efficient for the getLatestFiveScores query pattern.

CREATE INDEX IF NOT EXISTS idx_scores_user_date ON scores(user_id, date_played DESC);
