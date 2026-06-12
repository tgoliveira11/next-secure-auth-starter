/** Build an application/x-www-form-urlencoded POST request for form login handlers. */
export function formRequest(url: string, fields: Record<string, string>): Request {
  const body = new URLSearchParams(fields);
  return new Request(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
}
