import type { APIRoute } from "astro";
import { getSessionUser } from "../../../lib/auth";

export const prerender = false;

export const GET: APIRoute = async ({ cookies }) => {
  const user = getSessionUser(cookies);
  return new Response(
    JSON.stringify({
      user: user ? { id: user.id, email: user.email } : null,
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
};
