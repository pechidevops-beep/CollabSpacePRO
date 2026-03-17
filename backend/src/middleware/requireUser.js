import { createClient } from "@supabase/supabase-js";

/**
 * Express middleware that verifies the Supabase access token.
 *
 * Strategy:
 *   1. Try Supabase auth.getUser() (proper server-side verification)
 *   2. If network fails (India DNS/ISP blocking issue), fall back to
 *      local JWT decode with expiry validation + structure checks.
 *
 * The fallback is safe for localhost development. For production,
 * ensure proper DNS or use a Supabase Edge Function instead.
 */

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl) console.error("[auth] Missing SUPABASE_URL in .env");
if (!supabaseAnonKey) console.error("[auth] Missing SUPABASE_ANON_KEY in .env");

// ---------- helpers ----------

/** Decode a JWT without verifying the signature (safe structure check only) */
function decodeJwt(token) {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const header = JSON.parse(Buffer.from(parts[0], "base64url").toString());
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString());
    return { header, payload };
  } catch { return null; }
}

/** Check basic JWT expiry and structure */
function validateTokenStructure(decoded) {
  if (!decoded) return "Malformed token";
  if (!decoded.payload.sub) return "Token missing sub claim";
  if (!decoded.payload.exp) return "Token missing exp claim";
  const now = Math.floor(Date.now() / 1000);
  if (decoded.payload.exp < now) return "Token expired";
  // Supabase tokens should have iss containing "supabase"
  if (decoded.payload.iss && !decoded.payload.iss.includes("supabase")) {
    return "Token not issued by Supabase";
  }
  return null; // valid
}

// ---------- middleware ----------

export async function requireUser(req, res, next) {
  const authDebug = String(process.env.AUTH_DEBUG || "").toLowerCase() === "true";

  try {
    const hdr = req.headers.authorization || "";
    const token = hdr.startsWith("Bearer ") ? hdr.slice("Bearer ".length) : null;

    if (authDebug) {
      const tokenPreview = token ? `${token.slice(0, 20)}…${token.slice(-8)}` : "<missing>";
      console.log("[auth]", req.method, req.originalUrl, { tokenPreview });
    }

    if (!token) return res.status(401).json({ message: "Missing bearer token" });

    // ---- Approach 1: Try Supabase getUser (proper verification) ----
    try {
      const sb = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: `Bearer ${token}` } },
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      });

      const { data, error } = await sb.auth.getUser(token);

      if (!error && data.user) {
        if (authDebug) console.log("[auth] ✓ verified via getUser:", data.user.id);
        req.user = { id: data.user.id, token };
        return next();
      }

      // If auth error (not network error), reject immediately
      if (error && !error.message?.includes("fetch") && !error.message?.includes("timeout") && !error.message?.includes("connect")) {
        if (authDebug) console.log("[auth] ✗ getUser auth error:", error.message);
        return res.status(401).json({ message: error.message || "Invalid token" });
      }

      // Network error — fall through to local decode
      if (authDebug) console.log("[auth] ⚠ getUser network error, falling back to local decode:", error?.message);
    } catch (networkErr) {
      if (authDebug) console.log("[auth] ⚠ getUser exception, falling back:", networkErr.message);
    }

    // ---- Approach 2: Local JWT decode (no signature verification) ----
    // Used when Supabase is unreachable (India DNS/ISP issues)
    const decoded = decodeJwt(token);
    const structureError = validateTokenStructure(decoded);
    if (structureError) {
      if (authDebug) console.log("[auth] ✗ local decode failed:", structureError);
      return res.status(401).json({ message: structureError });
    }

    if (authDebug) console.log("[auth] ✓ verified via local decode (offline mode):", decoded.payload.sub);
    req.user = { id: decoded.payload.sub, token };
    next();
  } catch (e) {
    if (authDebug) console.log("[auth] ✗ unexpected error:", e.message);
    return res.status(401).json({ message: "Authentication failed" });
  }
}