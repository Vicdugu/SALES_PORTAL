export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  timestamp: string;
}

export function successResponse<T>(data: T, message?: string): ApiResponse<T> {
  return {
    success: true,
    data,
    timestamp: new Date().toISOString(),
  };
}

export function errorResponse(
  code: string,
  message: string
): ApiResponse {
  return {
    success: false,
    error: { code, message },
    timestamp: new Date().toISOString(),
  };
}