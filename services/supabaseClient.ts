import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config';

// The Supabase URL and anon key are retrieved from the config file.
// For production, it's highly recommended to use environment variables.
const supabaseUrl = SUPABASE_URL;
const supabaseAnonKey = SUPABASE_ANON_KEY;

// Fix: Removed checks against placeholder strings as they cause type errors when actual values are present.
if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase URL and anon key are not configured. Please update the placeholder values in 'config.ts'.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);