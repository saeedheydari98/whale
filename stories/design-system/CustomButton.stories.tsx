import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type { ComponentProps } from "react";
import { FaRegStar } from "react-icons/fa";
import { fn } from "storybook/test";
import { CustomButton } from "../../app/design-system/components/ui/button";
import { borderOptions, cursorOptions, gradientOptions, hoverOptions, loadingOptions, roundedOptions, shadowOptions, sizeOptions, variantOptions } from "./story-options";

type StoryArgs = ComponentProps<typeof CustomButton> & {
  icon?: boolean;
  iconAfter?: boolean;
};

const meta = {
  title: "Design System/CustomButton",
  component: CustomButton,
  tags: ["autodocs"],
  argTypes: {
    variant: { control: "select", options: variantOptions },
    size: { control: "select", options: sizeOptions },
    hover: { control: "select", options: hoverOptions },
    rounded: { control: "select", options: roundedOptions },
    border: { control: "select", options: borderOptions },
    gradient: { control: "select", options: gradientOptions },
    shadow: { control: "select", options: shadowOptions },
    cursor: { control: "select", options: cursorOptions },
    fullWidth: { control: "boolean" },
    disabled: { control: "boolean" },
    token: { control: "text" },
    loading: { control: "select", options: loadingOptions },
    isLoading: { control: "boolean" },
    loadingText: { control: "text" },
    icon: { control: "boolean" },
    iconAfter: { control: "boolean" },
  },
  args: {
    children: "Click me",
    variant: "primary",
    size: "md",
    hover: "scale",
    rounded: "md",
    border: "borderB",
    gradient: "btu",
    shadow: "none",
    cursor: "pointer",
    fullWidth: false,
    disabled: false,
    token: "",
    isLoading: false,
    loading: "spinner",
    loadingText: "Loading...",
    icon: true,
    iconAfter: false,
    onClick: fn(),
  },
  render: ({ icon, iconAfter, ...args }) => (
    <CustomButton
      {...args}
      icon={icon ? <FaRegStar /> : undefined}
      iconAfter={iconAfter ? <FaRegStar /> : undefined}
    />
  ),
} satisfies Meta<StoryArgs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground = {} as Story;
