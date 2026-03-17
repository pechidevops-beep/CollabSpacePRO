import { createClient } from "@supabase/supabase-js";
import jwt from "jsonwebtoken";

const FETCH_TIMEOUT_MS = 15_000;

let _adminClient = null;

/**
 * Creates a Supabase admin client that bypasses RLS policies.
 *
 * Uses the SUPABASE_JWT_SECRET to sign a service_role JWT,
 * which gives full table access. Auth is already verified by
 * the requireUser middleware — this client is only used in
 * authenticated route handlers.
 */
export function supabaseAdmin() {
    if (_adminClient) return _adminClient;

    const url = process.env.SUPABASE_URL;
    const anon = process.env.SUPABASE_ANON_KEY;
    const jwtSecret = process.env.SUPABASE_JWT_SECRET;

    if (!url) throw new Error("Missing SUPABASE_URL");
    if (!anon) throw new Error("Missing SUPABASE_ANON_KEY");
    if (!jwtSecret) throw new Error("Missing SUPABASE_JWT_SECRET");

    // Create a service_role JWT signed with the project JWT secret
    const serviceToken = jwt.sign(
        {
            role: "service_role",
            iss: "supabase",
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365, // 1 year
        },
        jwtSecret
    );

    _adminClient = createClient(url, anon, {
        global: {
            headers: {
                Authorization: `Bearer ${serviceToken}`,
            },
            fetch: (input, init) => {
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
                return fetch(input, {
                    ...init,
                    signal: controller.signal,
                }).finally(() => clearTimeout(timeout));
            },
        },
        auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false,
        },
    });

    return _adminClient;
}
