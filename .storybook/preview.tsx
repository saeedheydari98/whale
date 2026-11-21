import type { Preview } from '@storybook/nextjs-vite'
import { ThemeProvider } from '../app/design-system/theme/provider';
import { AppOverflowTooltip } from '../app/design-system/components/ui/overflow-tooltip';
import { AppNotificationProvider } from '../app/design-system/components/feedback/notification-provider';
import '../app/globals.css';

const previewTheme = { primary: "blue", style: "light" } as const;

const preview: Preview = {
  globalTypes: {
    direction: {
      description: "Text direction",
      toolbar: { title: "Direction", items: [{ value: "rtl", title: "فارسی · RTL" }, { value: "ltr", title: "English · LTR" }], dynamicTitle: true },
    },
  },
  initialGlobals: { direction: "rtl" },
  decorators: [
    (Story, context) => (
      <ThemeProvider initialAdminTheme={previewTheme}>
        <div
          dir={context.globals.direction}
          lang={context.globals.direction === "rtl" ? "fa" : "en"}
          className="flex min-w-0 flex-col gap-4 bg-primary-base p-4 text-primary-text"
        >
          <AppNotificationProvider>
            <Story />
            <AppOverflowTooltip />
          </AppNotificationProvider>
        </div>
      </ThemeProvider>
    ),
  ],
  parameters: {
    layout: "padded",
    nextjs: { appDirectory: true },
    controls: {
      matchers: {
       color: /(background|color)$/i,
       date: /Date$/i,
      },
    },

    a11y: {
      // 'todo' - show a11y violations in the test UI only
      // 'error' - fail CI on a11y violations
      // 'off' - skip a11y checks entirely
      test: 'todo'
    }
  },
};

export default preview;
