import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { CustomSelect } from "../../app/design-system/components/ui/select";
import { borderOptions, gradientOptions, loadingOptions, roundedOptions, shadowOptions, sizeOptions, variantOptions } from "./story-options";

const meta = {
  title: "Design System/CustomSelect",
  component: CustomSelect,
  tags: ["autodocs"],
  argTypes: {
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
  },
  args: {
    variant: "primary",
    size: "md",
    rounded: "md",
    border: "base",
    gradient: "btu",
    shadow: "none",
    fullWidth: true,
    disabled: false,
    isLoading: false,
    loading: "spinner",
    loadingText: "Loading...",
  },
  render: (args) => (
    <CustomSelect {...args}>
      <option value="one">Option One</option>
      <option value="two">Option Two</option>
      <option value="three">Option Three</option>
    </CustomSelect>
  ),
} satisfies Meta<typeof CustomSelect>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground = {} as Story;
