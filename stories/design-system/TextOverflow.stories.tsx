import type { Meta, StoryObj } from "@storybook/nextjs-vite";

const text = "وال یک فروشگاه یکپارچه است که کاتالوگ، سفارش‌ها، کیف پول و مدیریت موجودی رنگ‌ها را در کنار هم قرار می‌دهد. متن کامل در صفحات توضیحی باید بدون برش و بدون نیاز به تولتیپ قابل خواندن باشد.";
const meta = {
  title: "Design System/TextOverflow",
  tags: ["autodocs"],
  parameters: { docs: { description: { component: "The preview mounts the shared AppOverflowTooltip. Hover or focus a clipped control for full text. Explanatory content uses data-text-wrap and a data-overflow-tooltip=off ancestor." } } },
  render: () => <div className="w-full max-w-xs"><span>{text}</span></div>,
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;
export const ClippedWithTooltip: Story = {};
export const FullTextWithoutTooltip: Story = {
  render: () => <div data-overflow-tooltip="off" className="w-full max-w-xs"><span data-text-wrap className="wrap-anywhere text-sm leading-7">{text}</span></div>,
};
