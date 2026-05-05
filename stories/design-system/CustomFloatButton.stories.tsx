import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { FloatButton } from "@/app/design-system/components/float-button";

const meta = {
  title: "Design System/FloatButton",
  component: FloatButton,
  tags: ["autodocs"],
  argTypes: {
    variant: { control: "select", options: ["primary", "secondary", "success", "danger", "warning", "info", "neutral"] },
    position: { control: "select", options: ["bottom-right", "bottom-left"] },
  },
  args: {
    label: "Create",
    icon: "+",
    variant: "primary",
    position: "bottom-right",
    onClick: fn(),
  },
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof FloatButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};
