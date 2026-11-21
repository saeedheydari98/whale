import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { AppHeading } from "../../app/design-system/components/ui/text";

const meta = {
  title: "Design System/AppHeading",
  component: AppHeading,
  tags: ["autodocs"],
  args: { level: 1, className: "text-3xl font-bold", children: "درباره وال؛ قابلیت‌ها و ایده‌های پیاده‌شده" },
  argTypes: { level: { control: "select", options: [1, 2, 3, 4, 5, 6] } },
  render: (args) => <AppHeading {...args} data-text-wrap />,
  parameters: { docs: { description: { component: "Use one level 1 heading per page, level 2 for sections, and level 3 for repeated item titles. Set explicit text size and weight. data-text-wrap opts out of the global single-line policy." } } },
} satisfies Meta<typeof AppHeading>;

export default meta;
type Story = StoryObj<typeof meta>;
export const PageTitle: Story = {};
export const SectionTitle: Story = { args: { level: 2, className: "text-xl font-bold", children: "قابلیت‌های فروشگاه" } };
export const ItemTitle: Story = { args: { level: 3, className: "text-base font-bold", children: "مدیریت موجودی رنگ‌ها" } };
