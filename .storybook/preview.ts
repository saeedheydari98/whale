import type { Preview } from '@storybook/nextjs-vite'
import React from 'react';
import { ThemeProvider } from '../app/design-system/theme/provider';
import '../app/globals.css';

const preview: Preview = {
  decorators: [
    (Story) =>
      React.createElement(
        ThemeProvider,
        null,
        React.createElement(
          "div",
          { style: { padding: "16px", minHeight: "100vh" } },
          React.createElement(Story)
        )
      ),
  ],
  parameters: {
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