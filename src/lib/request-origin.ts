export function getRequestOrigin(
  request: Request,
  fallbackOrigin = "http://localhost:3000"
): string {
  try {
    return new URL(request.url).origin;
  } catch {
    return fallbackOrigin;
  }
}
