declare global {
  namespace Express {
    interface Request {
      requestId: string;
    }
  }
}

declare module "socket.io" {
  interface Socket {
    data: {
      auth: {
        userId: string;
        sessionId: string;
        deviceId?: string;
      };
    };
  }
}

export {};
