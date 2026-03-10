import { io } from "socket.io-client";

function resolveServerUrl() {
  const configuredUrl = import.meta.env.VITE_SERVER_URL?.trim();
  if (configuredUrl) {
    return configuredUrl;
  }

  if (typeof window === "undefined") {
    return "http://localhost:4000";
  }

  const { hostname, origin } = window.location;
  const isLocalHost =
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "[::1]";

  return isLocalHost ? "http://localhost:4000" : origin;
}

const serverUrl = resolveServerUrl();

export const socket = io(serverUrl, {
  autoConnect: false,
  transports: ["polling", "websocket"]
});
