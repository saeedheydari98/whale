import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ProductRatingSummary } from "../../app/design-system/components/ui/product-rating-summary";

const meta = {
  title: "Design System/ProductRatingSummary",
  component: ProductRatingSummary,
  tags: ["autodocs"],
  args: { average: 4.3, count: 28, size: "sm" },
  argTypes: { average: { control: { type: "range", min: 0, max: 5, step: 0.1 } }, count: { control: "number" }, size: { control: "select", options: ["sm", "md", "lg"] } },
} satisfies Meta<typeof ProductRatingSummary>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Rated: Story = {};
export const NoRatings: Story = { args: { average: null, count: 0 } };
