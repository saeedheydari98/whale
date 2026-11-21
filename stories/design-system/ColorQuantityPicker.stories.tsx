import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useArgs } from "storybook/preview-api";
import { fn } from "storybook/test";
import type { ComponentProps } from "react";
import { ColorQuantityPicker } from "../../app/design-system/components/ui/color-quantity-picker";

const meta = {
  title: "Design System/ColorQuantityPicker",
  component: ColorQuantityPicker,
  tags: ["autodocs"],
  args: { colorStock: { blue: 3, red: 2, black: 0 }, selection: {}, stockQuantity: 5, layout: "inline", disabled: false, onChange: fn() },
  argTypes: { layout: { control: "select", options: ["inline", "rows"] } },
  render: function Render(args) {
    const [, updateArgs] = useArgs<ComponentProps<typeof ColorQuantityPicker>>();
    return <div className="w-full max-w-sm"><ColorQuantityPicker {...args} onChange={(color, count) => {
      args.onChange(color, count);
      updateArgs({ selection: { ...args.selection, [color]: count } });
    }} /></div>;
  },
} satisfies Meta<typeof ColorQuantityPicker>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Inline: Story = {};
export const Rows: Story = { args: { layout: "rows", selection: { blue: 1 } } };
export const SoldOut: Story = { args: { colorStock: { blue: 0, red: 0 }, stockQuantity: 0 } };
export const Disabled: Story = { args: { disabled: true, selection: { blue: 1 } } };
