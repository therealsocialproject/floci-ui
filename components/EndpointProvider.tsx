"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

export interface EndpointPreset {
  name: string;
  url: string;
}

export const ENDPOINT_PRESETS: EndpointPreset[] = [
  { name: "Localhost", url: "http://localhost:4566" },
  { name: "VM 2 - AWS Sandbox", url: "http://10.110.110.151:4566" },
  { name: "VM 1 - GCP Sandbox", url: "http://10.110.110.159:4566" },
];

interface EndpointContextType {
  endpoint: string;
  setEndpoint: (ep: string) => void;
  isConnected: boolean;
  isLoading: boolean;
  health: any;
  checkHealth: (ep?: string) => Promise<void>;
}

const EndpointContext = createContext<EndpointContextType | undefined>(undefined);

export function EndpointProvider({ children }: { children: ReactNode }) {
  const [endpoint, setEndpointState] = useState<string>("http://10.110.110.151:4566");
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [health, setHealth] = useState<any>(null);

  useEffect(() => {
    const saved = localStorage.getItem("floci_endpoint");
    if (saved) {
      setEndpointState(saved);
      checkHealth(saved);
    } else {
      checkHealth(endpoint);
    }
  }, []);

  const setEndpoint = (newEp: string) => {
    setEndpointState(newEp);
    localStorage.setItem("floci_endpoint", newEp);
    checkHealth(newEp);
  };

  const checkHealth = async (epToCheck?: string) => {
    const target = epToCheck || endpoint;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/floci/health?endpoint=${encodeURIComponent(target)}`);
      const json = await res.json();
      if (json.success && json.data) {
        setIsConnected(true);
        setHealth(json.data);
      } else {
        setIsConnected(false);
        setHealth(null);
      }
    } catch {
      setIsConnected(false);
      setHealth(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <EndpointContext.Provider
      value={{
        endpoint,
        setEndpoint,
        isConnected,
        isLoading,
        health,
        checkHealth,
      }}
    >
      {children}
    </EndpointContext.Provider>
  );
}

export function useEndpoint() {
  const context = useContext(EndpointContext);
  if (!context) {
    throw new Error("useEndpoint must be used within an EndpointProvider");
  }
  return context;
}
