import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { CustomCard } from "../../app/design-system/components/ui/card";
import { borderOptions, gradientOptions, hoverOptions, loadingOptions, roundedOptions, shadowOptions, sizeOptions, variantOptions } from "./story-options";

const meta = {
  title: "Design System/CustomCard",
  component: CustomCard,
  tags: ["autodocs"],
  argTypes: {
    title: { control: "text" },
    children: { control: "text" },
    variant: { control: "select", options: variantOptions },
    size: { control: "select", options: sizeOptions },
    rounded: { control: "select", options: roundedOptions },
    border: { control: "select", options: borderOptions },
    gradient: { control: "select", options: gradientOptions },
    shadow: { control: "select", options: shadowOptions },
    hover: { control: "select", options: hoverOptions },
    loading: { control: "select", options: loadingOptions },
    isLoading: { control: "boolean" },
    loadingText: { control: "text" },
  },
  args: {
    title: "Card Title",
    variant: "primary",
    size: "md",
    rounded: "lg",
    border: "base",
    gradient: "btu",
    shadow: "sm",
    hover: "none",
    isLoading: false,
    loading: "spinner",
    loadingText: "Loading card...",
    children: "This is a custom card component.",
  },
} satisfies Meta<typeof CustomCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground = {} as Story;
