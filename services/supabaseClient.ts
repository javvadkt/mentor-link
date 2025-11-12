import { createClient } from '@supabase/supabase-js';

// The Supabase URL and anon key are retrieved from environment variables.
// These are configured in the development environment.
const supabaseUrl ='https://evcpbfnujxqtjluwbthm.supabase.co';
const supabaseAnonKey ='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2Y3BiZm51anhxdGpsdXdidGhtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4NDQ3OTAsImV4cCI6MjA3ODQyMDc5MH0.0e8MMVtWrEjJ7n8sTyHvpPzqriV3bLSYttBE8F-uVz4';

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase URL and anon key are not defined in environment variables. Please set SUPABASE_URL and SUPABASE_ANON_KEY.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
