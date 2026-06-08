import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import React from "react";
import { CustomSwitch } from "../../app/design-system/components/ui/switch";
import { borderOptions, loadingOptions, roundedOptions, shadowOptions, sizeOptions, variantOptions } from "./story-options";

const meta = {
  title: "Design System/CustomSwitch",
  component: CustomSwitch,
  tags: ["autodocs"],
  argTypes: {
    label: { control: "text" },
    disabled: { control: "boolean" },
    customColor: { control: "color" },
    variant: { control: "select", options: variantOptions },
    size: { control: "select", options: sizeOptions },
    rounded: { control: "select", options: roundedOptions },
    border: { control: "select", options: borderOptions },
    shadow: { control: "select", options: shadowOptions },
    loading: { control: "select", options: loadingOptions },
    isLoading: { control: "boolean" },
    loadingText: { control: "text" },
    checked: { table: { disable: true } },
    onChange: { table: { disable: true } },
  },
  args: {
    label: "Enable feature",
    variant: "primary",
    size: "md",
    rounded: "full",
    border: "base",
    shadow: "none",
    disabled: false,
    customColor: "",
    isLoading: false,
    loading: "spinner",
    loadingText: "Saving...",
  },
  render: (args) => {
    const [checked, setChecked] = React.useState(false);
    return <CustomSwitch {...args} checked={checked} onChange={setChecked} />;
  },
} satisfies Meta<typeof CustomSwitch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground = {} as Story;
