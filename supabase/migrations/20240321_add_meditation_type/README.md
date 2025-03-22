# Add meditation_type Column

This migration adds a `meditation_type` column to the `meditation_completions` table to distinguish between different types of meditation sessions: scheduled, quick, and global.

## Purpose

The Synkr app supports multiple meditation modes:
- Scheduled meditations (from events)
- Quick meditations (ad-hoc sessions)
- Global meditations (joined with others)

This column allows the application to properly count and categorize these different session types in analytics and community statistics.

## Changes

- Adds a `meditation_type` VARCHAR(20) column with default value 'scheduled'
- Updates existing records to use the default value
- Adds a comment to the column for documentation
- Creates an index for performance optimization

## Rollback

The `down.sql` script will remove the column and its index if needed. 