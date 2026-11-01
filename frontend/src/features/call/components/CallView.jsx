import "@stream-io/video-react-sdk/dist/css/styles.css";
import "../../../styles/stream-video.css";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useNavigate, useParams } from "react-router";
import {
  CallControls,
  CallingState,
  DeviceSelectorAudioInput,
  DeviceSelectorVideo,
  SpeakerLayout,
  StreamCall,
  StreamTheme,
  StreamVideo,
  StreamVideoClient,
  ToggleAudioPreviewButton,
  ToggleVideoPreviewButton,
  VideoPreview,
  useCallStateHooks,
} from "@stream-io/video-react-sdk";
import { listQueryOptions } from "../../../app/queryClient";
import { Avatar } from "../../../components/ui/Avatar";
import { Bloom } from "../../../components/ui/Bloom";
import { Button } from "../../../components/ui/Button";
import { ErrorState } from "../../../components/ui/ErrorState";
import useAuthUser from "../../auth/hooks/useAuthUser";
import { getStreamToken } from "../../chat/api";
import { chatUserIdFromRoute } from "../../chat/channelId";
import { getUserFriends } from "../../friends/api";
import { getErrorMessage } from "../../../lib/errors";
import { queryKeys } from "../../../lib/queryKeys";
import { beginVideoSession, stopCallTracks } from "../videoClient";

const API_KEY = import.meta.env.VITE_STREAM_API_KEY;

const CONTROL_NAMES = {
  "preview-audio-mute-button": "Mute microphone",
  "preview-audio-unmute-button": "Unmute microphone",
  "preview-video-mute-button": "Turn camera off",
  "preview-video-unmute-button": "Turn camera on",
  "audio-mute-button": "Mute microphone",
  "audio-unmute-button": "Unmute microphone",
  "video-mute-button": "Turn camera off",
  "video-unmute-button": "Turn camera on",
  "cancel-call-button": "Leave call",
  "leave-call-button": "Leave call",
  "end-call-for-all-button": "End call for everyone",
  "screen-share-start-button": "Share screen",
  "screen-share-stop-button": "Stop sharing screen",
  "recording-start-button": "Record call",
  "recording-stop-button": "Stop recording",
  "stats-button": "Call stats",
  "audio-output-button": "Speaker",
};

function labelStreamControls(root) {
  if (!root) return;
  root.querySelectorAll("button").forEach((button) => {
    if (button.getAttribute("aria-label")) return;
    const named = CONTROL_NAMES[button.getAttribute("data-testid")];
    if (named) button.setAttribute("aria-label", named);
    else if (button.querySelector(".str-video__icon--reactions")) button.setAttribute("aria-label", "Reactions");
    else if (button.querySelector(".str-video__icon--ellipsis")) button.setAttribute("aria-label", "Participant options");
    else if (button.title) button.setAttribute("aria-label", button.title);
  });
  root.querySelectorAll(".str-video__menu-toggle-button").forEach((button) => {
    if (button.getAttribute("aria-label")) return;
    const main = button.parentElement?.querySelector("button[aria-label]");
    const base = main?.getAttribute("aria-label") || "Call";
    button.setAttribute("aria-label", `${base} options`);
  });
  root.querySelectorAll(".str-video__device-settings__device-kind").forEach((kind) => {
    const title = kind.querySelector(".str-video__device-settings__device-selector-title")?.textContent?.trim();
    const control = kind.querySelector(".str-video__dropdown-selected");
    if (title && control && !control.getAttribute("aria-label")) control.setAttribute("aria-label", title);
  });
}

function deviceNote(camera, mic, tried, failed) {
  if (!tried || camera.isPromptingPermission || mic.isPromptingPermission) return "";
  const denied = [...failed];
  const missing = [];
  for (const [label, device] of [
    ["camera", camera],
    ["microphone", mic],
  ]) {
    if (denied.includes(label)) continue;
    if (device.hasBrowserPermission === false) denied.push(label);
    else if (Array.isArray(device.devices) && device.devices.length === 0 && device.status !== "enabled") {
      missing.push(label);
    }
  }
  if (denied.length === 2) {
    return "The camera and microphone are blocked. Allow them in the browser's site settings, or join with them off.";
  }
  if (denied.length === 1) {
    return `The ${denied[0]} is blocked. Allow it in the browser's site settings, or join with it off.`;
  }
  if (missing.length === 2) return "No camera or microphone was found. You can still join with them off.";
  if (missing.length === 1) return `No ${missing[0]} was found. You can still join with it off.`;
  return "";
}

