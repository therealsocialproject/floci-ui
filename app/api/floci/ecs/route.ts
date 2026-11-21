import { NextRequest, NextResponse } from "next/server";
import {
  ListClustersCommand,
  DescribeClustersCommand,
  CreateClusterCommand,
  DeleteClusterCommand,
  ListServicesCommand,
  DescribeServicesCommand,
  ListTasksCommand,
  DescribeTasksCommand,
  StopTaskCommand,
  ListTaskDefinitionsCommand,
} from "@aws-sdk/client-ecs";
import { getECSClient } from "@/lib/floci-client";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const endpoint = searchParams.get("endpoint") || undefined;
    const action = searchParams.get("action") || "list";
    const cluster = searchParams.get("cluster") || undefined;

    const client = getECSClient(endpoint);

    if (action === "cluster_details" && cluster) {
      const [svcListRes, taskListRes] = await Promise.allSettled([
        client.send(new ListServicesCommand({ cluster })),
        client.send(new ListTasksCommand({ cluster })),
      ]);

      const serviceArns =
        svcListRes.status === "fulfilled"
          ? svcListRes.value.serviceArns || []
          : [];
      const taskArns =
        taskListRes.status === "fulfilled"
          ? taskListRes.value.taskArns || []
          : [];

      const [svcsRes, tasksRes] = await Promise.allSettled([
        serviceArns.length > 0
          ? client.send(
              new DescribeServicesCommand({ cluster, services: serviceArns })
            )
          : Promise.resolve({ services: [] }),
        taskArns.length > 0
          ? client.send(new DescribeTasksCommand({ cluster, tasks: taskArns }))
          : Promise.resolve({ tasks: [] }),
      ]);

      return NextResponse.json({
        services:
          svcsRes.status === "fulfilled" ? svcsRes.value.services || [] : [],
        tasks: tasksRes.status === "fulfilled" ? tasksRes.value.tasks || [] : [],
      });
    }

    const [clusterListRes, taskDefsRes] = await Promise.allSettled([
      client.send(new ListClustersCommand({})),
      client.send(new ListTaskDefinitionsCommand({})),
    ]);

    const clusterArns =
      clusterListRes.status === "fulfilled"
        ? clusterListRes.value.clusterArns || []
        : [];
    const taskDefinitions =
      taskDefsRes.status === "fulfilled"
        ? taskDefsRes.value.taskDefinitionArns || []
        : [];

    let clusters: any[] = [];
    if (clusterArns.length > 0) {
      const desc = await client.send(
        new DescribeClustersCommand({ clusters: clusterArns })
      );
      clusters = desc.clusters || [];
    }

    return NextResponse.json({
      clusters,
      taskDefinitions,
      count: clusters.length,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch ECS resources" },
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

    const client = getECSClient(endpoint);

    if (action === "create_cluster") {
      const res = await client.send(
        new CreateClusterCommand({ clusterName: body.clusterName })
      );
      return NextResponse.json({ success: true, cluster: res.cluster });
    }

    if (action === "delete_cluster") {
      await client.send(new DeleteClusterCommand({ cluster: body.cluster }));
      return NextResponse.json({ success: true });
    }

    if (action === "stop_task") {
      await client.send(
        new StopTaskCommand({
          cluster: body.cluster,
          task: body.task,
          reason: body.reason || "Stopped from Floci Console",
        })
      );
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "ECS operation failed" },
      { status: 500 }
    );
  }
}
