"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { normalizeEndpointUrl } from "@/lib/endpoint-utils";

export type CloudProvider = "aws" | "gcp";

export interface CloudEnvironment {
  id: string;
  name: string;
  url: string;
  provider: CloudProvider;
}

export const DEFAULT_ENVIRONMENTS: CloudEnvironment[] = [
  { id: "tsp-aws", name: "TSP AWS", url: "http://10.75.75.50:4566", provider: "aws" },
  { id: "tsp-gcp", name: "TSP GCP", url: "http://10.75.75.51:4566", provider: "gcp" },
  { id: "dev-aws", name: "DEV AWS", url: "http://10.110.110.151:4566", provider: "aws" },
  { id: "dev-gcp", name: "DEV GCP", url: "http://10.110.110.159:4566", provider: "gcp" },
];

interface EndpointContextType {
  endpoint: string;
  environments: CloudEnvironment[];
  currentEnvironment: CloudEnvironment;
  setEndpoint: (ep: string) => void;
  selectEnvironment: (id: string) => void;
  addEnvironment: (name: string, url: string, provider?: CloudProvider) => void;
  removeEnvironment: (id: string) => void;
  switchProvider: (provider: CloudProvider) => void;
  updateEnvironmentProvider: (id: string, provider: CloudProvider) => void;
  isConnected: boolean;
  isLoading: boolean;
  health: any;
  checkHealth: (ep?: string) => Promise<void>;
  probeEndpoint: (rawUrl: string) => Promise<{ success: boolean; data?: any; error?: string }>;
}

const EndpointContext = createContext<EndpointContextType | undefined>(undefined);

export function EndpointProvider({ children }: { children: ReactNode }) {
  const [environments, setEnvironments] = useState<CloudEnvironment[]>(DEFAULT_ENVIRONMENTS);
  const [endpoint, setEndpointState] = useState<string>("http://10.75.75.50:4566");
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [health, setHealth] = useState<any>(null);

  useEffect(() => {
    const savedEnvs = localStorage.getItem("floci_environments");
    let initialEnvs: CloudEnvironment[] = DEFAULT_ENVIRONMENTS;

    if (savedEnvs) {
      try {
        const parsed = JSON.parse(savedEnvs);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Filter out legacy "local" / localhost:4566
          const filtered = parsed.filter(
            (env: any) =>
              env.id !== "local" &&
              !env.url?.includes("localhost:4566") &&
              env.name !== "Local Floci"
          );

          if (filtered.length > 0) {
            initialEnvs = filtered.map((env: any) => ({
              id: env.id || `env-${Math.random().toString(36).slice(2)}`,
              name: env.name || env.url,
              url: normalizeEndpointUrl(env.url),
              provider:
                env.provider ||
                (env.name?.toLowerCase().includes("gcp") ||
                env.url?.toLowerCase().includes("gcp") ||
                env.url?.includes("159") ||
                env.url?.includes(".51")
                  ? "gcp"
                  : "aws"),
            }));
          }
        }
      } catch (e) {
        console.error("Failed to parse saved environments", e);
      }
    }

    setEnvironments(initialEnvs);
    localStorage.setItem("floci_environments", JSON.stringify(initialEnvs));

    // Load active endpoint
    const savedEp = localStorage.getItem("floci_endpoint");
    let activeEp = savedEp ? normalizeEndpointUrl(savedEp) : initialEnvs[0].url;
    if (activeEp.includes("localhost:4566")) {
      activeEp = initialEnvs[0].url;
    }

    setEndpointState(activeEp);
    localStorage.setItem("floci_endpoint", activeEp);
    checkHealth(activeEp);
  }, []);

  const saveEnvironments = (envs: CloudEnvironment[]) => {
    setEnvironments(envs);
    localStorage.setItem("floci_environments", JSON.stringify(envs));
  };

  const setEndpoint = (newEp: string) => {
    const cleanUrl = normalizeEndpointUrl(newEp);
    setEndpointState(cleanUrl);
    localStorage.setItem("floci_endpoint", cleanUrl);
    checkHealth(cleanUrl);
  };

  const selectEnvironment = (id: string) => {
    const env = environments.find((e) => e.id === id);
    if (env) {
      const cleanUrl = normalizeEndpointUrl(env.url);
      setEndpointState(cleanUrl);
      localStorage.setItem("floci_endpoint", cleanUrl);
      localStorage.setItem(`floci_last_${env.provider}_env`, env.id);
      localStorage.setItem("floci_last_provider", env.provider);
      checkHealth(cleanUrl);
    }
  };

  const switchProvider = (targetProvider: CloudProvider) => {
    if (currentEnvironment.provider === targetProvider) return;

    // Look for matching environment for target provider
    const matchingEnvs = environments.filter((e) => e.provider === targetProvider);
    if (matchingEnvs.length > 0) {
      const rememberedId = localStorage.getItem(`floci_last_${targetProvider}_env`);
      const targetEnv = matchingEnvs.find((e) => e.id === rememberedId) || matchingEnvs[0];
      selectEnvironment(targetEnv.id);
    } else {
      console.warn(`No configured environment found for provider: ${targetProvider}`);
    }
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
    const cleanUrl = normalizeEndpointUrl(url);
    const resolvedProvider: CloudProvider =
      provider ||
      (name.toLowerCase().includes("gcp") ||
      cleanUrl.toLowerCase().includes("gcp") ||
      cleanUrl.includes("159") ||
      cleanUrl.includes(".51")
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
    selectEnvironment(newEnv.id);
  };

  const removeEnvironment = (id: string) => {
    if (environments.length <= 1) return;
    const updated = environments.filter((e) => e.id !== id);
    saveEnvironments(updated);
    if (currentEnvironment?.id === id) {
      selectEnvironment(updated[0].id);
    }
  };

  const probeEndpoint = async (rawUrl: string) => {
    const normalized = normalizeEndpointUrl(rawUrl);
    try {
      const res = await fetch(`/api/floci/health?endpoint=${encodeURIComponent(normalized)}`);
      const json = await res.json();
      return json;
    } catch (err: any) {
      return { success: false, error: err.message || "Failed to reach endpoint" };
    }
  };

  const checkHealth = async (epToCheck?: string) => {
    const target = normalizeEndpointUrl(epToCheck || endpoint);
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
    environments.find((e) => e.url === endpoint) ||
    environments[0] || {
      id: "custom",
      name: "Custom Host",
      url: endpoint,
      provider:
        endpoint.toLowerCase().includes("gcp") ||
        endpoint.includes("159") ||
        endpoint.includes(".51")
          ? "gcp"
          : "aws",
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
        switchProvider,
        updateEnvironmentProvider,
        isConnected,
        isLoading,
        health,
        checkHealth,
        probeEndpoint,
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
