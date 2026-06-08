import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import Loading from "../../app/design-system/components/loading/loading";
import { loadingOptions, sizeOptions } from "./story-options";

const meta = {
  title: "Design System/Loading",
  component: Loading,
  tags: ["autodocs"],
  argTypes: {
    loading: { control: "select", options: loadingOptions },
    size: { control: "select", options: sizeOptions },
    children: { control: "text" },
  },
  args: {
    loading: "spinner",
    size: "md",
    children: "Loading preview",
  },
  render: (args) => (
    <div className="flex min-h-20 items-center justify-center text-ui-primary">
      <Loading {...args}>
        <span>{args.children}</span>
      </Loading>
    </div>
  ),
} satisfies Meta<typeof Loading>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground = {} as Story;
