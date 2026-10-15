export function normalizeEndpointUrl(rawUrl?: string | null): string {
  if (!rawUrl || rawUrl.trim() === "") {
    return "http://10.75.75.50:4566";
  }
  let ep = rawUrl.trim();
  if (!ep.startsWith("http://") && !ep.startsWith("https://")) {
    ep = `http://${ep}`;
  }
  try {
    const parsed = new URL(ep);
    if (!parsed.port) {
      parsed.port = "4566";
    }
    return `${parsed.protocol}//${parsed.hostname}:${parsed.port}`;
  } catch {
    return ep.replace(/\/+$/, "");
  }
}
