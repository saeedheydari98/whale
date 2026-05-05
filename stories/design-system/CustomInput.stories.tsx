import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { CustomInput } from "@/app/design-system/components/input";

const meta = {
  title: "Design System/CustomInput",
  component: CustomInput,
  tags: ["autodocs"],
  argTypes: {
    variant: { control: "select", options: ["primary", "secondary", "success", "danger", "warning", "info", "neutral"] },
    size: { control: "select", options: ["xs", "sm", "md", "lg", "xl"] },
    rounded: { control: "select", options: ["none", "sm", "md", "lg", "xl", "full"] },
    border: { control: "select", options: ["none", "base", "subtle", "strong", "heavy", "dashed", "dotted"] },
    shadow: { control: "select", options: ["none", "sm", "md", "lg", "xl"] },
  },
  args: {
    placeholder: "Type here...",
    variant: "primary",
    size: "md",
    border: "base",
    rounded: "md",
  },
} satisfies Meta<typeof CustomInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};