function CallHeader({ name, friend, status, onBack }) {
  return (
    <header className="flex shrink-0 items-center gap-2 border-b border-line bg-panel px-2 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))] sm:gap-3 sm:px-3">
      <button
        type="button"
        aria-label="Back to chat"
        onClick={onBack}
        className="inline-flex size-11 shrink-0 items-center justify-center rounded-control text-fg"
      >
        <ArrowLeft className="size-5" aria-hidden="true" />
      </button>
      {friend ? <Avatar src={friend.profilePic} name={name} size={40} /> : null}
      <div className="min-w-0 flex-1">
        <h1 className="truncate font-sans text-h3 text-fg">Call with {name}</h1>
        <p className="truncate text-caption text-fg-muted">{status}</p>
      </div>
    </header>
  );
}

function Connecting({ name }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-bg/80 px-6 text-center" role="status">
      <Loader2 className="size-6 animate-spin text-fg motion-reduce:animate-none" aria-hidden="true" />
      <p className="text-body text-fg">Connecting to {name}...</p>
    </div>
  );
}

function Waiting({ name }) {
  return (
    <div className="call-waiting pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden px-6">
      <Bloom />
      <p className="relative text-body text-fg">Waiting for {name} to join...</p>
    </div>
  );
}

function CallFrame({ name, friend, status, onBack, children, live }) {
  return (
    <div className="flex h-full max-h-dvh min-h-0 w-full flex-1 flex-col overflow-hidden">
      <CallHeader name={name} friend={friend} status={status} onBack={onBack} />
      <div className="relative flex min-h-0 flex-1 flex-col">{children}</div>
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {live}
      </p>
    </div>
  );
}

function Lobby({ call, name, joining, onJoin }) {
  const rootRef = useRef(null);
  const { useCameraState, useMicrophoneState } = useCallStateHooks();
  const camera = useCameraState();
  const mic = useMicrophoneState();
  const [tried, setTried] = useState(false);
  const [failed, setFailed] = useState([]);

  useEffect(() => {
    let alive = true;
    const open = async (device) => {
      if (device.state.optimisticStatus === "enabled" && device.state.status !== "enabled") {
        await device.disable();
      }
      await device.enable();
      const live = device.state.mediaStream?.getTracks?.().some((track) => track.readyState === "live");
      return device.state.status === "enabled" && Boolean(live);
    };
    Promise.allSettled([open(call.camera), open(call.microphone)]).then((results) => {
      if (!alive) return;
      const next = [];
      if (results[0].status === "rejected" || results[0].value === false) next.push("camera");
      if (results[1].status === "rejected" || results[1].value === false) next.push("microphone");
      setFailed(next);
      setTried(true);
    });
    return () => {
      alive = false;
    };
  }, [call]);

  useLayoutEffect(() => {
    labelStreamControls(rootRef.current);
  });

  const note = deviceNote(camera, mic, tried, failed);

  return (
    <div ref={rootRef} className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 overflow-x-hidden overflow-y-auto px-4 py-4">
      <p className="text-center text-body text-fg">You are about to call {name}</p>
      <VideoPreview className="max-w-full" />
      {note ? <p className="max-w-[65ch] text-center text-small text-fg-muted">{note}</p> : null}
      <div className="flex max-w-full flex-wrap items-center justify-center gap-2">
        <ToggleAudioPreviewButton aria-label="Microphone" />
        <ToggleVideoPreviewButton aria-label="Camera" />
      </div>
      <div className="flex w-full max-w-md flex-col gap-3">
        {(camera.devices?.length ?? 0) > 0 ? <DeviceSelectorVideo title="Camera" visualType="dropdown" /> : null}
        {(mic.devices?.length ?? 0) > 0 ? <DeviceSelectorAudioInput title="Microphone" visualType="dropdown" /> : null}
      </div>
      <Button onClick={onJoin} loading={joining}>
        Join call
      </Button>
    </div>
  );
}

function Stage({ name }) {
  const rootRef = useRef(null);
  const { useCallCallingState, useRemoteParticipants } = useCallStateHooks();
  const callingState = useCallCallingState();
  const remote = useRemoteParticipants();
  const alone = callingState === CallingState.JOINED && remote.length === 0;
  const connecting = callingState === CallingState.JOINING || callingState === CallingState.RECONNECTING;

  useLayoutEffect(() => {
    labelStreamControls(rootRef.current);
  });

  return (
    <div ref={rootRef} className="flex min-h-0 flex-1 flex-col">
      <div className="relative min-h-0 flex-1">
        <SpeakerLayout participantsBarPosition="bottom" />
        {alone ? <Waiting name={name} /> : null}
        {connecting ? <Connecting name={name} /> : null}
      </div>
      <CallControls />
    </div>
  );
}

