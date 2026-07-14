import { prisma } from "@/lib/prisma";
import { apiFail, apiOk, apiServerError } from "@/lib/api/response";
import { rateLimit } from "@/lib/api/rate-limit";
import { parseJsonBody, validationError } from "@/lib/api/validation";
import { requireAdmin } from "@/lib/api/auth";
import { bannerSchema, productSchema, showcaseSchema } from "@/lib/api/schemas";
import { normalizeProductData, normalizeProductPatchData } from "@/lib/api/catalog-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Context = { params: Promise<{ path?: string[] }> };

async function guard(request: Request) {
  const limited = rateLimit(request);
  if (limited) return { ok: false as const, response: limited };
  return requireAdmin(request);
}

function images(data: any) {
  if (Array.isArray(data.imageUrls)) return data.imageUrls;
  return data.images ?? null;
}

async function readStructure() {
  const [banners, showcases, products] = await Promise.all([
    prisma.banner.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }),
    prisma.showcase.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }),
    prisma.product.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }),
  ]);
  return { banners, showcases, products };
}

export async function GET(request: Request, context: Context) {
  const auth = await guard(request);
  if (!auth.ok) return auth.response;
  const path = (await context.params).path ?? [];

  try {
    if (path[0] === "dashboard") {
      const [products, showcases, banners, users, carts, comments] = await Promise.all([
        prisma.product.count(),
        prisma.showcase.count(),
        prisma.banner.count(),
        prisma.user.count(),
        prisma.cart.count({ where: { status: "active" } }),
        prisma.comment.count(),
      ]);
      return apiOk({ dashboard: { products, showcases, banners, users, carts, comments } });
    }

    if (path[0] === "banners") {
      if (path[1]) {
        const banner = await prisma.banner.findUnique({ where: { id: path[1] } });
        return banner ? apiOk({ banner }) : apiFail("موردی پیدا نشد.", 404);
      }
      const banners = await prisma.banner.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] });
      return apiOk({ banners });
    }

    if (path[0] === "showcases" && path.length === 1) {
      const showcases = await prisma.showcase.findMany({
        include: { products: true, banners: true },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      });
      return apiOk({ showcases });
    }

    if (path[0] === "showcases" && path[1] && path[2] !== "products") {
      const showcase = await prisma.showcase.findUnique({
        where: { id: path[1] },
        include: { products: true, banners: true },
      });
      return showcase ? apiOk({ showcase }) : apiFail("موردی پیدا نشد.", 404);
    }

    if (path[0] === "showcases" && path[1] && path[2] === "products") {
      const products = await prisma.product.findMany({
        where: { showcaseId: path[1] },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      });
      return apiOk({ products });
    }

    if (path[0] === "products") {
      if (path[1]) {
        const product = await prisma.product.findUnique({ where: { id: Number(path[1]) } });
        return product ? apiOk({ product }) : apiFail("موردی پیدا نشد.", 404);
      }
      const products = await prisma.product.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }] });
      return apiOk({ products });
    }

    if (path[0] === "structure") return apiOk({ structure: await readStructure() });

    return apiFail("مسیر پیدا نشد.", 404);
  } catch (error) {
    console.error("Admin GET error:", error);
    return apiServerError();
  }
}

export async function POST(request: Request, context: Context) {
  const auth = await guard(request);
  if (!auth.ok) return auth.response;
  const path = (await context.params).path ?? [];

  try {
    if (path[0] === "banners") {
      const parsed = await parseJsonBody(request, bannerSchema);
      if (!parsed.ok) return parsed.response;
      const banner = await prisma.banner.create({
        data: {
          title: parsed.data.title ?? null,
          showcaseId: parsed.data.showcaseId ?? null,
          images: images(parsed.data),
          active: parsed.data.active ?? true,
          sortOrder: parsed.data.sortOrder ?? 0,
          intervalSeconds: parsed.data.intervalSeconds ?? 5,
          heightPercent: parsed.data.heightPercent ?? 28,
        },
      });
      return apiOk({ banner }, { status: 201 });
    }

    if (path[0] === "showcases" && path[1] && path[2] === "products") {
      const body = await request.json().catch(() => null);
      const productId = Number(body?.productId);
      if (!Number.isInteger(productId)) return apiFail("شناسه محصول الزامی است.", 422);
      const product = await prisma.product.update({ where: { id: productId }, data: { showcaseId: path[1] } });
      return apiOk({ product }, { status: 201 });
    }

    if (path[0] === "showcases") {
      const parsed = await parseJsonBody(request, showcaseSchema);
      if (!parsed.ok) return parsed.response;
      const showcase = await prisma.showcase.create({
        data: {
          title: parsed.data.title ?? null,
          description: parsed.data.description ?? null,
          imageUrl: parsed.data.imageUrl ?? null,
          active: parsed.data.active ?? true,
          sortOrder: parsed.data.sortOrder ?? 0,
        },
      });
      return apiOk({ showcase }, { status: 201 });
    }

    if (path[0] === "products") {
      const parsed = await parseJsonBody(request, productSchema);
      if (!parsed.ok) return parsed.response;
      const product = await prisma.product.create({ data: normalizeProductData(parsed.data) });
      return apiOk({ product }, { status: 201 });
    }

    return apiFail("مسیر پیدا نشد.", 404);
  } catch (error) {
    console.error("Admin POST error:", error);
    return apiServerError();
  }
}

