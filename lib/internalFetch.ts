/** Cookie header for server-to-server calls into our own API (self-chaining the analyze pipeline via waitUntil). Mirrors middleware.ts's auth check. */
export function internalAuthHeaders(): HeadersInit {
  const appPassword = process.env.APP_PASSWORD;
  if (!appPassword) return {};
  return { Cookie: `alpinia_auth=${appPassword}` };
}
