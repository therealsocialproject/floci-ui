import { NextRequest, NextResponse } from "next/server";
import {
  DescribeLoadBalancersCommand,
  CreateLoadBalancerCommand,
  DeleteLoadBalancerCommand,
  DescribeTargetGroupsCommand,
  CreateTargetGroupCommand,
  DeleteTargetGroupCommand,
  DescribeListenersCommand,
} from "@aws-sdk/client-elastic-load-balancing-v2";
import { getELBv2Client } from "@/lib/floci-client";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const endpoint = searchParams.get("endpoint") || undefined;
    const action = searchParams.get("action") || "list";
    const loadBalancerArn = searchParams.get("loadBalancerArn") || undefined;

    const client = getELBv2Client(endpoint);

    if (action === "listeners" && loadBalancerArn) {
      const res = await client.send(
        new DescribeListenersCommand({ LoadBalancerArn: loadBalancerArn })
      );
      return NextResponse.json({ listeners: res.Listeners || [] });
    }

    const [lbRes, tgRes] = await Promise.allSettled([
      client.send(new DescribeLoadBalancersCommand({})),
      client.send(new DescribeTargetGroupsCommand({})),
    ]);

    const loadBalancers =
      lbRes.status === "fulfilled" ? lbRes.value.LoadBalancers || [] : [];
    const targetGroups =
      tgRes.status === "fulfilled" ? tgRes.value.TargetGroups || [] : [];

    return NextResponse.json({
      loadBalancers,
      targetGroups,
      count: loadBalancers.length,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch ELB v2 resources" },
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

    const client = getELBv2Client(endpoint);

    if (action === "create_lb") {
      const res = await client.send(
        new CreateLoadBalancerCommand({
          Name: body.name,
          Type: body.type || "application",
          Scheme: body.scheme || "internet-facing",
          Subnets: body.subnets || ["subnet-12345678"],
        })
      );
      return NextResponse.json({
        success: true,
        loadBalancer: res.LoadBalancers?.[0],
      });
    }

    if (action === "delete_lb") {
      await client.send(
        new DeleteLoadBalancerCommand({ LoadBalancerArn: body.loadBalancerArn })
      );
      return NextResponse.json({ success: true });
    }

    if (action === "create_tg") {
      const res = await client.send(
        new CreateTargetGroupCommand({
          Name: body.name,
          Protocol: body.protocol || "HTTP",
          Port: Number(body.port || 80),
          VpcId: body.vpcId || "vpc-default",
          TargetType: body.targetType || "instance",
        })
      );
      return NextResponse.json({
        success: true,
        targetGroup: res.TargetGroups?.[0],
      });
    }

    if (action === "delete_tg") {
      await client.send(
        new DeleteTargetGroupCommand({ TargetGroupArn: body.targetGroupArn })
      );
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "ELB v2 operation failed" },
      { status: 500 }
    );
  }
}
