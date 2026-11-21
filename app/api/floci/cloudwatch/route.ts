import { NextRequest, NextResponse } from "next/server";
import {
  DescribeAlarmsCommand,
  ListMetricsCommand,
  PutMetricAlarmCommand,
  DeleteAlarmsCommand,
  SetAlarmStateCommand,
  EnableAlarmActionsCommand,
  DisableAlarmActionsCommand,
  PutMetricDataCommand,
} from "@aws-sdk/client-cloudwatch";
import { getCloudWatchClient } from "@/lib/floci-client";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const endpoint = searchParams.get("endpoint") || undefined;
    const namespace = searchParams.get("namespace") || undefined;

    const client = getCloudWatchClient(endpoint);

    const [alarmsRes, metricsRes] = await Promise.allSettled([
      client.send(new DescribeAlarmsCommand({ MaxRecords: 100 })),
      client.send(
        new ListMetricsCommand({
          Namespace: namespace || undefined,
        })
      ),
    ]);

    const alarms =
      alarmsRes.status === "fulfilled"
        ? alarmsRes.value.MetricAlarms || []
        : [];
    const metrics =
      metricsRes.status === "fulfilled" ? metricsRes.value.Metrics || [] : [];

    return NextResponse.json({
      alarms,
      metrics,
      count: alarms.length + metrics.length,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch CloudWatch metrics & alarms" },
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

    const client = getCloudWatchClient(endpoint);

    if (action === "put_alarm") {
      await client.send(
        new PutMetricAlarmCommand({
          AlarmName: body.alarmName,
          AlarmDescription: body.alarmDescription || undefined,
          MetricName: body.metricName,
          Namespace: body.namespace || "Floci/Custom",
          Statistic: body.statistic || "Average",
          Period: Number(body.period || 60),
          EvaluationPeriods: Number(body.evaluationPeriods || 1),
          Threshold: Number(body.threshold ?? 80),
          ComparisonOperator: body.comparisonOperator || "GreaterThanThreshold",
          ActionsEnabled: body.actionsEnabled !== false,
        })
      );
      return NextResponse.json({ success: true });
    }

    if (action === "delete_alarm") {
      await client.send(
        new DeleteAlarmsCommand({ AlarmNames: [body.alarmName] })
      );
      return NextResponse.json({ success: true });
    }

    if (action === "set_alarm_state") {
      await client.send(
        new SetAlarmStateCommand({
          AlarmName: body.alarmName,
          StateValue: body.stateValue,
          StateReason: body.stateReason || "Manually updated via Floci Console",
        })
      );
      return NextResponse.json({ success: true });
    }

    if (action === "enable_actions") {
      await client.send(
        new EnableAlarmActionsCommand({ AlarmNames: [body.alarmName] })
      );
      return NextResponse.json({ success: true });
    }

    if (action === "disable_actions") {
      await client.send(
        new DisableAlarmActionsCommand({ AlarmNames: [body.alarmName] })
      );
      return NextResponse.json({ success: true });
    }

    if (action === "put_metric") {
      await client.send(
        new PutMetricDataCommand({
          Namespace: body.namespace || "Floci/Custom",
          MetricData: [
            {
              MetricName: body.metricName,
              Value: Number(body.value ?? 1),
              Unit: body.unit || "Count",
              Timestamp: new Date(),
            },
          ],
        })
      );
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "CloudWatch operation failed" },
      { status: 500 }
    );
  }
}