export async function PUT(request: Request, context: Context) {
  return updateEntity(request, context, false);
}

export async function PATCH(request: Request, context: Context) {
  return updateEntity(request, context, true);
}

async function updateEntity(request: Request, context: Context, partial: boolean) {
  const auth = await guard(request);
  if (!auth.ok) return auth.response;
  const path = (await context.params).path ?? [];

  try {
    if (path[0] === "structure") {
      const body = await request.json().catch(() => null);
      if (!body || typeof body !== "object") return apiFail("اطلاعات ارسالی معتبر نیست.", 422);
      return apiOk({ structure: body });
    }

    if (!path[1]) return apiFail("موردی پیدا نشد.", 404);

    if (path[0] === "banners") {
      const body = await request.json().catch(() => null);
      const parsed = (partial ? bannerSchema.partial() : bannerSchema).safeParse(body);
      if (!parsed.success) return validationError(parsed.error);
      const banner = await prisma.banner.update({
        where: { id: path[1] },
        data: {
          ...(parsed.data.title !== undefined ? { title: parsed.data.title } : {}),
          ...(parsed.data.showcaseId !== undefined ? { showcaseId: parsed.data.showcaseId } : {}),
          ...(parsed.data.images !== undefined || parsed.data.imageUrls !== undefined ? { images: images(parsed.data) } : {}),
          ...(parsed.data.active !== undefined ? { active: parsed.data.active } : {}),
          ...(parsed.data.sortOrder !== undefined ? { sortOrder: parsed.data.sortOrder } : {}),
          ...(parsed.data.intervalSeconds !== undefined ? { intervalSeconds: parsed.data.intervalSeconds } : {}),
          ...(parsed.data.heightPercent !== undefined ? { heightPercent: parsed.data.heightPercent } : {}),
        },
      });
      return apiOk({ banner });
    }

    if (path[0] === "showcases") {
      const body = await request.json().catch(() => null);
      const parsed = (partial ? showcaseSchema.partial() : showcaseSchema).safeParse(body);
      if (!parsed.success) return validationError(parsed.error);
      const showcase = await prisma.showcase.update({ where: { id: path[1] }, data: parsed.data });
      return apiOk({ showcase });
    }

    if (path[0] === "products") {
      const body = await request.json().catch(() => null);
      const parsed = (partial ? productSchema.partial() : productSchema).safeParse(body);
      if (!parsed.success) return validationError(parsed.error);
      const product = await prisma.product.update({
        where: { id: Number(path[1]) },
        data: partial ? normalizeProductPatchData(parsed.data) : normalizeProductData(parsed.data),
      });
      return apiOk({ product });
    }

    return apiFail("مسیر پیدا نشد.", 404);
  } catch (error: any) {
    if (error?.code === "P2025") return apiFail("موردی پیدا نشد.", 404);
    console.error("Admin update error:", error);
    return apiServerError();
  }
}

export async function DELETE(request: Request, context: Context) {
  const auth = await guard(request);
  if (!auth.ok) return auth.response;
  const path = (await context.params).path ?? [];

  try {
    if (path[0] === "showcases" && path[1] && path[2] === "products" && path[3]) {
      const product = await prisma.product.update({ where: { id: Number(path[3]) }, data: { showcaseId: null } });
      return apiOk({ product });
    }
    if (!path[1]) return apiFail("موردی پیدا نشد.", 404);
    if (path[0] === "banners") await prisma.banner.delete({ where: { id: path[1] } });
    else if (path[0] === "showcases") await prisma.showcase.delete({ where: { id: path[1] } });
    else if (path[0] === "products") await prisma.product.delete({ where: { id: Number(path[1]) } });
    else return apiFail("مسیر پیدا نشد.", 404);
    return apiOk({ deleted: true });
  } catch (error: any) {
    if (error?.code === "P2025") return apiFail("موردی پیدا نشد.", 404);
    console.error("Admin DELETE error:", error);
    return apiServerError();
  }
}
