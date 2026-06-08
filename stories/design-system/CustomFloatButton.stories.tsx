import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type { ComponentProps } from "react";
import { FaArrowRight, FaPlus } from "react-icons/fa";
import { fn } from "storybook/test";
import { FloatButton } from "../../app/design-system/components/ui/float-button";
import { borderOptions, cursorOptions, hoverOptions, loadingOptions, roundedOptions, shadowOptions, sizeOptions, variantOptions } from "./story-options";

type StoryArgs = ComponentProps<typeof FloatButton> & {
  icon?: boolean;
  iconAfter?: boolean;
};

const meta = {
  title: "Design System/FloatButton",
  component: FloatButton,
  tags: ["autodocs"],
  argTypes: {
    label: { control: "text" },
    variant: { control: "select", options: variantOptions },
    size: { control: "select", options: sizeOptions },
    rounded: { control: "select", options: roundedOptions },
    border: { control: "select", options: borderOptions },
    shadow: { control: "select", options: shadowOptions },
    hover: { control: "select", options: hoverOptions },
    cursor: { control: "select", options: cursorOptions },
    fullWidth: { control: "boolean" },
    disabled: { control: "boolean" },
    position: { control: "select", options: ["bottom-right", "bottom-left"] },
    loading: { control: "select", options: loadingOptions },
    isLoading: { control: "boolean" },
    loadingText: { control: "text" },
    icon: { control: "boolean" },
    iconAfter: { control: "boolean" },
  },
  args: {
    label: "Create",
    variant: "primary",
    size: "md",
    rounded: "full",
    border: "base",
    shadow: "lg",
    hover: "lift",
    cursor: "pointer",
    fullWidth: false,
    disabled: false,
    position: "bottom-right",
    isLoading: false,
    loading: "spinner",
    loadingText: "Creating...",
    icon: true,
    iconAfter: false,
    onClick: fn(),
  },
  render: ({ icon, iconAfter, ...args }) => (
    <div className="relative h-28 overflow-visible p-4">
      <FloatButton
        {...args}
        className="!absolute !bottom-4"
        icon={icon ? <FaPlus /> : null}
        iconAfter={iconAfter ? <FaArrowRight /> : undefined}
      />
    </div>
  ),
  parameters: {
    layout: "padded",
  },
} satisfies Meta<StoryArgs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground = {} as Story;