function CallRoom({ call, name, friend, callId }) {
  const navigate = useNavigate();
  const rootRef = useRef(null);
  const seenRemote = useRef(null);
  const joinedOnce = useRef(false);
  const joinLock = useRef(false);
  const [joining, setJoining] = useState(false);
  const [inCall, setInCall] = useState(false);
  const [joinError, setJoinError] = useState(null);
  const [live, setLive] = useState("");
  const { useCallCallingState, useCallEndedAt, useRemoteParticipants } = useCallStateHooks();
  const callingState = useCallCallingState();
  const endedAt = useCallEndedAt();
  const remote = useRemoteParticipants();

  useEffect(() => {
    if (callingState !== CallingState.LEFT) return;
    navigate(`/chat/${callId}`, { replace: true });
  }, [callingState, callId, navigate]);

  useEffect(() => {
    if (callingState !== CallingState.JOINED) return;
    const here = remote.length > 0;
    if (seenRemote.current === null) {
      seenRemote.current = here;
      if (here) setLive(`${name} joined`);
      return;
    }
    if (here === seenRemote.current) return;
    seenRemote.current = here;
    const next = here ? `${name} joined` : `${name} left`;
    setLive((current) => (current === next ? `${next}\u00a0` : next));
  }, [callingState, name, remote.length]);

  const goToChat = useCallback(() => {
    const state = call.state.callingState;
    const active =
      state === CallingState.JOINED ||
      state === CallingState.JOINING ||
      state === CallingState.RECONNECTING ||
      state === CallingState.MIGRATING;
    if (!active) {
      navigate(`/chat/${callId}`, { replace: true });
      return;
    }
    call.leave().catch((error) => {
      console.error(error);
      navigate(`/chat/${callId}`, { replace: true });
    });
  }, [call, callId, navigate]);

  const join = useCallback(async () => {
    if (joinLock.current) return;
    const state = call.state.callingState;
    if (state === CallingState.JOINED || state === CallingState.JOINING) {
      setInCall(true);
      return;
    }
    joinLock.current = true;
    setJoining(true);
    setJoinError(null);
    try {
      await call.join({ create: true });
      setInCall(true);
    } catch (error) {
      console.error(error);
      setJoinError(error);
      setInCall(false);
    } finally {
      joinLock.current = false;
      setJoining(false);
    }
  }, [call]);

  useLayoutEffect(() => {
    labelStreamControls(rootRef.current);
  });

  if (callingState === CallingState.JOINED) joinedOnce.current = true;

  const dropped =
    joinedOnce.current &&
    (callingState === CallingState.RECONNECTING_FAILED ||
      callingState === CallingState.OFFLINE ||
      (Boolean(endedAt) && callingState !== CallingState.LEFT));

  let status = "Ready";
  if (joining || callingState === CallingState.JOINING) status = "Connecting";
  else if (callingState === CallingState.RECONNECTING || callingState === CallingState.MIGRATING) status = "Reconnecting";
  else if (callingState === CallingState.JOINED) status = "Connected";
  else if (dropped) status = "Call ended";
  else if (joinError) status = "Couldn't join";

  let body;
  if (joining) {
    body = <Connecting name={name} />;
    status = "Connecting";
  } else if (joinError) {
    body = (
      <div className="flex flex-1 items-center justify-center px-4">
        <ErrorState title="Couldn't join the call" onRetry={join}>
          The call didn't connect. Try again.
        </ErrorState>
      </div>
    );
  } else if (dropped) {
    body = (
      <div className="flex flex-1 items-center justify-center px-4">
        <ErrorState title="The call ended" onRetry={join}>
          The connection dropped. Try again.
        </ErrorState>
      </div>
    );
  } else if (!inCall) {
    body = (
      <>
        <Lobby call={call} name={name} joining={joining} onJoin={join} />
        {joining ? <Connecting name={name} /> : null}
      </>
    );
    status = joining ? "Connecting" : "Ready";
  } else {
    body = <Stage name={name} />;
  }

  return (
    <StreamTheme ref={rootRef} className="call-stream flex h-full max-h-dvh min-h-0 w-full flex-1 flex-col overflow-hidden">
      <CallFrame name={name} friend={friend} status={status} onBack={goToChat} live={live}>
        {body}
      </CallFrame>
    </StreamTheme>
  );
}

