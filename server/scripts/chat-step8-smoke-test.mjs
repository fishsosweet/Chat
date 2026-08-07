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

const waitWithTimeout = (promise, ms, step) => {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`${step} timed out after ${ms}ms`)), ms);
    })
  ]);
};

const main = async () => {
  const primaryEmail = "step4ok_1785999282@example.com";
  const primaryPassword = "Aa!12345";
  const secondaryEmail = `step8_${Date.now()}@example.com`;
  const secondaryPassword = "Aa!12345";

  const registerSecondary = await request("/api/v1/auth/register", "POST", {
    email: secondaryEmail,
    fullName: "Step8 Secondary",
    password: secondaryPassword
  });

  if (registerSecondary.response.status !== 201) {
    fail(`Secondary register failed: ${registerSecondary.response.status}`);
  }

  const targetUserId = registerSecondary.payload?.data?.user?.id;
  if (!targetUserId) {
    fail("Secondary user id missing");
  }
  console.log("STEP register secondary ok");

  const loginPrimary = await request("/api/v1/auth/login", "POST", {
    email: primaryEmail,
    password: primaryPassword,
    platform: "WEB",
    deviceName: "Step8 Smoke"
  });

  if (loginPrimary.response.status !== 200) {
    fail(`Primary login failed: ${loginPrimary.response.status}`);
  }

  const accessToken = loginPrimary.payload?.data?.accessToken;
  if (!accessToken) {
    fail("Primary accessToken missing");
  }
  console.log("STEP login primary ok");

  const directConversation = await request(
    "/api/v1/conversations/direct",
    "POST",
    { targetUserId },
    accessToken
  );

  if (directConversation.response.status !== 201) {
    fail(`Create direct conversation failed: ${directConversation.response.status}`);
  }

  const conversationId = directConversation.payload?.data?.id;
  if (!conversationId) {
    fail("Conversation id missing");
  }
  console.log("STEP create direct conversation ok");

  const listBefore = await request("/api/v1/conversations?limit=10", "GET", undefined, accessToken);
  if (listBefore.response.status !== 200 || !Array.isArray(listBefore.payload?.data?.items)) {
    fail(`List conversations failed: ${listBefore.response.status}`);
  }
  console.log("STEP list conversations ok");

  const socket = createClient(baseUrl, {
    transports: ["websocket"],
    auth: {
      token: accessToken
    },
    reconnectionAttempts: 2,
    timeout: 10000
  });

  await waitWithTimeout(
    new Promise((resolve, reject) => {
      socket.once("connect", resolve);
      socket.once("connect_error", reject);
    }),
    10000,
    "socket connect"
  );
  console.log("STEP socket connect ok");

  const sendAck = await waitWithTimeout(
    new Promise((resolve) => {
      socket.emit(
        "send_message",
        {
          conversationId,
          content: "step8 api smoke",
          type: "TEXT",
          clientMessageId: `step8_client_${Date.now()}`
        },
        (payload) => resolve(payload)
      );
    }),
    10000,
    "send_message ack"
  );

  if (!sendAck?.success || !sendAck?.messageId) {
    fail(`send_message failed: ${JSON.stringify(sendAck)}`);
  }
  console.log("STEP send message via socket ok");

  const messages = await request(
    `/api/v1/conversations/${conversationId}/messages?limit=10`,
    "GET",
    undefined,
    accessToken
  );

  if (messages.response.status !== 200) {
    fail(`Get messages failed: ${messages.response.status}`);
  }

  const count = messages.payload?.data?.items?.length ?? 0;
  if (count < 1) {
    fail("Messages endpoint returned empty after send_message");
  }

  console.log(`CHAT_STEP8_SMOKE_OK conversation=${conversationId} messages=${count}`);

  socket.disconnect();
};

main().catch((error) => {
  console.error("CHAT_STEP8_SMOKE_FAILED", error);
  process.exit(1);
});
