import { describe, expect, it } from "vitest";
import { formatAmount } from "@/lib/price-format";

describe("formatAmount", () => {
  it("groups monetary values in sets of three digits", () => {
    expect(formatAmount(30000)).toBe("30,000");
    expect(formatAmount("۱۲۳۴۵۶۷")).toBe("1,234,567");
    expect(formatAmount("$2,499")).toBe("2,499");
  });

  it("supports the shared currency decorations and fallback", () => {
    expect(formatAmount(2500, { prefix: "$" })).toBe("$2,500");
    expect(formatAmount(2500, { suffix: " تومان" })).toBe("2,500 تومان");
    expect(formatAmount(null, { fallback: "بدون قیمت" })).toBe("بدون قیمت");
  });
});
