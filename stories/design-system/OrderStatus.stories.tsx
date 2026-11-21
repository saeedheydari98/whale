import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { OrderStatusTag, OrderStatusTimeline } from "../../app/design-system/components/ui/order-status";
import { ORDER_STATUSES } from "../../lib/order-status";

const meta = {
  title: "Design System/OrderStatus",
  component: OrderStatusTimeline,
  tags: ["autodocs"],
  argTypes: { status: { control: "select", options: ORDER_STATUSES } },
  args: { status: "shipped", createdAt: "2026-11-18T08:00:00Z", history: [{ status: "processing", createdAt: "2026-11-19T08:00:00Z" }, { status: "shipped", createdAt: "2026-11-20T08:00:00Z" }] },
  render: (args) => <div className="flex w-full max-w-sm flex-col items-start gap-4"><OrderStatusTag status={args.status} /><OrderStatusTimeline {...args} /></div>,
} satisfies Meta<typeof OrderStatusTimeline>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Shipped: Story = {};
export const Pending: Story = { args: { status: "pending_approval", history: [] } };
export const Delivered: Story = { args: { status: "delivered", history: [...meta.args.history, { status: "delivered", createdAt: "2026-11-21T08:00:00Z" }] } };
