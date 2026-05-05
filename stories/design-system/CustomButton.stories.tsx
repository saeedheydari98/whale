import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { CustomButton } from "@/app/design-system/components/button";

const meta = {
  title: "Design System/CustomButton",
  component: CustomButton,
  tags: ["autodocs"],
  argTypes: {
    variant: { control: "select", options: ["primary", "secondary", "success", "danger", "warning", "info", "neutral"] },
    size: { control: "select", options: ["xs", "sm", "md", "lg", "xl"] },
    hover: { control: "select", options: ["none", "scale", "lift", "darken", "drken"] },
    rounded: { control: "select", options: ["none", "sm", "md", "lg", "xl", "full"] },
    border: { control: "select", options: ["none", "base", "subtle", "strong", "heavy", "dashed", "dotted"] },
    shadow: { control: "select", options: ["none", "sm", "md", "lg", "xl"] },
  },
  args: {
    children: "Click me",
    variant: "primary",
    size: "md",
    hover: "scale",
    rounded: "md",
    border: "none",
    shadow: "none",
    onClick: fn(),
  },
} satisfies Meta<typeof CustomButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};
