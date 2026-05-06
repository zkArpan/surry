import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Load Supabase credentials from environment variables
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate environment variables
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing Supabase environment variables. Please check your .env.local file.");
}

export const supabase = createClient(SUPABASE_URL || "", SUPABASE_KEY || "");
