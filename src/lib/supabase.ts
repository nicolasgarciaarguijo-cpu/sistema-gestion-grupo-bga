import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://ilmcvnnawzorvzpwpoes.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlsbWN2bm5hd3pvcnZ6cHdwb2VzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2OTQ3NTAsImV4cCI6MjA5MzI3MDc1MH0.HkjK126_E53lPN5aFDO_MQpJCzeKrnfD1BN7LU4irhs";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage:
      typeof window !== "undefined" && window.sessionStorage
        ? window.sessionStorage
        : undefined,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