function CallSession({ client, call, name, friend, callId }) {
  return (
    <StreamVideo client={client}>
      <StreamCall call={call}>
        <CallRoom call={call} name={name} friend={friend} callId={callId} />
      </StreamCall>
    </StreamVideo>
  );
}

const CallView = () => {
  const { id: callId } = useParams();
  const navigate = useNavigate();
  const { authUser } = useAuthUser();
  const callRef = useRef(null);
  const [client, setClient] = useState(null);
  const [call, setCall] = useState(null);
  const [setupError, setSetupError] = useState(null);
  const [attempt, setAttempt] = useState(0);

  const tokenQuery = useQuery({
    queryKey: queryKeys.streamToken(),
    queryFn: getStreamToken,
    enabled: Boolean(authUser),
  });
  const friendsQuery = useQuery({
    queryKey: queryKeys.friends(),
    queryFn: getUserFriends,
    enabled: Boolean(authUser),
    ...listQueryOptions,
  });

  const token = typeof tokenQuery.data?.token === "string" ? tokenQuery.data.token : "";
  const myId = authUser?._id ? String(authUser._id) : "";
  const otherId = chatUserIdFromRoute(callId, myId);
  const friends = Array.isArray(friendsQuery.data) ? friendsQuery.data : [];
  const friend = friends.find((item) => String(item._id) === otherId) || null;
  const name = friend?.fullName?.trim() || "them";

  useEffect(() => {
    const previous = document.title;
    document.title = `Call with ${name} · Linguae`;
    return () => {
      document.title = previous;
    };
  }, [name]);

  useEffect(() => {
    const onHide = () => stopCallTracks(callRef.current);
    window.addEventListener("pagehide", onHide);
    return () => window.removeEventListener("pagehide", onHide);
  }, []);

  useEffect(() => {
    if (!token || !authUser?._id || !callId || !API_KEY) return undefined;
    let alive = true;
    const session = beginVideoSession(() =>
      StreamVideoClient.getOrCreateInstance({
        apiKey: API_KEY,
        user: {
          id: String(authUser._id),
          name: authUser.fullName,
          image: authUser.profilePic,
        },
        token,
      }),
    );
    session.ready
      .then((next) => {
        if (!alive) return;
        const nextCall = next.call("default", callId);
        callRef.current = nextCall;
        setSetupError(null);
        setClient(next);
        setCall(nextCall);
      })
      .catch((error) => {
        console.error(error);
        if (alive) setSetupError(error);
      });
    return () => {
      alive = false;
      callRef.current = null;
      setClient(null);
      setCall(null);
      session.end();
    };
  }, [token, authUser?._id, authUser?.fullName, authUser?.profilePic, callId, attempt]);

  const goToChat = useCallback(() => {
    navigate(callId ? `/chat/${callId}` : "/chats", { replace: true });
  }, [callId, navigate]);

  const tokenFailed = tokenQuery.isError && !tokenQuery.isFetching;
  const tokenMissing = tokenQuery.isSuccess && !token;
  const keyMissing = Boolean(token) && !API_KEY;

  if (!callId) {
    return (
      <CallFrame name={name} friend={friend} status="Couldn't start" onBack={goToChat}>
        <div className="flex flex-1 items-center justify-center px-4">
          <ErrorState title="Couldn't start the call" onRetry={goToChat}>
            This call link is missing an id.
          </ErrorState>
        </div>
      </CallFrame>
    );
  }

  if (tokenFailed || tokenMissing || keyMissing || setupError) {
    const title = tokenFailed ? "Couldn't start the call" : "Couldn't start the call";
    const detail = tokenFailed
      ? getErrorMessage(tokenQuery.error)
      : tokenMissing
        ? "The video service didn't return a token. Try again."
        : "The call didn't start. Try again.";
    const retry = () => {
      setSetupError(null);
      if (tokenFailed || tokenMissing) tokenQuery.refetch();
      setAttempt((current) => current + 1);
    };
    return (
      <CallFrame name={name} friend={friend} status="Couldn't start" onBack={goToChat}>
        <div className="flex flex-1 items-center justify-center px-4">
          <ErrorState title={title} onRetry={retry}>
            {detail}
          </ErrorState>
        </div>
      </CallFrame>
    );
  }

  if (!client || !call) {
    return (
      <CallFrame name={name} friend={friend} status="Connecting" onBack={goToChat}>
        <Connecting name={name} />
      </CallFrame>
    );
  }

  return <CallSession client={client} call={call} name={name} friend={friend} callId={callId} />;
};

export default CallView;
