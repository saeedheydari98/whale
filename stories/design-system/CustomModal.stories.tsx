import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import React from "react";
import { CustomButton } from "../../app/design-system/components/ui/button";
import { CustomModal } from "../../app/design-system/components/ui/modal";
import { borderOptions, loadingOptions, roundedOptions, shadowOptions, sizeOptions, variantOptions } from "./story-options";

const meta = {
  title: "Design System/CustomModal",
  component: CustomModal,
  tags: ["autodocs"],
  argTypes: {
    title: { control: "text" },
    closeText: { control: "text" },
    variant: { control: "select", options: variantOptions },
    size: { control: "select", options: sizeOptions },
    rounded: { control: "select", options: roundedOptions },
    border: { control: "select", options: borderOptions },
    shadow: { control: "select", options: shadowOptions },
    loading: { control: "select", options: loadingOptions },
    isLoading: { control: "boolean" },
    loadingText: { control: "text" },
    open: { table: { disable: true } },
    onClose: { table: { disable: true } },
  },
  args: {
    title: "Confirm Action",
    variant: "primary",
    size: "md",
    rounded: "lg",
    border: "base",
    shadow: "lg",
    closeText: "Close",
    isLoading: false,
    loading: "spinner",
    loadingText: "Loading modal...",
  },
  render: (args) => {
    const [open, setOpen] = React.useState(false);
    return (
      <div>
        <CustomButton onClick={() => setOpen(true)}>Open Modal</CustomButton>
        <CustomModal {...args} open={open} onClose={() => setOpen(false)}>
          Modal body content. You can put forms or details here.
        </CustomModal>
      </div>
    );
  },
} satisfies Meta<typeof CustomModal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground = {} as Story;
