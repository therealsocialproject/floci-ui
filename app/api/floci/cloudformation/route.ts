import { NextRequest, NextResponse } from "next/server";
import {
  ListStacksCommand,
  DescribeStacksCommand,
  DescribeStackResourcesCommand,
  DescribeStackEventsCommand,
  GetTemplateCommand,
  CreateStackCommand,
  UpdateStackCommand,
  DeleteStackCommand,
  StackStatus,
} from "@aws-sdk/client-cloudformation";
import { getCloudFormationClient } from "@/lib/floci-client";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const endpoint = searchParams.get("endpoint") || undefined;
    const action = searchParams.get("action") || "list";
    const stackName = searchParams.get("stackName") || undefined;

    const client = getCloudFormationClient(endpoint);

    if (action === "describe" && stackName) {
      const cmd = new DescribeStacksCommand({ StackName: stackName });
      const res = await client.send(cmd);
      const stack = res.Stacks && res.Stacks.length > 0 ? res.Stacks[0] : null;
      return NextResponse.json({ stack });
    }

    if (action === "resources" && stackName) {
      const cmd = new DescribeStackResourcesCommand({ StackName: stackName });
      const res = await client.send(cmd);
      return NextResponse.json({ resources: res.StackResources || [] });
    }

    if (action === "events" && stackName) {
      const cmd = new DescribeStackEventsCommand({ StackName: stackName });
      const res = await client.send(cmd);
      return NextResponse.json({ events: res.StackEvents || [] });
    }

    if (action === "template" && stackName) {
      const cmd = new GetTemplateCommand({ StackName: stackName });
      const res = await client.send(cmd);
      return NextResponse.json({ template: res.TemplateBody || "" });
    }

    // Default: list stacks
    // By default query all stacks except DELETE_COMPLETE unless specified
    const cmd = new ListStacksCommand({
      StackStatusFilter: [
        StackStatus.CREATE_IN_PROGRESS,
        StackStatus.CREATE_FAILED,
        StackStatus.CREATE_COMPLETE,
        StackStatus.ROLLBACK_IN_PROGRESS,
        StackStatus.ROLLBACK_FAILED,
        StackStatus.ROLLBACK_COMPLETE,
        StackStatus.DELETE_IN_PROGRESS,
        StackStatus.DELETE_FAILED,
        StackStatus.UPDATE_IN_PROGRESS,
        StackStatus.UPDATE_COMPLETE_CLEANUP_IN_PROGRESS,
        StackStatus.UPDATE_COMPLETE,
        StackStatus.UPDATE_ROLLBACK_IN_PROGRESS,
        StackStatus.UPDATE_ROLLBACK_FAILED,
        StackStatus.UPDATE_ROLLBACK_COMPLETE_CLEANUP_IN_PROGRESS,
        StackStatus.UPDATE_ROLLBACK_COMPLETE,
        StackStatus.IMPORT_IN_PROGRESS,
        StackStatus.IMPORT_COMPLETE,
        StackStatus.IMPORT_ROLLBACK_IN_PROGRESS,
        StackStatus.IMPORT_ROLLBACK_FAILED,
        StackStatus.IMPORT_ROLLBACK_COMPLETE,
      ],
    });

    let stackSummaries: any[] = [];
    try {
      const res = await client.send(cmd);
      stackSummaries = res.StackSummaries || [];
    } catch {
      // Fallback without status filter if emulator doesn't support filter
      try {
        const fallbackCmd = new ListStacksCommand({});
        const res = await client.send(fallbackCmd);
        stackSummaries = (res.StackSummaries || []).filter(
          (s) => s.StackStatus !== StackStatus.DELETE_COMPLETE
        );
      } catch (err: any) {
        return NextResponse.json(
          { error: err.message || "Failed to list stacks", stacks: [] },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ stacks: stackSummaries });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "CloudFormation request failed", stacks: [] },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const endpoint = searchParams.get("endpoint") || undefined;
    const body = await req.json();
    const { action, stackName, templateBody, parameters } = body;

    const client = getCloudFormationClient(endpoint);

    if (action === "create") {
      if (!stackName || !templateBody) {
        return NextResponse.json(
          { error: "StackName and TemplateBody are required" },
          { status: 400 }
        );
      }

      const params = Array.isArray(parameters)
        ? parameters.map((p: any) => ({
            ParameterKey: p.key || p.ParameterKey,
            ParameterValue: p.value || p.ParameterValue,
          }))
        : undefined;

      const cmd = new CreateStackCommand({
        StackName: stackName,
        TemplateBody: templateBody,
        Parameters: params,
        Capabilities: [
          "CAPABILITY_IAM",
          "CAPABILITY_NAMED_IAM",
          "CAPABILITY_AUTO_EXPAND",
        ],
      });

      const res = await client.send(cmd);
      return NextResponse.json({ success: true, stackId: res.StackId });
    }

    if (action === "update") {
      if (!stackName || !templateBody) {
        return NextResponse.json(
          { error: "StackName and TemplateBody are required" },
          { status: 400 }
        );
      }

      const params = Array.isArray(parameters)
        ? parameters.map((p: any) => ({
            ParameterKey: p.key || p.ParameterKey,
            ParameterValue: p.value || p.ParameterValue,
          }))
        : undefined;

      const cmd = new UpdateStackCommand({
        StackName: stackName,
        TemplateBody: templateBody,
        Parameters: params,
        Capabilities: [
          "CAPABILITY_IAM",
          "CAPABILITY_NAMED_IAM",
          "CAPABILITY_AUTO_EXPAND",
        ],
      });

      const res = await client.send(cmd);
      return NextResponse.json({ success: true, stackId: res.StackId });
    }

    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to execute CloudFormation mutation" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const endpoint = searchParams.get("endpoint") || undefined;
    const stackName = searchParams.get("stackName");

    if (!stackName) {
      return NextResponse.json(
        { error: "stackName query parameter is required" },
        { status: 400 }
      );
    }

    const client = getCloudFormationClient(endpoint);
    const cmd = new DeleteStackCommand({ StackName: stackName });
    await client.send(cmd);

    return NextResponse.json({ success: true, deleted: stackName });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to delete stack" },
      { status: 500 }
    );
  }
}
