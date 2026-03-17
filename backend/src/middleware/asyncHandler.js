/**
 * Wraps an async Express route handler so that any rejected promise
 * is forwarded to the Express error handler via next(err).
 *
 * Express 4 does NOT do this automatically — without this wrapper,
 * an unhandled rejection kills the process or returns nothing.
 *
 * Usage:  router.get("/", asyncHandler(async (req, res) => { ... }));
 */
export function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}
