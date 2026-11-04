import { createElement, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useNavigate } from "react-router";
import { listQueryOptions } from "../../app/queryClient";
import useAuthUser from "../auth/hooks/useAuthUser";
import { chatChannelId } from "../chat/channelId";
import { useStreamChat } from "../chat/streamChatContext";
import { queryKeys } from "../../lib/queryKeys";
import { getFriendRequests } from "./api";

// Friend-request events refetch these lists while Stream is connected. Polling is the fallback.
const CONNECTED_POLL_MS = 120_000;
const FALLBACK_POLL_MS = 30_000;
const ownRequestIds = new Set();

export function noteOwnRequestAction(id) {
  if (id == null || id === "") return;
  ownRequestIds.add(String(id));
}

function personName(person) {
  if (person == null || typeof person !== "object") return null;
  const raw = person.fullName;
  if (typeof raw !== "string") return "Someone";
  const trimmed = raw.trim();
  return trimmed || "Someone";
}

function collect(list, personKey) {
  if (!Array.isArray(list)) return [];
  const rows = [];
  for (const item of list) {
    const person = item?.[personKey];
    const name = personName(person);
    if (item?._id == null || name == null) continue;
    rows.push({
      id: String(item._id),
      name,
      theirId: person._id == null ? "" : String(person._id),
    });
  }
  return rows;
}

function freshRows(rows, seen) {
  return rows.filter((row) => !seen.has(row.id) && !ownRequestIds.has(row.id));
}

function actionToast(message, label, onClick) {
  return (t) =>
    createElement(
      "span",
      { className: "flex flex-wrap items-center gap-2" },
      createElement("span", null, message),
      createElement(
        "button",
        {
          type: "button",
          className: "toast-action",
          onClick: () => {
            toast.dismiss(t.id);
            onClick();
          },
        },
        label,
      ),
    );
}

export function useRequestNotifications() {
  const { authUser } = useAuthUser();
  const { connection } = useStreamChat();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const seen = useRef(null);
  const pollMs = connection === "ready" ? CONNECTED_POLL_MS : FALLBACK_POLL_MS;

  const { data, isSuccess } = useQuery({
    queryKey: queryKeys.friendRequests(),
    queryFn: getFriendRequests,
    enabled: Boolean(authUser),
    ...listQueryOptions,
    refetchInterval: pollMs,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: "always",
  });

  useEffect(() => {
    if (!isSuccess || data == null) return;
    const incoming = collect(data.incomingReqs, "sender");
    const accepted = collect(data.acceptedReqs, "recipient");
    if (seen.current == null) {
      seen.current = {
        incoming: new Set(incoming.map((row) => row.id)),
        accepted: new Set(accepted.map((row) => row.id)),
      };
      return;
    }

    const nextIncoming = freshRows(incoming, seen.current.incoming);
    const nextAccepted = freshRows(accepted, seen.current.accepted);
    seen.current = {
      incoming: new Set(incoming.map((row) => row.id)),
      accepted: new Set(accepted.map((row) => row.id)),
    };
    if (nextIncoming.length === 0 && nextAccepted.length === 0) return;

    if (nextAccepted.length > 0) {
      queryClient.invalidateQueries({ queryKey: queryKeys.friends() });
      queryClient.invalidateQueries({ queryKey: queryKeys.users() });
      queryClient.invalidateQueries({ queryKey: queryKeys.outgoingFriendReqs() });
    }

    const total = nextIncoming.length + nextAccepted.length;
    const view = () => navigate("/notifications");
    let message = `${total} new requests`;
    let label = "View";
    let go = view;

    if (total === 1 && nextIncoming.length === 1) {
      message = `${nextIncoming[0].name} sent you a request`;
    } else if (total === 1 && nextAccepted.length === 1) {
      const row = nextAccepted[0];
      message = `${row.name} accepted your request`;
      if (authUser?._id && row.theirId) {
        label = "Say hello";
        const path = `/chat/${chatChannelId(authUser._id, row.theirId)}`;
        go = () => navigate(path);
      }
    }

    toast.success(actionToast(message, label, go), { duration: 8000 });
  }, [authUser?._id, data, isSuccess, navigate, queryClient]);
}
