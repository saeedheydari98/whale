import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import Loading from "../../app/design-system/components/loading/loading";
import { CustomButton } from "../../app/design-system/components/ui/button";
import { CustomInput } from "../../app/design-system/components/ui/input";
import { AppHeading } from "../../app/design-system/components/ui/text";

const meta = {
  title: "Design System/Loading",
  component: Loading,
  tags: ["autodocs"],
  parameters: { docs: { description: { component: "Content loading measures the real final subtree. Toggle isLoading to compare the skeleton and loaded layout. Spinners belong inside the control submitting a mutation." } } },
  args: { loading: "skeleton-structure", isLoading: true },
  argTypes: { isLoading: { control: "boolean" }, loading: { control: false }, children: { control: false } },
  render: (args) => (
    <Loading {...args}>
      <section className="flex w-full max-w-lg flex-col gap-4 rounded-xl border border-primary-border bg-primary-card p-5">
        <AppHeading level={2} className="text-xl font-bold">اطلاعات دریافت سفارش</AppHeading>
        <div data-text-wrap className="text-sm leading-7 text-secondary-text">این فرم همان محتوای نهایی است؛ اندازهٔ اسکلتون از خود عناصر فرم به دست می‌آید.</div>
        <CustomInput label="نام گیرنده" defaultValue="سعید" />
        <CustomInput label="نشانی" defaultValue="تهران" />
        <CustomButton>ذخیره اطلاعات</CustomButton>
      </section>
    </Loading>
  ),
} satisfies Meta<typeof Loading>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};
export const Loaded: Story = { args: { isLoading: false } };
export const Submitting: Story = {
  render: () => <CustomButton isLoading loading="spinner" loadingText="در حال ذخیره">ذخیره</CustomButton>,
};
