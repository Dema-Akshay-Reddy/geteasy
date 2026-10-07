/**
 * GetEasy (forui branch) static frontend for Cloudflare.
 * All app routes are static Next.js export output; there is no server API here.
 * The FastAPI backend runs separately (Docker/Postgres/Groq) — see README.
 */
export default {
  async fetch(request, env, ctx) {
    return env.ASSETS.fetch(request);
  },
};
