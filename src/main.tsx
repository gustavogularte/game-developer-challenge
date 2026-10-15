import * as React from "react";
import * as ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MatchSyncProvider } from "./data/MatchSync";
import "./index.css";
import App from "./App";
const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 0, refetchOnWindowFocus: true } },
});
const uiAssets = import.meta.glob<string>("../assets/png/default/ui/**/*.png", { eager: true, query: "?url", import: "default" });
for (const url of Object.values(uiAssets)) { const image = new Image(); image.src = url; }
async function start() {
  try {
    const { worker } = await import("./data/mocks");
    await worker.start({
      onUnhandledFrame: "bypass",
      quiet: import.meta.env.PROD,
      serviceWorker: { url: `${import.meta.env.BASE_URL}mockServiceWorker.js` },
    });
  } catch (error) {
    console.error(
      "Mock network unavailable. Gameplay remains available.",
      error,
    );
  }
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <MatchSyncProvider>
          <App />
        </MatchSyncProvider>
      </QueryClientProvider>
    </React.StrictMode>,
  );
}
void start();
