import { PUT as updateCartItem } from "@/app/api/cart/items/[productId]/route";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const PATCH = updateCartItem;
