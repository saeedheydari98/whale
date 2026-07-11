import { prisma } from "@/lib/prisma";
import { apiOk, apiServerError } from "@/lib/api/response";
import { rateLimit } from "@/lib/api/rate-limit";
import { getAuthUser } from "@/lib/api/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const defaultTheme = {
  primary: "gray",
  style: "light",
};

const menu = [
  { href: "/", label: "خانه" },
  { href: "/categories", label: "دسته بندی" },
  { href: "/products", label: "ویترین" },
  { href: "/panel/admin", label: "پنل مدیریت", adminOnly: true },
  { href: "/panel/user", label: "حساب کاربری" },
];

async function loadTheme() {
  try {
    if (!(prisma as any).adminTheme?.findFirst) return defaultTheme;
    const record = await (prisma as any).adminTheme.findFirst();
    return record
      ? {
          primary: String(record.primary || defaultTheme.primary),
          style: String(record.style || defaultTheme.style),
        }
      : defaultTheme;
  } catch {
    return defaultTheme;
  }
}

export async function GET(request: Request) {
  const limited = rateLimit(request);
  if (limited) return limited;

  try {
    const authUserPromise = getAuthUser(request);
    const themePromise = loadTheme();
    const authUser = await authUserPromise;
    const profilePromise = authUser
      ? prisma.customerProfile.findFirst({
          where: { userId: authUser.id },
          select: { themeMode: true, isAdminUnlocked: true },
        })
      : Promise.resolve(null);
    const cartPromise = authUser
      ? prisma.cart.findFirst({
          where: { status: "active", profile: { userId: authUser.id } },
          select: { items: { select: { quantity: true } } },
        })
      : Promise.resolve(null);
    const [theme, profile, cart] = await Promise.all([
      themePromise,
      profilePromise,
      cartPromise,
    ]);
    const cartItems = Array.isArray(cart?.items)
      ? cart.items as Array<{ quantity: number }>
      : [];
    const count = cartItems.reduce((sum, item) => sum + item.quantity, 0);

    return apiOk({
      site: {
        name: "وال",
        locale: "fa-IR",
        dir: "rtl",
      },
      menu,
      user: authUser
        ? {
            ...authUser,
            profile: profile
              ? {
                  themeMode: profile.themeMode,
                  isAdminUnlocked: profile.isAdminUnlocked,
                }
              : null,
          }
        : null,
      cart: { count },
      theme,
    });
  } catch (error) {
    console.error("Global app GET error:", error);
    return apiServerError();
  }
}
