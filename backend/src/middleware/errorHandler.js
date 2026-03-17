import { ZodError } from "zod";

/**
 * Global Express error handler.
 * Catches ZodError (bad input), SyntaxError (malformed JSON), and generic errors.
 */
export function errorHandler(err, _req, res, _next) {
  // --- Zod validation errors → 400 ---
  if (err instanceof ZodError) {
    const fields = err.errors.map((e) => ({
      path: e.path.join("."),
      message: e.message,
    }));
    return res.status(400).json({
      message: "Validation error",
      errors: fields,
    });
  }

  // --- Malformed JSON body → 400 ---
  if (err.type === "entity.parse.failed" || err instanceof SyntaxError) {
    return res.status(400).json({ message: "Malformed JSON body" });
  }

  // --- Everything else → 500 ---
  console.error("[error-handler]", err);
  const message =
    process.env.NODE_ENV === "production"
      ? "Internal server error"
      : err.message || "Internal server error";
  res.status(500).json({ message });
}
