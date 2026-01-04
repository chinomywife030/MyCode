/**
 * 共享的 Token 儲存（記憶體暫存）
 * 用於 register 和 send-test 兩個 route 之間共享 token
 */

let storedToken: string | null = null;

export function setToken(token: string | null): void {
  storedToken = token;
}

export function getToken(): string | null {
  return storedToken;
}

