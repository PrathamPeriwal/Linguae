import { QueryClient } from "@tanstack/react-query";

export const listQueryOptions = {
  refetchOnWindowFocus: false,
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      retry: 1,
    },
  },
});
