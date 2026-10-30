import { useQuery } from "@tanstack/react-query";
import { listQueryOptions } from "../../app/queryClient";
import useAuthUser from "../../features/auth/hooks/useAuthUser";
import { getFriendRequests } from "../../features/requests/api";
import { queryKeys } from "../../lib/queryKeys";

export function useIncomingCount() {
  const { authUser } = useAuthUser();
  const { data } = useQuery({
    queryKey: queryKeys.friendRequests(),
    queryFn: getFriendRequests,
    enabled: Boolean(authUser),
    ...listQueryOptions,
  });

  return Array.isArray(data?.incomingReqs) ? data.incomingReqs.length : 0;
}
