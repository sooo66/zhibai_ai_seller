import type { APIRoute } from "astro";
import { z } from "zod";
import { isAdminAuthed } from "../../../lib/admin-auth";
import { listAllProducts, updateProduct } from "../../../lib/db";

export const prerender = false;

export const GET: APIRoute = async ({ cookies }) => {
  if (!isAdminAuthed(cookies)) {
    return new Response(JSON.stringify({ error: "未登录" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  return new Response(JSON.stringify({ products: listAllProducts() }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};

const patchSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1).optional(),
  summary: z.string().optional(),
  description: z.string().optional(),
  cost_cny: z.number().nonnegative().optional(),
  price_cny: z.number().positive().optional(),
  shop16688_goods_no: z.string().optional(),
  shop16688_url: z.string().optional(),
  visible: z.boolean().optional(),
});

export const PATCH: APIRoute = async ({ request, cookies }) => {
  if (!isAdminAuthed(cookies)) {
    return new Response(JSON.stringify({ error: "未登录" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  try {
    const body = patchSchema.parse(await request.json());
    const { id, ...patch } = body;
    const product = updateProduct(id, {
      ...patch,
      visible: patch.visible === undefined ? undefined : patch.visible ? 1 : 0,
    });
    if (!product) {
      return new Response(JSON.stringify({ error: "商品不存在" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ product }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "更新失败";
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
};
