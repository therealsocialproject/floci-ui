import { NextRequest, NextResponse } from "next/server";
import {
  ListFunctionsCommand,
  GetFunctionCommand,
  InvokeCommand,
} from "@aws-sdk/client-lambda";
import { getLambdaClient } from "@/lib/floci-client";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const endpoint = searchParams.get("endpoint") || undefined;
    const client = getLambdaClient(endpoint);

    const cmd = new ListFunctionsCommand({});
    const res = await client.send(cmd);

    const functions = (res.Functions || []).map((fn) => ({
      name: fn.FunctionName || "",
      arn: fn.FunctionArn || "",
      runtime: fn.Runtime || "custom",
      handler: fn.Handler || "index.handler",
      codeSize: fn.CodeSize || 0,
      description: fn.Description || "",
      timeout: fn.Timeout || 3,
      memorySize: fn.MemorySize || 128,
      lastModified: fn.LastModified || "",
      role: fn.Role || "",
      version: fn.Version || "$LATEST",
      environment: fn.Environment?.Variables || {},
      raw: fn,
    }));

    return NextResponse.json({ functions });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch Lambda functions" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const endpoint = searchParams.get("endpoint") || undefined;
    const body = await req.json();
    const { functionName, payload } = body;

    const client = getLambdaClient(endpoint);

    const payloadBytes = Buffer.from(
      typeof payload === "string" ? payload : JSON.stringify(payload || {})
    );

    const cmd = new InvokeCommand({
      FunctionName: functionName,
      Payload: payloadBytes,
      LogType: "Tail",
    });

    const res = await client.send(cmd);

    let decodedPayload = "";
    if (res.Payload) {
      decodedPayload = Buffer.from(res.Payload).toString("utf-8");
    }

    let decodedLogs = "";
    if (res.LogResult) {
      decodedLogs = Buffer.from(res.LogResult, "base64").toString("utf-8");
    }

    return NextResponse.json({
      statusCode: res.StatusCode,
      functionError: res.FunctionError,
      payload: decodedPayload,
      logs: decodedLogs,
      executedVersion: res.ExecutedVersion,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Lambda invocation failed" },
      { status: 500 }
    );
  }
}
