import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { CustomTag } from "../../app/design-system/components/ui/tag";

const meta = {
  title: "Design System/CustomButton",
  component: CustomTag,
  tags: ["autodocs"],
  argTypes: {
    variant: { control: "select", options: ["primary", "secondary", "success", "danger", "warning", "info", "neutral"] },
    size: { control: "select", options: ["xs", "sm", "md", "lg", "xl"] },
    rounded: { control: "select", options: ["none", "sm", "md", "lg", "xl", "full"] },
    border: { control: "select", options: ["none", "base", "subtle", "strong", "heavy", "dashed", "dotted"] },
    shadow: { control: "select", options: ["none", "sm", "md", "lg", "xl"] },
  },
  args: {
    children: "Click me",
    variant: "primary",
    size: "md",
    rounded: "md",
    border: "none",
    shadow: "none",
  },
} satisfies Meta<typeof CustomTag>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground = {} as Story;
