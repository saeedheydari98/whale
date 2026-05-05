import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import React from "react";
import { CustomButton } from "@/app/design-system/components/button";
import { CustomModal } from "@/app/design-system/components/modal";

const meta = {
  title: "Design System/CustomModal",
  component: CustomModal,
  tags: ["autodocs"],
  argTypes: {
    variant: { control: "select", options: ["primary", "secondary", "success", "danger", "warning", "info", "neutral"] },
  },
  args: {
    title: "Confirm Action",
    variant: "primary",
    closeText: "Close",
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

export const Playground: Story = {};
