import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { CustomCard } from "@/app/design-system/components/card";

const meta = {
  title: "Design System/CustomCard",
  component: CustomCard,
  tags: ["autodocs"],
  argTypes: {
    variant: { control: "select", options: ["primary", "secondary", "success", "danger", "warning", "info", "neutral"] },
    rounded: { control: "select", options: ["none", "sm", "md", "lg", "xl", "full"] },
    border: { control: "select", options: ["none", "base", "subtle", "strong", "heavy", "dashed", "dotted"] },
    shadow: { control: "select", options: ["none", "sm", "md", "lg", "xl"] },
  },
  args: {
    title: "Card Title",
    variant: "primary",
    children: "This is a custom card component.",
  },
} satisfies Meta<typeof CustomCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};
