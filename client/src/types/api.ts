export interface ApiSuccess<T> {
  success: true;
  message?: string;
  data: T;
  requestId?: string;
}

export interface ApiFailure {
  success: false;
  message: string;
  details?: unknown;
  requestId?: string;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;
