import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/api/queryClient";
import ThemeProvider from "@/context/ThemeProvider";
import ConfirmProvider from "@/context/ConfirmProvider";
import { Toaster } from "@/components/Toast";

const AppProviders = ({ children }) => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <ConfirmProvider>
        {children}
        <Toaster />
      </ConfirmProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default AppProviders;
