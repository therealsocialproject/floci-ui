import { NextRequest, NextResponse } from "next/server";
import {
  DescribeCacheClustersCommand,
  CreateCacheClusterCommand,
  DeleteCacheClusterCommand,
  DescribeReplicationGroupsCommand,
  DeleteReplicationGroupCommand,
} from "@aws-sdk/client-elasticache";
import { getElastiCacheClient } from "@/lib/floci-client";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const endpoint = searchParams.get("endpoint") || undefined;

    const client = getElastiCacheClient(endpoint);

    const [clustersRes, rgRes] = await Promise.allSettled([
      client.send(new DescribeCacheClustersCommand({ ShowCacheNodeInfo: true })),
      client.send(new DescribeReplicationGroupsCommand({})),
    ]);

    const clusters =
      clustersRes.status === "fulfilled"
        ? clustersRes.value.CacheClusters || []
        : [];
    const replicationGroups =
      rgRes.status === "fulfilled" ? rgRes.value.ReplicationGroups || [] : [];

    return NextResponse.json({
      clusters,
      replicationGroups,
      count: clusters.length + replicationGroups.length,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch ElastiCache resources" },
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

    const client = getElastiCacheClient(endpoint);

    if (action === "create_cluster") {
      const res = await client.send(
        new CreateCacheClusterCommand({
          CacheClusterId: body.clusterId,
          Engine: body.engine || "valkey",
          CacheNodeType: body.nodeType || "cache.t3.micro",
          NumCacheNodes: Number(body.numNodes || 1),
        })
      );
      return NextResponse.json({ success: true, cluster: res.CacheCluster });
    }

    if (action === "delete_cluster") {
      await client.send(
        new DeleteCacheClusterCommand({ CacheClusterId: body.clusterId })
      );
      return NextResponse.json({ success: true });
    }

    if (action === "delete_replication_group") {
      await client.send(
        new DeleteReplicationGroupCommand({
          ReplicationGroupId: body.replicationGroupId,
        })
      );
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "ElastiCache operation failed" },
      { status: 500 }
    );
  }
}
