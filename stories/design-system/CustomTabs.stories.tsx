import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import { CustomTabs } from "../../app/design-system/components/ui/tabs";

const meta = {
  title: "Design System/CustomTabs",
  component: CustomTabs,
  tags: ["autodocs"],
  args: {
    items: [{ id: "first", label: "گزینه اول" }, { id: "second", label: "گزینه دوم", badge: 2 }, { id: "disabled", label: "غیرفعال", disabled: true }],
    value: "first",
    ariaLabel: "انتخاب بخش",
    variant: "primary",
  },
  argTypes: { variant: { control: "select", options: ["primary", "secondary", "tertiary"] } },
  render: function ControlledTabs(args) {
    const [value, setValue] = useState(args.value);
    return <CustomTabs {...args} value={value} onChange={setValue} />;
  },
} satisfies Meta<typeof CustomTabs>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Primary: Story = {};
export const Secondary: Story = { args: { variant: "secondary" } };
export const Tertiary: Story = { args: { variant: "tertiary" } };
