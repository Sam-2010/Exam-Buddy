/**
 * Hashes a plain-text password using SHA-256 via the native Web Crypto API.
 * Returns a hex representation of the hash.
 */
export async function hashPassword(password: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

/**
 * Checks if the Supabase environment variables are properly set up.
 */
export function isDbConfigured(): boolean {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes("your-supabase") || supabaseUrl.includes("placeholder-url-for-build")) {
    return false;
  }
  return true;
}
