export type ActionResponse<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; code?: string }

export function successResponse<T>(data: T): ActionResponse<T> {
  return { success: true, data }
}

export function errorResponse(error: string, code?: string): ActionResponse<never> {
  return { success: false, error, code }
}
