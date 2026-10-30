import { useQuery } from "@tanstack/react-query";
import { getAuthUser } from "../api";
import { queryKeys } from "../../../lib/queryKeys";

const useAuthUser = () => {
  const authUser = useQuery({
    queryKey: queryKeys.authUser(),
    queryFn: getAuthUser,
    retry: false,
  });

  return {
    isLoading: authUser.isLoading,
    isFetching: authUser.isFetching,
    isError: authUser.isError,
    error: authUser.error,
    refetch: authUser.refetch,
    authUser: authUser.data?.user,
  };
};
export default useAuthUser;
