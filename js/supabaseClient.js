// ---------- Supabase connection ----------
// This file sets up the connection to your Supabase project.
// The anon (public) key is SAFE to be visible in frontend code —
// real protection comes from Row Level Security rules set inside Supabase.

const SUPABASE_URL = "https://mvbfbgcbqpgmjmgzmpuo.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im12YmZiZ2NicXBnbWptZ3ptcHVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY4MDE2NDgsImV4cCI6MjEwMjM3NzY0OH0.HMCS93EuvYVaNAc0mM6zE8GHoekBR48PLstnUpL6nNg";

// `supabase` here refers to the global object created by the CDN script
// loaded in the HTML file (see shop.html <script> tags).
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
