import { GET as getShowcaseProducts } from "@/app/api/showcases/[id]/products/route";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = getShowcaseProducts;
