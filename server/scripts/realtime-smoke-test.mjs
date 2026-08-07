import { io as createClient } from "socket.io-client";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

const baseUrl = "http://localhost:8080";

const fail = (message) => {
  throw new Error(message);
};

const waitWithTimeout = (promise, ms, step) => {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`${step} timed out after ${ms}ms`)), ms);
    })
  ]);
};

const request = async (path, method, body) => {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      "content-type": "application/json"
    },
    body: body ? JSON.stringify(body) : undefined
  });

  const payload = await response.json();
  return { response, payload };
};

const main = async () => {
  const email = `step5_${Date.now()}@example.com`;
  const password = "Aa!12345";

  const registerResult = await request("/api/v1/auth/register", "POST", {
    email,
    fullName: "Step5 Realtime",
    password
  });

  if (registerResult.response.status !== 201) {
    fail(`Register failed: ${registerResult.response.status}`);
  }
  console.log("STEP register ok");

  const loginResult = await request("/api/v1/auth/login", "POST", {
    email,
    password,
    platform: "WEB",
    deviceName: "Realtime Smoke"
  });

  if (loginResult.response.status !== 200) {
    fail(`Login failed: ${loginResult.response.status}`);
  }
  console.log("STEP login ok");

  const accessToken = loginResult.payload?.data?.accessToken;
  const userId = loginResult.payload?.data?.user?.id;

  if (!accessToken || !userId) {
    fail("Missing accessToken or userId from login response");
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL })
  });

  const conversation = await prisma.conversation.create({
    data: {
      type: "DIRECT",
      createdById: userId
    }
  });

  await prisma.member.create({
    data: {
      conversationId: conversation.id,
      userId,
      role: "MEMBER",
      status: "ACTIVE"
    }
  });

  const socket = createClient(baseUrl, {
    path: "/socket.io",
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

  const heartbeatAck = await waitWithTimeout(
    new Promise((resolve) => {
      socket.emit("heartbeat", (payload) => resolve(payload));
    }),
    5000,
    "heartbeat ack"
  );
  console.log("STEP heartbeat ok");

  const sendMessageAck = await waitWithTimeout(
    new Promise((resolve) => {
      socket.emit(
        "send_message",
        {
          conversationId: conversation.id,
          content: "hello from realtime smoke test",
          type: "TEXT",
          clientMessageId: `client_${Date.now()}`
        },
        (payload) => resolve(payload)
      );
    }),
    10000,
    "send_message ack"
  );
  console.log("STEP send_message ok");

  const syncAck = await waitWithTimeout(
    new Promise((resolve) => {
      socket.emit(
        "sync_messages",
        {
          conversationId: conversation.id,
          limit: 20
        },
        (payload) => resolve(payload)
      );
    }),
    10000,
    "sync_messages ack"
  );
  console.log("STEP sync_messages ok");

  if (!heartbeatAck?.serverTime) {
    fail("Heartbeat ack missing serverTime");
  }

  if (!sendMessageAck?.success) {
    fail(`send_message failed: ${JSON.stringify(sendMessageAck)}`);
  }

  if (!syncAck?.success || !Array.isArray(syncAck.messages) || syncAck.messages.length < 1) {
    fail(`sync_messages failed: ${JSON.stringify(syncAck)}`);
  }

  console.log(
    `REALTIME_SMOKE_OK user=${userId} conversation=${conversation.id} messageCount=${syncAck.messages.length}`
  );

  socket.disconnect();
  await prisma.$disconnect();
};

main().catch((error) => {
  console.error("REALTIME_SMOKE_FAILED", error);
  process.exit(1);
});
