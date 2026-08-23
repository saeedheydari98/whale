import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import { EmailOtpAuthForm } from "../../app/design-system/components/ui/email-otp-auth-form";

const meta = {
  title: "Design System/EmailOtpAuthForm",
  component: EmailOtpAuthForm,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: "فرم ورود یا ساخت حساب با شماره موبایل، ایمیل و کد یک‌بارمصرف شش‌رقمی.",
      },
    },
  },
  decorators: [
    (Story) => (
      <div className="mx-auto flex w-full max-w-md flex-col">
        <Story />
      </div>
    ),
  ],
  args: {
    purpose: "login",
    submitLabel: "تأیید کد و ورود",
    onSuccess: fn(),
  },
  beforeEach: () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = fn(async (input: RequestInfo | URL) => {
      const url = typeof input === "string"
        ? input
        : input instanceof URL ? input.href : input.url;

      if (url.includes("/api/auth/request-otp")) {
        return new Response(JSON.stringify({
          ok: true,
          data: { sent: true, retryAfterSeconds: 60, expiresInSeconds: 300 },
        }), { status: 200, headers: { "Content-Type": "application/json" } });
      }

      return new Response(JSON.stringify({
        ok: true,
        data: {
          user: { id: 1, username: "09123456789", email: "user@example.com", role: "user" },
          profileComplete: false,
        },
      }), { status: 200, headers: { "Content-Type": "application/json" } });
    });

    return () => {
      globalThis.fetch = originalFetch;
    };
  },
} satisfies Meta<typeof EmailOtpAuthForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Identity: Story = {};

export const SixDigitCode: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText("شماره موبایل"), "09123456789");
    await userEvent.type(canvas.getByLabelText("ایمیل"), "user@example.com");
    await userEvent.click(canvas.getByRole("button", { name: /ارسال کد ورود به ایمیل/ }));

    const firstDigit = await canvas.findByLabelText("رقم 1 از کد ورود");
    await expect(firstDigit).toBeVisible();
    for (let index = 0; index < 6; index += 1) {
      await userEvent.type(canvas.getByLabelText(`رقم ${index + 1} از کد ورود`), String(index + 1));
    }
  },
};
