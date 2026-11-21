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
import { EventBridgeClient } from "@aws-sdk/client-eventbridge";
import { SFNClient } from "@aws-sdk/client-sfn";
import { CloudWatchClient } from "@aws-sdk/client-cloudwatch";
import { CognitoIdentityProviderClient } from "@aws-sdk/client-cognito-identity-provider";
import { ECSClient } from "@aws-sdk/client-ecs";
import { ECRClient } from "@aws-sdk/client-ecr";
import { Route53Client } from "@aws-sdk/client-route-53";
import { SESClient } from "@aws-sdk/client-ses";
import { KinesisClient } from "@aws-sdk/client-kinesis";

import { normalizeEndpointUrl } from "./endpoint-utils";

export const DEFAULT_FLOCI_ENDPOINT =
  process.env.AWS_ENDPOINT_URL ||
  process.env.FLOCI_ENDPOINT ||
  "http://10.75.75.50:4566";

export const DEFAULT_AWS_REGION =
  process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "us-east-1";

export function resolveEndpoint(reqEndpoint?: string | null): string {
  if (reqEndpoint && reqEndpoint.trim() !== "") {
    return normalizeEndpointUrl(reqEndpoint);
  }
  return normalizeEndpointUrl(DEFAULT_FLOCI_ENDPOINT);
}

const mockCredentials = {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID || "mock",
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "mock",
  ...(process.env.AWS_SESSION_TOKEN
    ? { sessionToken: process.env.AWS_SESSION_TOKEN }
    : {}),
};

function baseConfig(endpoint?: string) {
  return {
    endpoint: resolveEndpoint(endpoint),
    region: DEFAULT_AWS_REGION,
    credentials: mockCredentials,
  };
}

export function getEC2Client(endpoint?: string): EC2Client {
  return new EC2Client(baseConfig(endpoint));
}

export function getS3Client(endpoint?: string): S3Client {
  return new S3Client({
    ...baseConfig(endpoint),
    forcePathStyle: true,
  });
}

export function getIAMClient(endpoint?: string): IAMClient {
  return new IAMClient(baseConfig(endpoint));
}

export function getDynamoDBClient(endpoint?: string): DynamoDBClient {
  return new DynamoDBClient(baseConfig(endpoint));
}

export function getKMSClient(endpoint?: string): KMSClient {
  return new KMSClient(baseConfig(endpoint));
}

export function getSQSClient(endpoint?: string): SQSClient {
  return new SQSClient(baseConfig(endpoint));
}

export function getLambdaClient(endpoint?: string): LambdaClient {
  return new LambdaClient(baseConfig(endpoint));
}

export function getCloudWatchLogsClient(endpoint?: string): CloudWatchLogsClient {
  return new CloudWatchLogsClient(baseConfig(endpoint));
}

export function getSecretsManagerClient(endpoint?: string): SecretsManagerClient {
  return new SecretsManagerClient(baseConfig(endpoint));
}

export function getRDSClient(endpoint?: string): RDSClient {
  return new RDSClient(baseConfig(endpoint));
}

export function getAPIGatewayClient(endpoint?: string): APIGatewayClient {
  return new APIGatewayClient(baseConfig(endpoint));
}

export function getAPIGatewayV2Client(endpoint?: string): ApiGatewayV2Client {
  return new ApiGatewayV2Client(baseConfig(endpoint));
}

export function getSNSClient(endpoint?: string): SNSClient {
  return new SNSClient(baseConfig(endpoint));
}

export function getSSMClient(endpoint?: string): SSMClient {
  return new SSMClient(baseConfig(endpoint));
}

export function getCloudFormationClient(endpoint?: string): CloudFormationClient {
  return new CloudFormationClient(baseConfig(endpoint));
}

export function getEventBridgeClient(endpoint?: string): EventBridgeClient {
  return new EventBridgeClient(baseConfig(endpoint));
}

export function getStepFunctionsClient(endpoint?: string): SFNClient {
  return new SFNClient(baseConfig(endpoint));
}

export function getCloudWatchClient(endpoint?: string): CloudWatchClient {
  return new CloudWatchClient(baseConfig(endpoint));
}

export function getCognitoClient(endpoint?: string): CognitoIdentityProviderClient {
  return new CognitoIdentityProviderClient(baseConfig(endpoint));
}

export function getECSClient(endpoint?: string): ECSClient {
  return new ECSClient(baseConfig(endpoint));
}

export function getECRClient(endpoint?: string): ECRClient {
  return new ECRClient(baseConfig(endpoint));
}

export function getRoute53Client(endpoint?: string): Route53Client {
  return new Route53Client(baseConfig(endpoint));
}

export function getSESClient(endpoint?: string): SESClient {
  return new SESClient(baseConfig(endpoint));
}

export function getKinesisClient(endpoint?: string): KinesisClient {
  return new KinesisClient(baseConfig(endpoint));
}

export interface FlociHealthResponse {
  services: Record<string, string>;
  edition?: string;
  original_edition?: string;
  version?: string;
  status?: string;
  cloud?: string;
  emulator?: string;
  console_contract?: number;
  defaults?: {
    region?: string;
    account_id?: string;
  };
}

export async function fetchFlociHealth(endpoint?: string): Promise<FlociHealthResponse> {
  const ep = resolveEndpoint(endpoint);

  // Probe Floci Console Contract v2 manifest (/_floci/info) if available
  let manifest: Record<string, any> | null = null;
  const infoUrls = [
    ...(endpoint ? [] : process.env.FLOCI_INFO_URL ? [process.env.FLOCI_INFO_URL] : []),
    `${ep}/_floci/info`,
  ];
  for (const infoUrl of infoUrls) {
    try {
      const infoRes = await fetch(infoUrl, { cache: "no-store" });
      if (infoRes.ok) {
        manifest = await infoRes.json();
        break;
      }
    } catch {
      // ignore and fall back to health endpoints
    }
  }

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
        // Merge manifest metadata (v2 Console Contract)
        if (manifest) {
          data.version = data.version || manifest.version;
          data.edition = data.edition || manifest.edition;
          data.original_edition = data.original_edition || manifest.original_edition;
          data.cloud = manifest.cloud;
          data.emulator = manifest.emulator;
          data.console_contract = manifest.console_contract;
          data.defaults = manifest.defaults;
          if ((!data.services || Object.keys(data.services).length === 0) && manifest.services) {
            data.services = manifest.services;
          }
        }

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

  // If only /_floci/info responded, return it as a valid health response
  if (manifest) {
    return {
      services: manifest.services || {},
      edition: manifest.edition,
      original_edition: manifest.original_edition,
      version: manifest.version,
      status: "running",
      cloud: manifest.cloud,
      emulator: manifest.emulator,
      console_contract: manifest.console_contract,
      defaults: manifest.defaults,
    };
  }

  throw new Error(`Floci health check failed on all probed health endpoints for ${ep}`);
}
