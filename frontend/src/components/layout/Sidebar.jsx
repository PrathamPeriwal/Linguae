import { Link, useLocation } from "react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BellIcon,
  HomeIcon,
  MessageCircleIcon,
  ShipWheelIcon,
} from "lucide-react";
import { StreamChat } from "stream-chat";
import useAuthUser from "../hooks/useAuthUser";
import { getStreamToken, getUserFriends } from "../lib/api";

const Sidebar = () => {
  const { authUser } = useAuthUser();
  const location = useLocation();
  const currentPath = location.pathname;

  const [unreadCounts, setUnreadCounts] = useState({});
  const [chatClient, setChatClient] = useState(null);

  const { data: friends = [] } = useQuery({
    queryKey: ["sidebar-friends"],
    queryFn: getUserFriends,
    enabled: !!authUser,
  });

  const { data: tokenData } = useQuery({
    queryKey: ["sidebar-stream-token"],
    queryFn: getStreamToken,
    enabled: !!authUser,
  });

  // Initialize Stream Chat and fetch unread counts for friends (desktop only sidebar)
  useEffect(() => {
    const init = async () => {
      if (!tokenData?.token || !authUser || !friends.length) return;

      try {
        const client = StreamChat.getInstance(
          import.meta.env.VITE_STREAM_API_KEY
        );

        if (!client.userID) {
          await client.connectUser(
            {
              id: authUser._id,
              name: authUser.fullName,
              image: authUser.profilePic,
            },
            tokenData.token
          );
        }

        setChatClient(client);

        const counts = {};
        for (const friend of friends) {
          const channelId = [authUser._id, friend._id].sort().join("-");
          const channel = client.channel("messaging", channelId);
          await channel.watch();
          const unreadCount = channel.state.unreadCount || 0;
          if (unreadCount > 0) counts[friend._id] = unreadCount;
        }
        setUnreadCounts(counts);
      } catch (err) {
        console.error("Sidebar chat init failed", err);
      }
    };

    init();

    return () => {
      if (chatClient) {
        chatClient.disconnectUser().catch(console.error);
      }
    };
  }, [tokenData, authUser, friends]);

  // Live update unread counts
  useEffect(() => {
    if (!chatClient) return;

    const handler = (event) => {
      if (event.user.id !== authUser._id) {
        const senderId = event.user.id;
        setUnreadCounts((prev) => ({
          ...prev,
          [senderId]: (prev[senderId] || 0) + 1,
        }));
      }
    };

    chatClient.on("message.new", handler);
    return () => chatClient.off("message.new", handler);
  }, [chatClient, authUser]);

  return (
    <aside className="w-64 bg-base-200 border-r border-base-300 hidden lg:flex flex-col h-screen sticky top-0">
      <div className="p-5 border-b border-base-300">
        <Link to="/" className="block">
          <div className="flex items-center gap-2.5">
            <ShipWheelIcon className="size-9 text-primary" />
            <span className="text-3xl font-bold font-mono bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary  tracking-wider">
              Linguae
            </span>
          </div>
          <p className="text-[10px] text-base-content/50 mt-1 ml-11 leading-tight">
            Learn languages through real conversations.
          </p>
        </Link>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        <Link
          to="/"
          className={`btn btn-ghost justify-start w-full gap-3 px-3 normal-case ${
            currentPath === "/" ? "btn-active" : ""
          }`}
        >
          <HomeIcon className="size-5 text-base-content opacity-70" />
          <span>Home</span>
        </Link>

        <Link
          to="/notifications"
          className={`btn btn-ghost justify-start w-full gap-3 px-3 normal-case ${
            currentPath === "/notifications" ? "btn-active" : ""
          }`}
        >
          <BellIcon className="size-5 text-base-content opacity-70" />
          <span>Notifications</span>
        </Link>

        {/* Friends list (desktop only sidebar) */}
        {friends.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-xs uppercase tracking-wide text-base-content/60 px-3">
              Your Friends
            </p>
            <div className="space-y-1">
              {friends.map((friend) => {
                const isActive = currentPath === `/chat/${friend._id}`;
                const unread = unreadCounts[friend._id] || 0;

                return (
                  <Link
                    key={friend._id}
                    to={`/chat/${friend._id}`}
                    className={`btn btn-ghost justify-start w-full gap-3 px-3 normal-case items-center ${
                      isActive ? "btn-active" : ""
                    }`}
                  >
                    <div className="avatar">
                      <div className="w-8 rounded-full">
                        <img src={friend.profilePic} alt={friend.fullName} />
                      </div>
                    </div>
                    <div className="flex-1 truncate text-left">
                      <p className="text-sm font-medium truncate">
                        {friend.fullName}
                      </p>
                      <p className="text-[11px] text-base-content/60 truncate">
                        {isActive ? "In chat" : "Tap to chat"}
                      </p>
                    </div>
                    {unread > 0 && (
                      <span className="badge badge-error badge-sm gap-1">
                        <MessageCircleIcon className="size-3" />
                        {unread}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </nav>

      {/* USER PROFILE SECTION */}
      <div className="p-4 border-t border-base-300 mt-auto">
        <div className="flex items-center gap-3">
          <div className="avatar">
            <div className="w-10 rounded-full">
              <img src={authUser?.profilePic} alt="User Avatar" />
            </div>
          </div>
          <div className="flex-1">
            <p className="font-semibold text-sm">{authUser?.fullName}</p>
            <p className="text-xs text-success flex items-center gap-1">
              <span className="size-2 rounded-full bg-success inline-block" />
              Online
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
};
export default Sidebar;
