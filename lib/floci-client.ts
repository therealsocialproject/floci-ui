import { EC2Client } from "@aws-sdk/client-ec2";
import { S3Client } from "@aws-sdk/client-s3";
import { IAMClient } from "@aws-sdk/client-iam";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { KMSClient } from "@aws-sdk/client-kms";

export const DEFAULT_FLOCI_ENDPOINT = process.env.FLOCI_ENDPOINT || "http://localhost:4566";

export function resolveEndpoint(reqEndpoint?: string | null): string {
  if (reqEndpoint && reqEndpoint.trim() !== "") {
    let ep = reqEndpoint.trim();
    if (!ep.startsWith("http://") && !ep.startsWith("https://")) {
      ep = `http://${ep}`;
    }
    return ep;
  }
  return DEFAULT_FLOCI_ENDPOINT;
}

const mockCredentials = {
  accessKeyId: "mock",
  secretAccessKey: "mock",
};

export function getEC2Client(endpoint?: string): EC2Client {
  return new EC2Client({
    endpoint: resolveEndpoint(endpoint),
    region: "us-east-1",
    credentials: mockCredentials,
  });
}

export function getS3Client(endpoint?: string): S3Client {
  return new S3Client({
    endpoint: resolveEndpoint(endpoint),
    region: "us-east-1",
    credentials: mockCredentials,
    forcePathStyle: true,
  });
}

export function getIAMClient(endpoint?: string): IAMClient {
  return new IAMClient({
    endpoint: resolveEndpoint(endpoint),
    region: "us-east-1",
    credentials: mockCredentials,
  });
}

export function getDynamoDBClient(endpoint?: string): DynamoDBClient {
  return new DynamoDBClient({
    endpoint: resolveEndpoint(endpoint),
    region: "us-east-1",
    credentials: mockCredentials,
  });
}

export function getKMSClient(endpoint?: string): KMSClient {
  return new KMSClient({
    endpoint: resolveEndpoint(endpoint),
    region: "us-east-1",
    credentials: mockCredentials,
  });
}

export interface FlociHealthResponse {
  services: Record<string, string>;
  edition?: string;
  original_edition?: string;
  version?: string;
}

export async function fetchFlociHealth(endpoint?: string): Promise<FlociHealthResponse> {
  const ep = resolveEndpoint(endpoint);
  const res = await fetch(`${ep}/_localstack/health`, {
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Floci health check failed with status ${res.status}`);
  }
  return res.json();
}
