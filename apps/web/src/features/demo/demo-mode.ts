const loopbackHosts = new Set(["localhost", "127.0.0.1", "::1"]);

export function isDemoMode(): boolean {
  const configuredMode = import.meta.env.VITE_DEMO_MODE;
  if (configuredMode === "true") return true;
  if (configuredMode === "false" || import.meta.env.MODE === "test") return false;
  if (typeof window === "undefined") return false;

  const hostname = window.location.hostname.toLowerCase();
  return loopbackHosts.has(hostname) || hostname.endsWith(".vercel.app");
}
