import type { APIRoute } from "astro";
import { isAdminAuthed } from "../../../lib/admin-auth";
import { syncCatalogTo16688 } from "../../../lib/shop16688";

export const prerender = false;

export const POST: APIRoute = async ({ cookies }) => {
  if (!isAdminAuthed(cookies)) {
    return new Response(JSON.stringify({ error: "未登录" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  try {
    const report = await syncCatalogTo16688();
    return new Response(JSON.stringify(report), {
      status: report.ok ? 200 : 502,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({
        ok: false,
        message: err instanceof Error ? err.message : "同步 16688 失败",
        synced: [],
        failed: [],
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
};
