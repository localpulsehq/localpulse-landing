import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/src/lib/database.types";

// Use the public URL, but the SERVICE ROLE KEY (server-only)
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!url) throw new Error("Missing env: NEXT_PUBLIC_SUPABASE_URL");
if (!serviceRoleKey) throw new Error("Missing env: SUPABASE_SERVICE_ROLE_KEY");

export const supabaseAdmin = createClient<Database>(url, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});
