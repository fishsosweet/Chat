import { io as createClient } from "socket.io-client";

const baseUrl = "http://localhost:8080";

const fail = (message) => {
  throw new Error(message);
};

const request = async (path, method, body, token) => {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const payload = await response.json();
  return { response, payload };
};

const waitFor = (fn, ms, label) =>
  new Promise((resolve, reject) => {
    const started = Date.now();
    const timer = setInterval(() => {
      if (fn()) {
        clearInterval(timer);
        resolve(true);
      } else if (Date.now() - started > ms) {
        clearInterval(timer);
        reject(new Error(`${label} timeout after ${ms}ms`));
      }
    }, 50);
  });

const buildUser = async (prefix) => {
  const email = `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}@example.com`;
  const password = "Aa!12345";

  const register = await request("/api/v1/auth/register", "POST", {
    email,
    fullName: `${prefix} user`,
    password
  });

  if (register.response.status !== 201) {
    fail(`${prefix} register failed: ${register.response.status}`);
  }

  const login = await request("/api/v1/auth/login", "POST", {
    email,
    password,
    platform: "WEB",
    deviceName: `${prefix} smoke`
  });

  if (login.response.status !== 200) {
    fail(`${prefix} login failed: ${login.response.status}`);
  }

  return {
    userId: login.payload?.data?.user?.id,
    token: login.payload?.data?.accessToken
  };
};

const main = async () => {
  const caller = await buildUser("caller");
  const callee = await buildUser("callee");

  if (!caller.userId || !caller.token || !callee.userId || !callee.token) {
    fail("Missing user id or token");
  }

  const direct = await request(
    "/api/v1/conversations/direct",
    "POST",
    { targetUserId: callee.userId },
    caller.token
  );

  if (direct.response.status !== 201) {
    fail(`Direct conversation create failed: ${direct.response.status}`);
  }

  const conversationId = direct.payload?.data?.id;
  if (!conversationId) {
    fail("Missing conversation id");
  }

  const callerSocket = createClient(baseUrl, {
    transports: ["websocket"],
    auth: { token: caller.token },
    timeout: 10000
  });
  const calleeSocket = createClient(baseUrl, {
    transports: ["websocket"],
    auth: { token: callee.token },
    timeout: 10000
  });

  const received = {
    call: false,
    offer: false,
    answer: false,
    ice: false,
    end: false
  };

  calleeSocket.on("call", (payload) => {
    if (payload.conversationId !== conversationId) {
      return;
    }
    received.call = true;
    calleeSocket.emit("answer", {
      conversationId,
      targetUserId: caller.userId,
      callType: "VIDEO",
      callId: payload.callId,
      data: {
        sdp: {
          type: "answer",
          sdp: "dummy-answer"
        }
      }
    });

    calleeSocket.emit("ice_candidate", {
      conversationId,
      targetUserId: caller.userId,
      callId: payload.callId,
      data: {
        candidate: {
          candidate: "candidate:dummy",
          sdpMid: "0",
          sdpMLineIndex: 0
        }
      }
    });
  });

  calleeSocket.on("offer", (payload) => {
    if (payload.conversationId === conversationId) {
      received.offer = true;
    }
  });

  calleeSocket.on("end", (payload) => {
    if (payload.conversationId === conversationId) {
      received.end = true;
    }
  });

  callerSocket.on("answer", (payload) => {
    if (payload.conversationId === conversationId) {
      received.answer = true;
    }
  });

  callerSocket.on("ice_candidate", (payload) => {
    if (payload.conversationId === conversationId) {
      received.ice = true;
    }
  });

  await Promise.all([
    new Promise((resolve, reject) => {
      callerSocket.once("connect", resolve);
      callerSocket.once("connect_error", reject);
    }),
    new Promise((resolve, reject) => {
      calleeSocket.once("connect", resolve);
      calleeSocket.once("connect_error", reject);
    })
  ]);

  const callId = crypto.randomUUID();

  callerSocket.emit("call", {
    conversationId,
    targetUserId: callee.userId,
    callType: "VIDEO",
    callId
  });

  callerSocket.emit("offer", {
    conversationId,
    targetUserId: callee.userId,
    callType: "VIDEO",
    callId,
    data: {
      sdp: {
        type: "offer",
        sdp: "dummy-offer"
      }
    }
  });

  await waitFor(() => received.call && received.offer && received.answer && received.ice, 8000, "signaling relay");

  callerSocket.emit("end", {
    conversationId,
    targetUserId: callee.userId,
    callId,
    data: { reason: "completed" }
  });

  await waitFor(() => received.end, 4000, "end relay");

  console.log(
    `CALL_SMOKE_OK conversation=${conversationId} call=${received.call} offer=${received.offer} answer=${received.answer} ice=${received.ice} end=${received.end}`
  );

  callerSocket.disconnect();
  calleeSocket.disconnect();
};

main().catch((error) => {
  console.error("CALL_SMOKE_FAILED", error);
  process.exit(1);
});
