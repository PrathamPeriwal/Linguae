import { useMutation, useQueryClient } from "@tanstack/react-query";
import { signup } from "../api";
import { queryKeys } from "../../../lib/queryKeys";

const useSignUp = () => {
  const queryClient = useQueryClient();

  const { mutate, isPending, error } = useMutation({
    mutationFn: signup,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.authUser() }),
  });

  return { isPending, error, signupMutation: mutate };
};
export default useSignUp;
