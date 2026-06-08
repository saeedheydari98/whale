import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type { ComponentProps } from "react";
import { FaRegStar } from "react-icons/fa";
import { CustomTag } from "../../app/design-system/components/ui/tag";
import { borderOptions, roundedOptions, shadowOptions, sizeOptions, variantOptions } from "./story-options";

type StoryArgs = ComponentProps<typeof CustomTag> & {
  icon?: boolean;
  iconAfter?: boolean;
};

const meta = {
  title: "Design System/CustomTag",
  component: CustomTag,
  tags: ["autodocs"],
  argTypes: {
    children: { control: "text" },
    variant: { control: "select", options: variantOptions },
    size: { control: "select", options: sizeOptions },
    rounded: { control: "select", options: roundedOptions },
    border: { control: "select", options: borderOptions },
    shadow: { control: "select", options: shadowOptions },
    fullWidth: { control: "boolean" },
    token: { control: "text" },
    icon: { control: "boolean" },
    iconAfter: { control: "boolean" },
  },
  args: {
    children: "Status",
    variant: "primary",
    size: "md",
    rounded: "md",
    border: "none",
    shadow: "none",
    fullWidth: false,
    token: "",
    icon: true,
    iconAfter: false,
  },
  render: ({ icon, iconAfter, ...args }) => (
    <CustomTag
      {...args}
      icon={icon ? <FaRegStar /> : undefined}
      iconAfter={iconAfter ? <FaRegStar /> : undefined}
    />
  ),
} satisfies Meta<StoryArgs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground = {} as Story;
