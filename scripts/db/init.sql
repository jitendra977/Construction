-- PostgreSQL init script — runs once when the DB container is first created
-- Ensures the app DB and user exist with proper privileges

-- Extensions used by Django / the app
CREATE EXTENSION IF NOT EXISTS pg_trgm;    -- fast LIKE/ILIKE search
CREATE EXTENSION IF NOT EXISTS unaccent;   -- accent-insensitive search

-- Timezone (match your server)
SET timezone = 'UTC';
