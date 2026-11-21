import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { CustomEmptyState } from "../../app/design-system/components/ui/empty-state";
import { CustomButton } from "../../app/design-system/components/ui/button";

const meta = {
  title: "Design System/EmptyState",
  component: CustomEmptyState,
  tags: ["autodocs"],
  args: { title: "سفارشی ثبت نشده است", description: "سفارش‌های شما پس از خرید اینجا نمایش داده می‌شوند.", tone: "neutral", size: "md" },
  argTypes: { tone: { control: "select", options: ["neutral", "info", "warning"] }, size: { control: "select", options: ["sm", "md"] } },
} satisfies Meta<typeof CustomEmptyState>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Empty: Story = {};
export const WithAction: Story = { args: { action: <CustomButton href="/products" size="sm">مشاهده محصولات</CustomButton> } };
export const NoSearchResults: Story = { args: { title: "نتیجه‌ای پیدا نشد", description: "عبارت جست‌وجو یا فیلترها را تغییر دهید.", tone: "info" } };
