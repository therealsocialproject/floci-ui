import { NextRequest, NextResponse } from "next/server";
import {
  ListStreamsCommand,
  DescribeStreamSummaryCommand,
  CreateStreamCommand,
  DeleteStreamCommand,
  PutRecordCommand,
} from "@aws-sdk/client-kinesis";
import { getKinesisClient } from "@/lib/floci-client";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const endpoint = searchParams.get("endpoint") || undefined;

    const client = getKinesisClient(endpoint);
    const listRes = await client.send(new ListStreamsCommand({ Limit: 100 }));
    const streamNames = listRes.StreamNames || [];

    const streams = await Promise.all(
      streamNames.map(async (name) => {
        try {
          const sumRes = await client.send(
            new DescribeStreamSummaryCommand({ StreamName: name })
          );
          const s = sumRes.StreamDescriptionSummary;
          return {
            name,
            arn: s?.StreamARN || "",
            status: s?.StreamStatus || "ACTIVE",
            shardCount: s?.OpenShardCount ?? 1,
            retentionHours: s?.RetentionPeriodHours ?? 24,
            mode: s?.StreamModeDetails?.StreamMode || "PROVISIONED",
            createdAt: s?.StreamCreationTimestamp || null,
            raw: s,
          };
        } catch {
          return {
            name,
            arn: "",
            status: "ACTIVE",
            shardCount: 1,
            retentionHours: 24,
            mode: "PROVISIONED",
            createdAt: null,
          };
        }
      })
    );

    return NextResponse.json({
      streams,
      count: streams.length,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch Kinesis streams" },
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

    const client = getKinesisClient(endpoint);

    if (action === "create_stream") {
      await client.send(
        new CreateStreamCommand({
          StreamName: body.streamName,
          ShardCount: Number(body.shardCount || 1),
        })
      );
      return NextResponse.json({ success: true });
    }

    if (action === "delete_stream") {
      await client.send(
        new DeleteStreamCommand({
          StreamName: body.streamName,
          EnforceConsumerDeletion: true,
        })
      );
      return NextResponse.json({ success: true });
    }

    if (action === "put_record") {
      const dataStr =
        typeof body.data === "string" ? body.data : JSON.stringify(body.data || {});
      const res = await client.send(
        new PutRecordCommand({
          StreamName: body.streamName,
          PartitionKey: body.partitionKey || "partition-1",
          Data: Buffer.from(dataStr, "utf-8"),
        })
      );
      return NextResponse.json({
        success: true,
        shardId: res.ShardId,
        sequenceNumber: res.SequenceNumber,
      });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Kinesis operation failed" },
      { status: 500 }
    );
  }
}
