-- PostgreSQL Extensions Setup
-- This script runs automatically when the Docker container is first created

-- UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Full-text search (for future features)
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Performance statistics
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Log extension installation
DO $$
BEGIN
  RAISE NOTICE '✅ PostgreSQL extensions installed successfully';
  RAISE NOTICE '   - uuid-ossp: UUID generation';
  RAISE NOTICE '   - pg_trgm: Full-text search';
  RAISE NOTICE '   - pg_stat_statements: Performance statistics';
END
$$;
