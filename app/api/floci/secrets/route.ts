import { NextRequest, NextResponse } from "next/server";
import {
  ListSecretsCommand,
  GetSecretValueCommand,
  CreateSecretCommand,
  DeleteSecretCommand,
  PutSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";
import { getSecretsManagerClient } from "@/lib/floci-client";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const endpoint = searchParams.get("endpoint") || undefined;
    const action = searchParams.get("action") || "list";
    const secretId = searchParams.get("secretId");

    const client = getSecretsManagerClient(endpoint);

    if (action === "get_value" && secretId) {
      const cmd = new GetSecretValueCommand({ SecretId: secretId });
      const res = await client.send(cmd);
      return NextResponse.json({
        secretString: res.SecretString || "",
        createdDate: res.CreatedDate ? new Date(res.CreatedDate).toISOString() : "",
        versionId: res.VersionId || "",
        arn: res.ARN || "",
        name: res.Name || "",
      });
    }

    const cmd = new ListSecretsCommand({ MaxResults: 100 });
    const res = await client.send(cmd);

    const secrets = (res.SecretList || []).map((sec) => ({
      name: sec.Name || "",
      arn: sec.ARN || "",
      description: sec.Description || "",
      createdDate: sec.CreatedDate ? new Date(sec.CreatedDate).toISOString() : "",
      lastChangedDate: sec.LastChangedDate ? new Date(sec.LastChangedDate).toISOString() : "",
      tags: sec.Tags || [],
      raw: sec,
    }));

    return NextResponse.json({ secrets });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch Secrets Manager secrets" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const endpoint = searchParams.get("endpoint") || undefined;
    const body = await req.json();
    const { action, name, description, secretString, secretId } = body;

    const client = getSecretsManagerClient(endpoint);

    if (action === "create") {
      const cmd = new CreateSecretCommand({
        Name: name,
        Description: description,
        SecretString: secretString,
      });
      const res = await client.send(cmd);
      return NextResponse.json({ success: true, arn: res.ARN, name: res.Name });
    }

    if (action === "update_value") {
      const cmd = new PutSecretValueCommand({
        SecretId: secretId,
        SecretString: secretString,
      });
      const res = await client.send(cmd);
      return NextResponse.json({ success: true, versionId: res.VersionId });
    }

    if (action === "delete") {
      const cmd = new DeleteSecretCommand({
        SecretId: secretId,
        ForceDeleteWithoutRecovery: true,
      });
      await client.send(cmd);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Secrets Manager operation failed" },
      { status: 500 }
    );
  }
}
