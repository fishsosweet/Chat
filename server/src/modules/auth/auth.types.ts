export interface AccessTokenPayload {
  sub: string;
  sid: string;
  did?: string;
  typ: "access";
}

export interface RefreshTokenPayload {
  sub: string;
  sid: string;
  did?: string;
  typ: "refresh";
}

export interface AuthenticatedUser {
  id: string;
  sessionId: string;
  deviceId?: string;
}
