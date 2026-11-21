import { NextRequest, NextResponse } from "next/server";
import {
  ListHostedZonesCommand,
  CreateHostedZoneCommand,
  DeleteHostedZoneCommand,
  ListResourceRecordSetsCommand,
  ChangeResourceRecordSetsCommand,
  RRType,
} from "@aws-sdk/client-route-53";
import { getRoute53Client } from "@/lib/floci-client";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const endpoint = searchParams.get("endpoint") || undefined;
    const action = searchParams.get("action") || "list";
    const hostedZoneId = searchParams.get("hostedZoneId") || undefined;

    const client = getRoute53Client(endpoint);

    if (action === "records" && hostedZoneId) {
      const res = await client.send(
        new ListResourceRecordSetsCommand({ HostedZoneId: hostedZoneId })
      );
      return NextResponse.json({ records: res.ResourceRecordSets || [] });
    }

    const res = await client.send(new ListHostedZonesCommand({}));
    const hostedZones = res.HostedZones || [];
    return NextResponse.json({
      hostedZones,
      count: hostedZones.length,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch Route 53 hosted zones" },
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

    const client = getRoute53Client(endpoint);

    if (action === "create_zone") {
      const res = await client.send(
        new CreateHostedZoneCommand({
          Name: body.name,
          CallerReference: `floci-ui-${Date.now()}`,
          HostedZoneConfig: {
            Comment: body.comment || "Created via Floci Console",
            PrivateZone: Boolean(body.privateZone),
          },
        })
      );
      return NextResponse.json({ success: true, hostedZone: res.HostedZone });
    }

    if (action === "delete_zone") {
      await client.send(
        new DeleteHostedZoneCommand({ Id: body.hostedZoneId })
      );
      return NextResponse.json({ success: true });
    }

    if (action === "upsert_record" || action === "delete_record") {
      const values: string[] = Array.isArray(body.values)
        ? body.values
        : String(body.value || "")
            .split("\n")
            .map((v: string) => v.trim())
            .filter(Boolean);

      await client.send(
        new ChangeResourceRecordSetsCommand({
          HostedZoneId: body.hostedZoneId,
          ChangeBatch: {
            Changes: [
              {
                Action: action === "delete_record" ? "DELETE" : "UPSERT",
                ResourceRecordSet: {
                  Name: body.recordName,
                  Type: (body.recordType || "A") as RRType,
                  TTL: Number(body.ttl || 300),
                  ResourceRecords: values.map((Value) => ({ Value })),
                },
              },
            ],
          },
        })
      );
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Route 53 operation failed" },
      { status: 500 }
    );
  }
}
