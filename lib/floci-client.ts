import { EC2Client } from "@aws-sdk/client-ec2";
import { S3Client } from "@aws-sdk/client-s3";
import { IAMClient } from "@aws-sdk/client-iam";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { KMSClient } from "@aws-sdk/client-kms";
import { SQSClient } from "@aws-sdk/client-sqs";
import { LambdaClient } from "@aws-sdk/client-lambda";
import { CloudWatchLogsClient } from "@aws-sdk/client-cloudwatch-logs";
import { SecretsManagerClient } from "@aws-sdk/client-secrets-manager";
import { RDSClient } from "@aws-sdk/client-rds";
import { APIGatewayClient } from "@aws-sdk/client-api-gateway";
import { ApiGatewayV2Client } from "@aws-sdk/client-apigatewayv2";
import { SNSClient } from "@aws-sdk/client-sns";
import { SSMClient } from "@aws-sdk/client-ssm";
import { CloudFormationClient } from "@aws-sdk/client-cloudformation";

import { normalizeEndpointUrl } from "./endpoint-utils";

export const DEFAULT_FLOCI_ENDPOINT = process.env.FLOCI_ENDPOINT || "http://10.75.75.50:4566";

export function resolveEndpoint(reqEndpoint?: string | null): string {
  if (reqEndpoint && reqEndpoint.trim() !== "") {
    return normalizeEndpointUrl(reqEndpoint);
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

export function getSQSClient(endpoint?: string): SQSClient {
  return new SQSClient({
    endpoint: resolveEndpoint(endpoint),
    region: "us-east-1",
    credentials: mockCredentials,
  });
}

export function getLambdaClient(endpoint?: string): LambdaClient {
  return new LambdaClient({
    endpoint: resolveEndpoint(endpoint),
    region: "us-east-1",
    credentials: mockCredentials,
  });
}

export function getCloudWatchLogsClient(endpoint?: string): CloudWatchLogsClient {
  return new CloudWatchLogsClient({
    endpoint: resolveEndpoint(endpoint),
    region: "us-east-1",
    credentials: mockCredentials,
  });
}

export function getSecretsManagerClient(endpoint?: string): SecretsManagerClient {
  return new SecretsManagerClient({
    endpoint: resolveEndpoint(endpoint),
    region: "us-east-1",
    credentials: mockCredentials,
  });
}

export function getRDSClient(endpoint?: string): RDSClient {
  return new RDSClient({
    endpoint: resolveEndpoint(endpoint),
    region: "us-east-1",
    credentials: mockCredentials,
  });
}

export function getAPIGatewayClient(endpoint?: string): APIGatewayClient {
  return new APIGatewayClient({
    endpoint: resolveEndpoint(endpoint),
    region: "us-east-1",
    credentials: mockCredentials,
  });
}

export function getAPIGatewayV2Client(endpoint?: string): ApiGatewayV2Client {
  return new ApiGatewayV2Client({
    endpoint: resolveEndpoint(endpoint),
    region: "us-east-1",
    credentials: mockCredentials,
  });
}

export function getSNSClient(endpoint?: string): SNSClient {
  return new SNSClient({
    endpoint: resolveEndpoint(endpoint),
    region: "us-east-1",
    credentials: mockCredentials,
  });
}

export function getSSMClient(endpoint?: string): SSMClient {
  return new SSMClient({
    endpoint: resolveEndpoint(endpoint),
    region: "us-east-1",
    credentials: mockCredentials,
  });
}

export function getCloudFormationClient(endpoint?: string): CloudFormationClient {
  return new CloudFormationClient({
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
  status?: string;
}

export async function fetchFlociHealth(endpoint?: string): Promise<FlociHealthResponse> {
  const ep = resolveEndpoint(endpoint);
  const healthEndpoints = [
    `${ep}/_floci/health`,
    `${ep}/_localstack/health`,
    `${ep}/_floci-az/health`,
    `${ep}/_floci-oci/health`,
  ];

  for (const url of healthEndpoints) {
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        // If data has status: "UP" but no services dict, provide default service statuses
        if (!data.services || Object.keys(data.services).length === 0) {
          const isAz = url.includes("az") || data.edition?.includes("az") || ep.includes("4577");
          const isOci = url.includes("oci") || data.edition?.includes("oci") || ep.includes("4599");

          if (isAz) {
            data.services = {
              compute: "running",
              blob: "running",
              cosmosdb: "running",
              entra: "running",
              functions: "running",
              keyvault: "running",
              queues: "running",
              eventgrid: "running",
              sql: "running",
              apim: "running",
              monitor: "running",
              appconfig: "running",
              arm: "running",
            };
          } else if (isOci) {
            data.services = {
              compute: "running",
              objectstorage: "running",
              nosql: "running",
              iam: "running",
              functions: "running",
              vault: "running",
              queue: "running",
              notifications: "running",
              autonomousdb: "running",
              apigateway: "running",
              logging: "running",
              resourcemanager: "running",
            };
          } else {
            data.services = data.services || {
              ec2: "running",
              s3: "running",
              dynamodb: "running",
              iam: "running",
              lambda: "running",
              sqs: "running",
              sns: "running",
            };
          }
        }
        return data;
      }
    } catch {
      // try next endpoint
    }
  }

  throw new Error(`Floci health check failed on all probed health endpoints for ${ep}`);
}
