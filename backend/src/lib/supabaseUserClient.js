import { createClient } from "@supabase/supabase-js";

const FETCH_TIMEOUT_MS = 15_000; // 15 seconds — prevents infinite hang on DNS failure

/**
 * Creates a Supabase client scoped to the calling user's access token.
 * Includes a fetch timeout to handle DNS resolution failures gracefully
 * (common in India without Cloudflare DNS 1.1.1.1).
 */
export function supabaseUserClient(accessToken) {
  const url = process.env.SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY;

  if (!url) throw new Error("Missing SUPABASE_URL");
  if (!anon) throw new Error("Missing SUPABASE_ANON_KEY");

  return createClient(url, anon, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`
      },
      fetch: (input, init) => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

        return fetch(input, {
          ...init,
          signal: controller.signal,
        }).finally(() => clearTimeout(timeout));
      }
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  });
}