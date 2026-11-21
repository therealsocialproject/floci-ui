"use client";

import React, { createContext, useContext, useEffect, ReactNode } from "react";
import { useEndpoint } from "./EndpointProvider";

export type CloudMode = "aws" | "gcp" | "azure" | "oci";

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
    sqs: string;
    lambda: string;
    logs: string;
    secrets: string;
    kms: string;
    rds: string;
    apigateway: string;
    sns: string;
    ssm: string;
    cloudformation: string;
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
    badgeText: string;
  };
}

const CloudThemeContext = createContext<CloudThemeContextType | undefined>(
  undefined,
);

const CLOUD_ORDER: CloudMode[] = ["aws", "gcp", "azure", "oci"];

export function CloudThemeProvider({ children }: { children: ReactNode }) {
  const { currentEnvironment, switchProvider } = useEndpoint();

  // The active environment's provider dictates the cloud console mode
  const cloudMode: CloudMode =
    currentEnvironment?.provider === "gcp"
      ? "gcp"
      : currentEnvironment?.provider === "azure"
        ? "azure"
        : currentEnvironment?.provider === "oci"
          ? "oci"
          : "aws";

  useEffect(() => {
    document.documentElement.dataset.cloud = cloudMode;
  }, [cloudMode]);

  const toggleCloudMode = () => {
    const currentIndex = CLOUD_ORDER.indexOf(cloudMode);
    const nextMode = CLOUD_ORDER[(currentIndex + 1) % CLOUD_ORDER.length];
    switchProvider(nextMode);
  };

  const serviceLabels = (() => {
    switch (cloudMode) {
      case "azure":
        return {
          dashboard: "Portal Home",
          ec2: "Virtual Machines",
          s3: "Storage Accounts & Blobs",
          iam: "Microsoft Entra ID (IAM)",
          dynamodb: "Azure Cosmos DB",
          sqs: "Storage Queues",
          lambda: "Function Apps",
          logs: "Azure Monitor & Logs",
          secrets: "Key Vault Secrets",
          kms: "Key Vault Keys",
          rds: "Azure SQL Database",
          apigateway: "API Management",
          sns: "Event Grid Topics",
          ssm: "App Configuration",
          cloudformation: "ARM Templates & Bicep",
          instances: "Virtual Machines",
          buckets: "Storage Containers",
          roles: "App Registrations & Roles",
          tables: "Cosmos DB Containers",
        };
      case "oci":
        return {
          dashboard: "Console Dashboard",
          ec2: "Compute Instances",
          s3: "Object Storage & Buckets",
          iam: "Identity & Access (IAM)",
          dynamodb: "Oracle NoSQL Database",
          sqs: "OCI Queue",
          lambda: "OCI Functions",
          logs: "OCI Logging",
          secrets: "Vault Secrets",
          kms: "Vault Encryption Keys",
          rds: "Autonomous Database",
          apigateway: "API Gateway",
          sns: "Notifications & Topics",
          ssm: "Resource Manager Config",
          cloudformation: "Resource Manager Stacks",
          instances: "Compute Instances",
          buckets: "Storage Buckets",
          roles: "Policies & Dynamic Groups",
          tables: "NoSQL Tables",
        };
      case "gcp":
        return {
          dashboard: "Console Overview",
          ec2: "Compute Engine",
          s3: "Cloud Storage",
          iam: "IAM & Admin",
          dynamodb: "Datastore / NoSQL",
          sqs: "Cloud Pub/Sub",
          lambda: "Cloud Functions",
          logs: "Cloud Logging",
          secrets: "Secret Manager",
          kms: "Cloud KMS",
          rds: "Cloud SQL",
          apigateway: "API Gateway / Endpoints",
          sns: "Pub/Sub Topics",
          ssm: "Runtime Config & Parameters",
          cloudformation: "Cloud Deployment Manager",
          instances: "VM Instances",
          buckets: "Storage Buckets",
          roles: "Service Accounts & Roles",
          tables: "Datastore Entities",
        };
      case "aws":
      default:
        return {
          dashboard: "Dashboard",
          ec2: "EC2",
          s3: "S3",
          iam: "IAM",
          dynamodb: "DynamoDB",
          sqs: "Simple Queue Service (SQS)",
          lambda: "Lambda",
          logs: "CloudWatch Logs",
          secrets: "Secrets Manager",
          kms: "Key Management Service (KMS)",
          rds: "Relational Database Service (RDS)",
          apigateway: "API Gateway",
          sns: "Simple Notification Service (SNS)",
          ssm: "Systems Manager Parameter Store",
          cloudformation: "CloudFormation Stacks",
          instances: "EC2 Instances",
          buckets: "S3 Buckets",
          roles: "IAM Roles & Policies",
          tables: "DynamoDB Tables",
        };
    }
  })();

  const branding = (() => {
    switch (cloudMode) {
      case "azure":
        return {
          title: "Microsoft Azure Portal",
          subTitle: "Floci Azure Emulator (floci-az)",
          scopeLabel: "Subscription",
          scopeValue: "Visual Studio Enterprise",
          accentColor: "sky",
          badgeText: "Azure Portal",
        };
      case "oci":
        return {
          title: "Oracle Cloud Console",
          subTitle: "Floci OCI Emulator (floci-oci)",
          scopeLabel: "Compartment",
          scopeValue: "root (mock-tenancy)",
          accentColor: "rose",
          badgeText: "Oracle Cloud",
        };
      case "gcp":
        return {
          title: "Google Cloud Console",
          subTitle: "Floci Cloud Emulator",
          scopeLabel: "Project",
          scopeValue: "mock-project",
          accentColor: "blue",
          badgeText: "Google Cloud",
        };
      case "aws":
      default:
        return {
          title: "AWS Management Console",
          subTitle: "Floci Cloud Emulator",
          scopeLabel: "Region",
          scopeValue: "us-east-1",
          accentColor: "amber",
          badgeText: "AWS Console",
        };
    }
  })();

  return (
    <CloudThemeContext.Provider
      value={{
        cloudMode,
        setCloudMode: switchProvider,
        toggleCloudMode,
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
