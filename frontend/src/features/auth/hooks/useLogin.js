import { useMutation, useQueryClient } from "@tanstack/react-query";
import { login } from "../api";
import { queryKeys } from "../../../lib/queryKeys";

const useLogin = () => {
  const queryClient = useQueryClient();
  const { mutate, isPending, error } = useMutation({
    mutationFn: login,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.authUser() }),
  });

  return { error, isPending, loginMutation: mutate };
};

export default useLogin;
