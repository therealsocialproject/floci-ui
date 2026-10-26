import { NextRequest, NextResponse } from "next/server";
import {
  DescribeParametersCommand,
  GetParametersCommand,
  GetParameterCommand,
  GetParameterHistoryCommand,
  PutParameterCommand,
  DeleteParameterCommand,
  ParameterType,
} from "@aws-sdk/client-ssm";
import { getSSMClient } from "@/lib/floci-client";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const endpoint = searchParams.get("endpoint") || undefined;
    const action = searchParams.get("action") || "list";
    const name = searchParams.get("name") || undefined;

    const client = getSSMClient(endpoint);

    if (action === "history" && name) {
      const cmd = new GetParameterHistoryCommand({
        Name: name,
        WithDecryption: true,
      });
      const res = await client.send(cmd);
      return NextResponse.json({ history: res.Parameters || [] });
    }

    if (action === "get" && name) {
      const cmd = new GetParameterCommand({
        Name: name,
        WithDecryption: true,
      });
      const res = await client.send(cmd);
      return NextResponse.json({ parameter: res.Parameter });
    }

    // Default: list parameters with values
    const descCmd = new DescribeParametersCommand({ MaxResults: 50 });
    const descRes = await client.send(descCmd);
    const paramMetadata = descRes.Parameters || [];

    if (paramMetadata.length === 0) {
      return NextResponse.json({ parameters: [] });
    }

    // Fetch actual values
    const names = paramMetadata.map((p) => p.Name!).filter(Boolean);
    let valuesMap: Record<string, string> = {};
    try {
      const getCmd = new GetParametersCommand({
        Names: names,
        WithDecryption: true,
      });
      const getRes = await client.send(getCmd);
      (getRes.Parameters || []).forEach((p) => {
        if (p.Name) valuesMap[p.Name] = p.Value || "";
      });
    } catch {
      // Fallback if batch get fails
    }

    const parameters = paramMetadata.map((meta) => ({
      name: meta.Name || "",
      type: meta.Type || "String",
      description: meta.Description || "",
      version: meta.Version || 1,
      lastModifiedDate: meta.LastModifiedDate ? new Date(meta.LastModifiedDate).toISOString() : "",
      tier: meta.Tier || "Standard",
      value: valuesMap[meta.Name || ""] || "",
      raw: meta,
    }));

    return NextResponse.json({ parameters });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch SSM parameters" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const endpoint = searchParams.get("endpoint") || undefined;
    const body = await req.json();
    const { action, name, value, type, description, tier } = body;

    const client = getSSMClient(endpoint);

    if (action === "put") {
      const cmd = new PutParameterCommand({
        Name: name,
        Value: value,
        Type: (type as ParameterType) || ParameterType.STRING,
        Description: description || undefined,
        Tier: tier || "Standard",
        Overwrite: true,
      });
      const res = await client.send(cmd);
      return NextResponse.json({ success: true, version: res.Version });
    }

    if (action === "delete") {
      const cmd = new DeleteParameterCommand({
        Name: name,
      });
      await client.send(cmd);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to execute SSM action" },
      { status: 500 }
    );
  }
}
