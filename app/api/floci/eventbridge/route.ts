import { NextRequest, NextResponse } from "next/server";
import {
  ListEventBusesCommand,
  CreateEventBusCommand,
  DeleteEventBusCommand,
  ListRulesCommand,
  PutRuleCommand,
  DeleteRuleCommand,
  ListTargetsByRuleCommand,
  PutTargetsCommand,
  RemoveTargetsCommand,
  PutEventsCommand,
} from "@aws-sdk/client-eventbridge";
import { getEventBridgeClient } from "@/lib/floci-client";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const endpoint = searchParams.get("endpoint") || undefined;
    const action = searchParams.get("action") || "list";
    const busName = searchParams.get("busName") || "default";
    const ruleName = searchParams.get("ruleName") || undefined;

    const client = getEventBridgeClient(endpoint);

    if (action === "targets" && ruleName) {
      const res = await client.send(
        new ListTargetsByRuleCommand({
          Rule: ruleName,
          EventBusName: busName,
        })
      );
      return NextResponse.json({ targets: res.Targets || [] });
    }

    if (action === "rules") {
      const res = await client.send(new ListRulesCommand({ EventBusName: busName }));
      const rules = res.Rules || [];
      return NextResponse.json({ rules });
    }

    // Default: fetch buses and rules for selected bus
    const [busesRes, rulesRes] = await Promise.allSettled([
      client.send(new ListEventBusesCommand({})),
      client.send(new ListRulesCommand({ EventBusName: busName })),
    ]);

    const buses =
      busesRes.status === "fulfilled" ? busesRes.value.EventBuses || [] : [];
    const rules =
      rulesRes.status === "fulfilled" ? rulesRes.value.Rules || [] : [];

    return NextResponse.json({
      buses,
      rules,
      count: buses.length,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch EventBridge resources" },
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

    const client = getEventBridgeClient(endpoint);

    if (action === "create_bus") {
      const res = await client.send(
        new CreateEventBusCommand({ Name: body.name })
      );
      return NextResponse.json({ success: true, arn: res.EventBusArn });
    }

    if (action === "delete_bus") {
      await client.send(new DeleteEventBusCommand({ Name: body.name }));
      return NextResponse.json({ success: true });
    }

    if (action === "put_rule") {
      const res = await client.send(
        new PutRuleCommand({
          Name: body.name,
          EventBusName: body.busName || "default",
          EventPattern: body.eventPattern || undefined,
          ScheduleExpression: body.scheduleExpression || undefined,
          State: body.state || "ENABLED",
          Description: body.description || undefined,
        })
      );
      return NextResponse.json({ success: true, ruleArn: res.RuleArn });
    }

    if (action === "delete_rule") {
      // Remove any targets first so delete succeeds cleanly
      try {
        const targetsRes = await client.send(
          new ListTargetsByRuleCommand({
            Rule: body.name,
            EventBusName: body.busName || "default",
          })
        );
        const ids = (targetsRes.Targets || [])
          .map((t) => t.Id)
          .filter(Boolean) as string[];
        if (ids.length > 0) {
          await client.send(
            new RemoveTargetsCommand({
              Rule: body.name,
              EventBusName: body.busName || "default",
              Ids: ids,
            })
          );
        }
      } catch {
        // ignore
      }
      await client.send(
        new DeleteRuleCommand({
          Name: body.name,
          EventBusName: body.busName || "default",
        })
      );
      return NextResponse.json({ success: true });
    }

    if (action === "put_targets") {
      const res = await client.send(
        new PutTargetsCommand({
          Rule: body.ruleName,
          EventBusName: body.busName || "default",
          Targets: [
            {
              Id: body.targetId || `target-${Date.now()}`,
              Arn: body.targetArn,
              Input: body.input || undefined,
            },
          ],
        })
      );
      return NextResponse.json({
        success: true,
        failedEntryCount: res.FailedEntryCount || 0,
      });
    }

    if (action === "remove_targets") {
      await client.send(
        new RemoveTargetsCommand({
          Rule: body.ruleName,
          EventBusName: body.busName || "default",
          Ids: [body.targetId],
        })
      );
      return NextResponse.json({ success: true });
    }

    if (action === "put_events") {
      const res = await client.send(
        new PutEventsCommand({
          Entries: [
            {
              EventBusName: body.busName || "default",
              Source: body.source || "floci.console",
              DetailType: body.detailType || "CustomEvent",
              Detail:
                typeof body.detail === "string"
                  ? body.detail
                  : JSON.stringify(body.detail || {}),
            },
          ],
        })
      );
      return NextResponse.json({
        success: true,
        failedEntryCount: res.FailedEntryCount || 0,
        entries: res.Entries || [],
      });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "EventBridge operation failed" },
      { status: 500 }
    );
  }
}
