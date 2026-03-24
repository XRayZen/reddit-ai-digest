import type { Preview } from "@storybook/nextjs-vite";
import React, { type ReactNode } from "react";

import { Header } from "../src/components/header";
import { ScrollProgress } from "../src/components/scroll-progress";
import { ThemeProvider } from "../src/components/theme-provider";
import { appFontClassName } from "../src/lib/fonts";
import { StoreProvider } from "../src/store/provider";
import type { RootState } from "../src/store";

import "../src/app/globals.css";

function StorybookProviders({
  children,
  reduxState,
}: {
  children: ReactNode;
  reduxState?: Partial<RootState>;
}) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      disableTransitionOnChange
    >
      <StoreProvider preloadedState={reduxState}>
        <div
          className={`${appFontClassName} min-h-screen bg-background text-foreground antialiased`}
        >
          <ScrollProgress />
          {children}
        </div>
      </StoreProvider>
    </ThemeProvider>
  );
}

function PageShell({ children }: { children: ReactNode }) {
  return (
    <main className="page-shell">
      <Header />
      <div className="shell pb-20">{children}</div>
    </main>
  );
}

const preview: Preview = {
  parameters: {
    layout: "fullscreen",
    nextjs: {
      appDirectory: true,
    },
    controls: {
      expanded: true,
    },
  },
  decorators: [
    (Story, context) => (
      <StorybookProviders
        key={context.id}
        reduxState={context.parameters.reduxState as Partial<RootState>}
      >
        {context.parameters.pageShell ? (
          <PageShell>
            <Story />
          </PageShell>
        ) : (
          <Story />
        )}
      </StorybookProviders>
    ),
  ],
};

export default preview;
