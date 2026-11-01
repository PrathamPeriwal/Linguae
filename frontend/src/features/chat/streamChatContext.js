import { createContext, useContext } from "react";

export const StreamChatContext = createContext(null);

export function useStreamChat() {
  const value = useContext(StreamChatContext);
  if (!value) {
    throw new Error("useStreamChat must be used within StreamChatProvider");
  }
  return value;
}
