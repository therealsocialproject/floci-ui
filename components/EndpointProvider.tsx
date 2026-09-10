"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type CloudProvider = "aws" | "gcp";

export interface CloudEnvironment {
  id: string;
  name: string;
  url: string;
  provider: CloudProvider;
}

export const DEFAULT_ENVIRONMENTS: CloudEnvironment[] = [
  { id: "local", name: "Local Floci", url: "http://localhost:4566", provider: "aws" },
];

interface EndpointContextType {
  endpoint: string;
  environments: CloudEnvironment[];
  currentEnvironment: CloudEnvironment;
  setEndpoint: (ep: string) => void;
  selectEnvironment: (id: string) => void;
  addEnvironment: (name: string, url: string, provider?: CloudProvider) => void;
  removeEnvironment: (id: string) => void;
  setProvider: (provider: CloudProvider) => void;
  toggleProvider: () => void;
  updateEnvironmentProvider: (id: string, provider: CloudProvider) => void;
  isConnected: boolean;
  isLoading: boolean;
  health: any;
  checkHealth: (ep?: string) => Promise<void>;
}

const EndpointContext = createContext<EndpointContextType | undefined>(undefined);

export function EndpointProvider({ children }: { children: ReactNode }) {
  const [environments, setEnvironments] = useState<CloudEnvironment[]>(DEFAULT_ENVIRONMENTS);
  const [endpoint, setEndpointState] = useState<string>("http://localhost:4566");
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [health, setHealth] = useState<any>(null);

  useEffect(() => {
    // Check if there is a globally saved preferred provider (e.g. user toggled to GCP on localhost)
    const savedLastProvider = (localStorage.getItem("floci_last_provider") as CloudProvider) || null;

    // Load environments from localStorage
    const savedEnvs = localStorage.getItem("floci_environments");
    let initialEnvs: CloudEnvironment[] = [
      {
        id: "local",
        name: "Local Floci",
        url: "http://localhost:4566",
        provider: savedLastProvider || "aws",
      },
    ];

    if (savedEnvs) {
      try {
        const parsed = JSON.parse(savedEnvs);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const normalized: CloudEnvironment[] = parsed.map((env: any) => ({
            id: env.id || `env-${Math.random().toString(36).slice(2)}`,
            name: env.name || env.url,
            url: env.url,
            provider:
              env.provider ||
              (env.name?.toLowerCase().includes("gcp") ||
              env.url?.toLowerCase().includes("gcp") ||
              env.url?.includes("159")
                ? "gcp"
                : savedLastProvider || "aws"),
          }));
          initialEnvs = normalized;
        }
      } catch (e) {
        console.error("Failed to parse saved environments", e);
      }
    }

    setEnvironments(initialEnvs);

    // Load active endpoint
    const savedEp = localStorage.getItem("floci_endpoint");
    const activeEp = savedEp || initialEnvs[0]?.url || "http://localhost:4566";
    setEndpointState(activeEp);
    checkHealth(activeEp);
  }, []);

  const saveEnvironments = (envs: CloudEnvironment[]) => {
    setEnvironments(envs);
    localStorage.setItem("floci_environments", JSON.stringify(envs));
  };

  const setEndpoint = (newEp: string) => {
    let cleanUrl = newEp.trim();
    if (!cleanUrl.startsWith("http://") && !cleanUrl.startsWith("https://")) {
      cleanUrl = `http://${cleanUrl}`;
    }
    setEndpointState(cleanUrl);
    localStorage.setItem("floci_endpoint", cleanUrl);
    checkHealth(cleanUrl);
  };

  const selectEnvironment = (id: string) => {
    const env = environments.find((e) => e.id === id);
    if (env) {
      setEndpoint(env.url);
    }
  };

  const setProvider = (provider: CloudProvider) => {
    localStorage.setItem("floci_last_provider", provider);
    const updated = environments.map((env) => {
      if (env.url === endpoint || env.id === currentEnvironment.id) {
        return { ...env, provider };
      }
      return env;
    });
    saveEnvironments(updated);
  };

  const toggleProvider = () => {
    const nextProvider: CloudProvider = currentEnvironment.provider === "aws" ? "gcp" : "aws";
    setProvider(nextProvider);
  };

  const updateEnvironmentProvider = (id: string, provider: CloudProvider) => {
    const updated = environments.map((env) => {
      if (env.id === id) {
        return { ...env, provider };
      }
      return env;
    });
    saveEnvironments(updated);
    if (currentEnvironment.id === id) {
      localStorage.setItem("floci_last_provider", provider);
    }
  };

  const addEnvironment = (name: string, url: string, provider?: CloudProvider) => {
    let cleanUrl = url.trim();
    if (!cleanUrl.startsWith("http://") && !cleanUrl.startsWith("https://")) {
      cleanUrl = `http://${cleanUrl}`;
    }
    const resolvedProvider: CloudProvider =
      provider ||
      (name.toLowerCase().includes("gcp") ||
      cleanUrl.toLowerCase().includes("gcp") ||
      cleanUrl.includes("159")
        ? "gcp"
        : "aws");

    const newEnv: CloudEnvironment = {
      id: `env-${Date.now()}`,
      name: name.trim() || cleanUrl,
      url: cleanUrl,
      provider: resolvedProvider,
    };
    const updated = [...environments, newEnv];
    saveEnvironments(updated);
    setEndpoint(newEnv.url);
  };

  const removeEnvironment = (id: string) => {
    if (environments.length <= 1) return;
    const updated = environments.filter((e) => e.id !== id);
    saveEnvironments(updated);
    if (currentEnvironment?.id === id) {
      setEndpoint(updated[0].url);
    }
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

  const currentEnvironment: CloudEnvironment =
    environments.find((e) => e.url === endpoint) || {
      id: "custom",
      name: "Custom Host",
      url: endpoint,
      provider:
        endpoint.toLowerCase().includes("gcp") || endpoint.includes("159") ? "gcp" : "aws",
    };

  return (
    <EndpointContext.Provider
      value={{
        endpoint,
        environments,
        currentEnvironment,
        setEndpoint,
        selectEnvironment,
        addEnvironment,
        removeEnvironment,
        setProvider,
        toggleProvider,
        updateEnvironmentProvider,
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
