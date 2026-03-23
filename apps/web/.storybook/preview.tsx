import type { Preview } from "@storybook/nextjs-vite";
import React, { type ReactNode } from "react";

import { Header } from "../src/components/header";
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
    <StoreProvider preloadedState={reduxState}>
      <div className={appFontClassName}>{children}</div>
    </StoreProvider>
  );
}

function PageShell({ children }: { children: ReactNode }) {
  return (
    <main className="page-shell">
      <Header />
      <div className="shell">{children}</div>
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
