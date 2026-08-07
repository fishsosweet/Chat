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

const main = async () => {
  const email = `call_history_${Date.now()}@example.com`;
  const password = "Aa!12345";

  const register = await request("/api/v1/auth/register", "POST", {
    email,
    fullName: "Call History User",
    password
  });

  if (register.response.status !== 201) {
    fail(`Register failed: ${register.response.status}`);
  }

  const login = await request("/api/v1/auth/login", "POST", {
    email,
    password,
    platform: "WEB",
    deviceName: "Call History Smoke"
  });

  if (login.response.status !== 200) {
    fail(`Login failed: ${login.response.status}`);
  }

  const token = login.payload?.data?.accessToken;
  const targetUserId = "step4ok_1785999282@example.com";

  if (!token) {
    fail("Missing access token");
  }

  const rtcConfig = await request("/api/v1/rtc/config", "GET", undefined, token);
  if (rtcConfig.response.status !== 200 || !Array.isArray(rtcConfig.payload?.data?.iceServers)) {
    fail(`RTC config failed: ${rtcConfig.response.status}`);
  }

  const history = await request("/api/v1/calls/history?page=1&limit=10", "GET", undefined, token);
  if (history.response.status !== 200 || !Array.isArray(history.payload?.data?.items)) {
    fail(`Call history failed: ${history.response.status}`);
  }

  console.log(
    `CALL_HISTORY_SMOKE_OK items=${history.payload.data.items.length} iceServers=${rtcConfig.payload.data.iceServers.length} targetHint=${targetUserId}`
  );
};

main().catch((error) => {
  console.error("CALL_HISTORY_SMOKE_FAILED", error);
  process.exit(1);
});
