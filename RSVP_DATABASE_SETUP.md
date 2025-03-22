# RSVP and Notification Tables Setup

You're seeing the error `"relation \"public.event_rsvps\" does not exist"` because the RSVP database tables haven't been created yet.

## How to Fix

1. Log in to your [Supabase Dashboard](https://app.supabase.io).
2. Select your project.
3. Go to the "SQL Editor" section.
4. Create a new query.
5. Copy and paste the SQL from the file `create_rsvp_tables.sql` into the query editor.
6. Run the query.

This will create two new tables in your database:
- `event_rsvps` - For tracking which events users have signed up for
- `user_notification_settings` - For storing user notification preferences

It will also set up the necessary Row Level Security (RLS) policies to ensure data privacy and security.

After running the SQL, restart your app and everything should work correctly!

## Troubleshooting

If you continue to have issues:

1. Check the Supabase logs for any SQL errors
2. Make sure your Supabase connection is working properly
3. Verify that your app's user has the proper permissions

For more help, reach out to the development team. 