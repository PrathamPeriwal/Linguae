export const queryKeys = {
  authUser: () => ["authUser"],
  friends: () => ["friends"],
  users: (filters) => (filters ? ["users", filters] : ["users"]),
  outgoingFriendReqs: () => ["outgoingFriendReqs"],
  friendRequests: () => ["friendRequests"],
  streamToken: () => ["streamToken"],
};
