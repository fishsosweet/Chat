import { io, type Socket } from "socket.io-client";

let socket: Socket | null = null;

export const connectSocket = (accessToken: string): Socket => {
  if (socket) {
    socket.auth = { token: accessToken };

    if (!socket.connected) {
      socket.connect();
    }

    return socket;
  }

  socket = io(import.meta.env.VITE_SOCKET_URL ?? "http://localhost:8080", {
    path: "/socket.io",
    transports: ["websocket", "polling"],
    auth: {
      token: accessToken
    },
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 500,
    reconnectionDelayMax: 5_000,
    timeout: 10_000
  });

  return socket;
};

export const disconnectSocket = (): void => {
  socket?.disconnect();
  socket = null;
};

export const getSocket = (): Socket | null => socket;
