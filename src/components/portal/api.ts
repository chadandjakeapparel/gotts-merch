/** Calls a portal API route; throws with the server's message when it refuses. */
export async function api<T = Record<string, unknown>>(method: string, url: string, body?: unknown): Promise<T> {
  const response = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (response.status === 401) {
    window.location.assign("/portal/login");
    throw new Error("Your session has ended. Sign in again.");
  }
  const data = (await response.json().catch(() => ({ ok: false }))) as { ok: boolean; error?: string } & T;
  if (!data.ok) throw new Error(data.error || "That change couldn't be saved. Try again.");
  return data;
}
