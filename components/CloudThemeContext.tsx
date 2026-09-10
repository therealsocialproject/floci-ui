"use client";

import React, { createContext, useContext, useEffect, ReactNode } from "react";
import { useEndpoint } from "./EndpointProvider";

export type CloudMode = "aws" | "gcp";

interface CloudThemeContextType {
  cloudMode: CloudMode;
  setCloudMode: (mode: CloudMode) => void;
  toggleCloudMode: () => void;
  serviceLabels: {
    dashboard: string;
    ec2: string;
    s3: string;
    iam: string;
    dynamodb: string;
    kms: string;
    instances: string;
    buckets: string;
    roles: string;
    tables: string;
  };
  branding: {
    title: string;
    subTitle: string;
    scopeLabel: string;
    scopeValue: string;
    accentColor: string;
  };
}

const CloudThemeContext = createContext<CloudThemeContextType | undefined>(
  undefined,
);

export function CloudThemeProvider({ children }: { children: ReactNode }) {
  const { currentEnvironment, setProvider, toggleProvider } = useEndpoint();

  // The active environment's provider strictly dictates the cloud console mode
  const cloudMode: CloudMode =
    currentEnvironment?.provider === "gcp" ? "gcp" : "aws";

  useEffect(() => {
    document.documentElement.dataset.cloud = cloudMode;
  }, [cloudMode]);

  const isAws = cloudMode === "aws";

  const serviceLabels = isAws
    ? {
        dashboard: "Dashboard",
        ec2: "EC2",
        s3: "S3",
        iam: "IAM",
        dynamodb: "DynamoDB",
        kms: "KMS",
        instances: "EC2 Instances",
        buckets: "S3 Buckets",
        roles: "IAM Roles & Policies",
        tables: "DynamoDB Tables",
      }
    : {
        dashboard: "Console Overview",
        ec2: "Compute Engine",
        s3: "Cloud Storage",
        iam: "IAM & Admin",
        dynamodb: "Datastore / NoSQL",
        kms: "Cloud KMS",
        instances: "VM Instances",
        buckets: "Storage Buckets",
        roles: "Service Accounts & Roles",
        tables: "Datastore Entities",
      };

  const branding = isAws
    ? {
        title: "AWS Management Console",
        subTitle: "Floci Cloud Emulator",
        scopeLabel: "Region",
        scopeValue: "us-east-1",
        accentColor: "amber",
      }
    : {
        title: "Google Cloud Console",
        subTitle: "Floci Cloud Emulator",
        scopeLabel: "Project",
        scopeValue: "mock-project",
        accentColor: "blue",
      };

  return (
    <CloudThemeContext.Provider
      value={{
        cloudMode,
        setCloudMode: setProvider,
        toggleCloudMode: toggleProvider,
        serviceLabels,
        branding,
      }}
    >
      {children}
    </CloudThemeContext.Provider>
  );
}

export function useCloudTheme() {
  const context = useContext(CloudThemeContext);
  if (!context) {
    throw new Error("useCloudTheme must be used within a CloudThemeProvider");
  }
  return context;
}
