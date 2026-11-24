import { NextRequest, NextResponse } from "next/server";
import {
  ListClustersCommand,
  DescribeClusterCommand,
  CreateClusterCommand,
  DeleteClusterCommand,
  ListNodegroupsCommand,
  DescribeNodegroupCommand,
  DeleteNodegroupCommand,
} from "@aws-sdk/client-eks";
import { getEKSClient } from "@/lib/floci-client";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const endpoint = searchParams.get("endpoint") || undefined;
    const action = searchParams.get("action") || "list";
    const clusterName = searchParams.get("clusterName") || undefined;

    const client = getEKSClient(endpoint);

    if (action === "nodegroups" && clusterName) {
      const listRes = await client.send(
        new ListNodegroupsCommand({ clusterName })
      );
      const names = listRes.nodegroups || [];
      const nodegroups = await Promise.all(
        names.map(async (nodegroupName) => {
          try {
            const desc = await client.send(
              new DescribeNodegroupCommand({ clusterName, nodegroupName })
            );
            return desc.nodegroup || { nodegroupName };
          } catch {
            return { nodegroupName };
          }
        })
      );
      return NextResponse.json({ nodegroups });
    }

    const listRes = await client.send(new ListClustersCommand({}));
    const names = listRes.clusters || [];
    const clusters = await Promise.all(
      names.map(async (name) => {
        try {
          const desc = await client.send(new DescribeClusterCommand({ name }));
          return desc.cluster || { name };
        } catch {
          return { name };
        }
      })
    );

    return NextResponse.json({
      clusters,
      count: clusters.length,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch EKS clusters" },
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

    const client = getEKSClient(endpoint);

    if (action === "create_cluster") {
      const res = await client.send(
        new CreateClusterCommand({
          name: body.name,
          version: body.version || "1.31",
          roleArn:
            body.roleArn ||
            "arn:aws:iam::000000000000:role/eksClusterRole",
          resourcesVpcConfig: {
            subnetIds: body.subnetIds || ["subnet-12345678"],
          },
        })
      );
      return NextResponse.json({ success: true, cluster: res.cluster });
    }

    if (action === "delete_cluster") {
      await client.send(new DeleteClusterCommand({ name: body.name }));
      return NextResponse.json({ success: true });
    }

    if (action === "delete_nodegroup") {
      await client.send(
        new DeleteNodegroupCommand({
          clusterName: body.clusterName,
          nodegroupName: body.nodegroupName,
        })
      );
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "EKS operation failed" },
      { status: 500 }
    );
  }
}
