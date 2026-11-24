import { NextRequest, NextResponse } from "next/server";
import {
  DescribeTrailsCommand,
  GetTrailStatusCommand,
  CreateTrailCommand,
  DeleteTrailCommand,
  StartLoggingCommand,
  StopLoggingCommand,
} from "@aws-sdk/client-cloudtrail";
import { getCloudTrailClient } from "@/lib/floci-client";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const endpoint = searchParams.get("endpoint") || undefined;

    const client = getCloudTrailClient(endpoint);
    const res = await client.send(new DescribeTrailsCommand({}));
    const rawTrails = res.trailList || [];

    const trails = await Promise.all(
      rawTrails.map(async (t) => {
        try {
          const status = await client.send(
            new GetTrailStatusCommand({ Name: t.TrailARN || t.Name })
          );
          return { ...t, IsLogging: Boolean(status.IsLogging), status };
        } catch {
          return { ...t, IsLogging: false };
        }
      })
    );

    return NextResponse.json({
      trails,
      count: trails.length,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch CloudTrail trails" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const endpoint = searchParams.get("endpoint") || undefined;
    const body = await req.json();
    const { action } = body;

    const client = getCloudTrailClient(endpoint);

    if (action === "create_trail") {
      const res = await client.send(
        new CreateTrailCommand({
          Name: body.name,
          S3BucketName: body.s3BucketName,
          S3KeyPrefix: body.s3KeyPrefix || undefined,
          IsMultiRegionTrail: body.isMultiRegion !== false,
        })
      );
      return NextResponse.json({ success: true, trail: res });
    }

    if (action === "delete_trail") {
      await client.send(new DeleteTrailCommand({ Name: body.name }));
      return NextResponse.json({ success: true });
    }

    if (action === "start_logging") {
      await client.send(new StartLoggingCommand({ Name: body.name }));
      return NextResponse.json({ success: true });
    }

    if (action === "stop_logging") {
      await client.send(new StopLoggingCommand({ Name: body.name }));
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "CloudTrail operation failed" },
      { status: 500 }
    );
  }
}
