import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type { ComponentProps } from "react";
import { FaRegStar } from "react-icons/fa";
import { CustomInput } from "../../app/design-system/components/ui/input";
import { borderOptions, loadingOptions, roundedOptions, shadowOptions, sizeOptions, variantOptions } from "./story-options";

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
    shadow: { control: "select", options: shadowOptions },
    fullWidth: { control: "boolean" },
    disabled: { control: "boolean" },
    loading: { control: "select", options: loadingOptions },
    isLoading: { control: "boolean" },
    loadingText: { control: "text" },
    icon: { control: "boolean" },
    iconAfter: { control: "boolean" },
  },
  args: {
    placeholder: "Type here...",
    variant: "primary",
    size: "md",
    border: "base",
    rounded: "md",
    shadow: "none",
    fullWidth: true,
    disabled: false,
    isLoading: false,
    loading: "spinner",
    loadingText: "Loading...",
    icon: true,
    iconAfter: false,
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
