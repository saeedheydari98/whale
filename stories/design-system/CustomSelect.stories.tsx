import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { CustomSelect } from "@/app/design-system/components/select";

const meta = {
  title: "Design System/CustomSelect",
  component: CustomSelect,
  tags: ["autodocs"],
  argTypes: {
    variant: { control: "select", options: ["primary", "secondary", "success", "danger", "warning", "info", "neutral"] },
    size: { control: "select", options: ["xs", "sm", "md", "lg", "xl"] },
    rounded: { control: "select", options: ["none", "sm", "md", "lg", "xl", "full"] },
    border: { control: "select", options: ["none", "base", "subtle", "strong", "heavy", "dashed", "dotted"] },
    shadow: { control: "select", options: ["none", "sm", "md", "lg", "xl"] },
  },
  args: {
    variant: "primary",
    size: "md",
    rounded: "md",
    border: "base",
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

export const Playground: Story = {};
