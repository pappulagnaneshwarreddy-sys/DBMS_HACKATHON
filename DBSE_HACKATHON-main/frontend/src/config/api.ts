/**
 * RELIEFLINK 360 - Dynamic Local Network API & WebSocket Configuration
 * 
 * CRITICAL RULE:
 * Never hardcode 'localhost' for requests made by the browser.
 * When other laptops open http://<MACBOOK_IP>:5173, 'localhost' would point to THEIR OWN machine.
 * 
 * This resolver automatically derives the backend IP from window.location.hostname,
 * ensuring all 4 laptops seamlessly communicate with the host MacBook's services.
 */

export function getGatewayBaseUrl(): string {
  // 1. Check if user configured an explicit non-localhost URL via env var
  const envUrl = import.meta.env.VITE_API_GATEWAY_URL;
  if (envUrl && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1')) {
    return envUrl;
  }

  // 2. Dynamically resolve from current browser window hostname (e.g., 192.168.68.100)
  if (typeof window !== 'undefined' && window.location.hostname) {
    const protocol = window.location.protocol; // 'http:' or 'https:'
    const hostname = window.location.hostname;
    return `${protocol}//${hostname}:8000`;
  }

  // 3. Fallback for SSR/build time
  return 'http://127.0.0.1:8000';
}

export function getSimulatorWsUrl(): string {
  // 1. Check if user configured an explicit non-localhost WebSocket URL via env var
  const envWs = import.meta.env.VITE_SIMULATOR_WS_URL;
  if (envWs && !envWs.includes('localhost') && !envWs.includes('127.0.0.1')) {
    return envWs;
  }

  // 2. Dynamically resolve from current browser window hostname
  if (typeof window !== 'undefined' && window.location.hostname) {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const hostname = window.location.hostname;
    return `${wsProtocol}//${hostname}:5001`;
  }

  // 3. Fallback for SSR/build time
  return 'ws://127.0.0.1:5001';
}
