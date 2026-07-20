import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type { ComponentProps } from "react";
import { FaRegStar } from "react-icons/fa";
import { CustomInput } from "../../app/design-system/components/ui/input";
import { borderOptions, gradientOptions, loadingOptions, roundedOptions, shadowOptions, sizeOptions, variantOptions } from "./story-options";

type StoryArgs = ComponentProps<typeof CustomInput> & {
  icon?: boolean;
  iconAfter?: boolean;
};

const meta = {
  title: "Design System/CustomInput",
  component: CustomInput,
  tags: ["autodocs"],
  argTypes: {
    placeholder: { control: "text" },
    variant: { control: "select", options: variantOptions },
    size: { control: "select", options: sizeOptions },
    rounded: { control: "select", options: roundedOptions },
    border: { control: "select", options: borderOptions },
    gradient: { control: "select", options: gradientOptions },
    shadow: { control: "select", options: shadowOptions },
    fullWidth: { control: "boolean" },
    disabled: { control: "boolean" },
    loading: { control: "select", options: loadingOptions },
    isLoading: { control: "boolean" },
    loadingText: { control: "text" },
    icon: { control: "boolean" },
    iconAfter: { control: "boolean" },
    multiline: { control: "boolean" },
    height: { control: "text" },
  },
  args: {
    placeholder: "Type here...",
    variant: "primary",
    size: "md",
    border: "base",
    rounded: "md",
    gradient: "btu",
    shadow: "none",
    fullWidth: true,
    disabled: false,
    isLoading: false,
    loading: "spinner",
    loadingText: "Loading...",
    icon: true,
    iconAfter: false,
    multiline: false,
  },
  render: ({ icon, iconAfter, ...args }) => (
    <CustomInput
      {...args}
      icon={icon ? <FaRegStar /> : undefined}
      iconAfter={iconAfter ? <FaRegStar /> : undefined}
    />
  ),
} satisfies Meta<StoryArgs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground = {} as Story;

export const Textarea = {
  args: {
    placeholder: "Write a longer message...",
    multiline: true,
    height: "10rem",
    icon: false,
    iconAfter: false,
  },
} as Story;
