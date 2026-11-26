import type { APIRoute } from "astro";
import { z } from "zod";
import { issueSessionCookie } from "../../../lib/auth";
import { upsertUserByEmail } from "../../../lib/db";
import { env } from "../../../lib/env";

export const prerender = false;

const schema = z
  .object({
    email: z.string().email().optional(),
  })
  .optional();

export const POST: APIRoute = async ({ request, cookies }) => {
  if (env("ALLOW_PAYMENT_SIMULATE") !== "1") {
    return new Response(JSON.stringify({ error: "dev login disabled" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  let email = "dev@magfieldai.top";
  try {
    const raw = await request.text();
    if (raw.trim()) {
      const parsed = schema.parse(JSON.parse(raw));
      if (parsed?.email) email = parsed.email;
    }
  } catch {
    /* default dev email */
  }

  const user = upsertUserByEmail(email);
  issueSessionCookie(user.id, cookies);

  return new Response(
    JSON.stringify({
      ok: true,
      user: { id: user.id, email: user.email },
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
};
