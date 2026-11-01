let activeClient = null;
let chain = Promise.resolve();

function enqueue(task) {
  const run = chain.then(task, task);
  chain = run.then(
    () => {},
    () => {},
  );
  return run;
}

export function setActiveVideoClient(client) {
  activeClient = client;
}

export function stopCallTracks(call) {
  if (!call) return;
  for (const device of [call.camera, call.microphone, call.screenShare]) {
    const tracks = device?.state?.mediaStream?.getTracks?.() ?? [];
    for (const track of tracks) track.stop();
  }
}

const ACTIVE = new Set([
  "joined",
  "joining",
  "reconnecting",
  "migrating",
  "ringing",
]);

async function stopClient(client) {
  if (!client) return;
  const calls = Array.isArray(client.state?.calls) ? [...client.state.calls] : [];
  for (const call of calls) {
    stopCallTracks(call);
    const state = call.state?.callingState;
    if (ACTIVE.has(state)) {
      try {
        await Promise.race([
          call.leave(),
          new Promise((resolve) => setTimeout(resolve, 3000)),
        ]);
      } catch (error) {
        console.error("Error leaving call:", error);
      }
    }
    for (const device of [call.camera, call.microphone, call.screenShare]) {
      if (typeof device?.disable !== "function") continue;
      try {
        await device.disable(true);
      } catch (error) {
        console.error("Error stopping media:", error);
      }
    }
  }
  try {
    await client.disconnectUser();
  } catch (error) {
    console.error("Error disconnecting video:", error);
  }
  if (activeClient === client) activeClient = null;
}

// ponytail: one queue for the page. A second call page would wait on this lock.
export function beginVideoSession(create) {
  let client = null;
  const ready = enqueue(async () => {
    client = create();
    setActiveVideoClient(client);
    return client;
  });
  return {
    ready,
    end() {
      return enqueue(async () => {
        await stopClient(client);
      });
    },
  };
}

export async function disconnectVideo() {
  const client = activeClient;
  if (!client) return;
  await enqueue(() => stopClient(client));
}
