import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import React from "react";
import { CustomSwitch } from "@/app/design-system/components/switch";

const meta = {
  title: "Design System/CustomSwitch",
  component: CustomSwitch,
  tags: ["autodocs"],
  argTypes: {
    variant: { control: "select", options: ["primary", "secondary", "success", "danger", "warning", "info", "neutral"] },
  },
  args: {
    label: "Enable feature",
    variant: "primary",
  },
  render: (args) => {
    const [checked, setChecked] = React.useState(false);
    return <CustomSwitch {...args} checked={checked} onChange={setChecked} />;
  },
} satisfies Meta<typeof CustomSwitch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};
