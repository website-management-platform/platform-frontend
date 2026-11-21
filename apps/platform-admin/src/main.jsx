import { createRoot } from "react-dom/client";
import "@/styles/main.scss";
import AppProviders from "@/app/AppProviders";
import AppRouter from "@/app/AppRouter";
import { registerChunkErrorRecovery } from "@/utils/chunkError";

const bootstrap = () => {
  registerChunkErrorRecovery();
  createRoot(document.getElementById("root")).render(
    <AppProviders>
      <AppRouter />
    </AppProviders>,
  );
};

bootstrap();
