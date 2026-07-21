export class ApiException extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export function badRequest(message: string) {
  return new ApiException(message, 400);
}

export function notFoundError(message = "Not found") {
  return new ApiException(message, 404);
}

/** 建立因資源狀態衝突而無法完成的操作錯誤。 */
export function conflict(message: string) {
  return new ApiException(message, 409);
}

export function internalError(message = "Internal error") {
  return new ApiException(message, 500);
}
