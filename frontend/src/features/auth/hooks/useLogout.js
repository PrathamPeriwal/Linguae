import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { logout } from "../api";
import { disconnectChat } from "../../chat/chatSession";
import { disconnectVideo } from "../../call/videoClient";

const useLogout = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const {
    mutate: logoutMutation,
    isPending,
    error,
  } = useMutation({
    mutationFn: logout,
    onSuccess: async () => {
      await disconnectChat();
      await disconnectVideo();
      queryClient.clear();
      navigate("/login");
    },
  });

  return { logoutMutation, isPending, error };
};
export default useLogout;
