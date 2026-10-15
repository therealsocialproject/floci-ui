import { NextRequest, NextResponse } from "next/server";
import {
  DescribeLogGroupsCommand,
  DescribeLogStreamsCommand,
  GetLogEventsCommand,
  FilterLogEventsCommand,
  CreateLogGroupCommand,
  DeleteLogGroupCommand,
} from "@aws-sdk/client-cloudwatch-logs";
import { getCloudWatchLogsClient } from "@/lib/floci-client";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const endpoint = searchParams.get("endpoint") || undefined;
    const action = searchParams.get("action") || "groups";
    const logGroupName = searchParams.get("logGroupName") || "";
    const logStreamName = searchParams.get("logStreamName") || "";
    const filterPattern = searchParams.get("filterPattern") || "";

    const client = getCloudWatchLogsClient(endpoint);

    if (action === "streams") {
      const cmd = new DescribeLogStreamsCommand({
        logGroupName,
        orderBy: "LastEventTime",
        descending: true,
        limit: 50,
      });
      const res = await client.send(cmd);
      return NextResponse.json({
        streams: res.logStreams || [],
      });
    }

    if (action === "events") {
      if (filterPattern) {
        const filterCmd = new FilterLogEventsCommand({
          logGroupName,
          filterPattern,
          limit: 100,
        });
        const filterRes = await client.send(filterCmd);
        return NextResponse.json({
          events: filterRes.events || [],
        });
      }

      const eventsCmd = new GetLogEventsCommand({
        logGroupName,
        logStreamName,
        limit: 100,
        startFromHead: false,
      });
      const eventsRes = await client.send(eventsCmd);
      return NextResponse.json({
        events: eventsRes.events || [],
      });
    }

    // Default: List log groups
    const cmd = new DescribeLogGroupsCommand({ limit: 50 });
    const res = await client.send(cmd);

    const logGroups = (res.logGroups || []).map((group) => ({
      name: group.logGroupName || "",
      arn: group.arn || "",
      creationTime: group.creationTime
        ? new Date(group.creationTime).toISOString()
        : "",
      storedBytes: group.storedBytes || 0,
      retentionInDays: group.retentionInDays || "Never expire",
      raw: group,
    }));

    return NextResponse.json({ logGroups });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch CloudWatch Logs" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const endpoint = searchParams.get("endpoint") || undefined;
    const body = await req.json();
    const { action, logGroupName } = body;

    const client = getCloudWatchLogsClient(endpoint);

    if (action === "create_group") {
      const cmd = new CreateLogGroupCommand({ logGroupName });
      await client.send(cmd);
      return NextResponse.json({ success: true });
    }

    if (action === "delete_group") {
      const cmd = new DeleteLogGroupCommand({ logGroupName });
      await client.send(cmd);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "CloudWatch Logs operation failed" },
      { status: 500 }
    );
  }
}
