// supabaseClient.js
import { createClient } from "@supabase/supabase-js";
import { Database } from "../types/supabase";

// Load your Supabase credentials from environment variables
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY; // use service role key for server

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  throw new Error("Missing Supabase environment variables");
}

// Create a Supabase client
export const supabase = createClient<Database>(
  SUPABASE_URL,
  SUPABASE_SERVICE_KEY
);
