import { QueryClientProvider } from "@tanstack/react-query";
import { MotionConfig } from "motion/react";
import { BrowserRouter } from "react-router";
import { queryClient } from "./queryClient";

export function AppProviders({ children }) {
  return (
    <MotionConfig reducedMotion="user">
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>{children}</BrowserRouter>
      </QueryClientProvider>
    </MotionConfig>
  );
}
