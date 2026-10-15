import { NextRequest, NextResponse } from "next/server";
import {
  DescribeDBInstancesCommand,
  DescribeDBClustersCommand,
  DescribeDBSnapshotsCommand,
  CreateDBInstanceCommand,
  DeleteDBInstanceCommand,
  RebootDBInstanceCommand,
  CreateDBSnapshotCommand,
  DeleteDBSnapshotCommand,
} from "@aws-sdk/client-rds";
import { getRDSClient, resolveEndpoint } from "@/lib/floci-client";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const endpoint = searchParams.get("endpoint") || undefined;
  const resource = searchParams.get("resource") || "all";

  try {
    const client = getRDSClient(endpoint);
    const result: any = {
      instances: [],
      clusters: [],
      snapshots: [],
    };

    if (resource === "all" || resource === "instances") {
      try {
        const res = await client.send(new DescribeDBInstancesCommand({}));
        result.instances =
          res.DBInstances?.map((i) => ({
            dbInstanceIdentifier: i.DBInstanceIdentifier,
            engine: i.Engine,
            engineVersion: i.EngineVersion,
            dbInstanceClass: i.DBInstanceClass,
            dbInstanceStatus: i.DBInstanceStatus,
            allocatedStorage: i.AllocatedStorage,
            masterUsername: i.MasterUsername,
            endpoint: i.Endpoint
              ? {
                  address: i.Endpoint.Address,
                  port: i.Endpoint.Port,
                  hostedZoneId: i.Endpoint.HostedZoneId,
                }
              : null,
            multiAZ: i.MultiAZ,
            availabilityZone: i.AvailabilityZone,
            instanceCreateTime: i.InstanceCreateTime,
            dbSubnetGroup: i.DBSubnetGroup?.DBSubnetGroupName,
            vpcSecurityGroups: i.VpcSecurityGroups?.map((v) => v.VpcSecurityGroupId),
          })) || [];
      } catch (err: any) {
        console.warn("DescribeDBInstances warning:", err.message);
      }
    }

    if (resource === "all" || resource === "clusters") {
      try {
        const res = await client.send(new DescribeDBClustersCommand({}));
        result.clusters =
          res.DBClusters?.map((c) => ({
            dbClusterIdentifier: c.DBClusterIdentifier,
            engine: c.Engine,
            engineVersion: c.EngineVersion,
            status: c.Status,
            endpoint: c.Endpoint,
            readerEndpoint: c.ReaderEndpoint,
            multiAZ: c.MultiAZ,
            clusterCreateTime: c.ClusterCreateTime,
            databaseName: c.DatabaseName,
            masterUsername: c.MasterUsername,
            dbClusterMembers: c.DBClusterMembers?.map((m) => m.DBInstanceIdentifier),
          })) || [];
      } catch (err: any) {
        console.warn("DescribeDBClusters warning:", err.message);
      }
    }

    if (resource === "all" || resource === "snapshots") {
      try {
        const res = await client.send(new DescribeDBSnapshotsCommand({}));
        result.snapshots =
          res.DBSnapshots?.map((s) => ({
            dbSnapshotIdentifier: s.DBSnapshotIdentifier,
            dbInstanceIdentifier: s.DBInstanceIdentifier,
            engine: s.Engine,
            allocatedStorage: s.AllocatedStorage,
            status: s.Status,
            snapshotCreateTime: s.SnapshotCreateTime,
          })) || [];
      } catch (err: any) {
        console.warn("DescribeDBSnapshots warning:", err.message);
      }
    }

    return NextResponse.json({
      success: true,
      endpoint: resolveEndpoint(endpoint),
      count: result.instances.length,
      data: result,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to query RDS service",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, endpoint } = body;
    const client = getRDSClient(endpoint);

    if (action === "create-instance") {
      const {
        dbInstanceIdentifier,
        engine = "postgres",
        engineVersion,
        dbInstanceClass = "db.t3.micro",
        masterUsername = "admin",
        masterUserPassword,
        allocatedStorage = 20,
      } = body;

      if (!dbInstanceIdentifier || !dbInstanceIdentifier.trim()) {
        return NextResponse.json(
          { success: false, error: "dbInstanceIdentifier is required" },
          { status: 400 }
        );
      }

      const res = await client.send(
        new CreateDBInstanceCommand({
          DBInstanceIdentifier: dbInstanceIdentifier.trim(),
          Engine: engine,
          EngineVersion: engineVersion || undefined,
          DBInstanceClass: dbInstanceClass,
          MasterUsername: masterUsername,
          MasterUserPassword: masterUserPassword || "FlociSecret123!",
          AllocatedStorage: Number(allocatedStorage) || 20,
        })
      );

      return NextResponse.json({
        success: true,
        message: `DB Instance '${dbInstanceIdentifier}' created`,
        data: res.DBInstance,
      });
    }

    if (action === "delete-instance") {
      const { dbInstanceIdentifier, skipFinalSnapshot = true } = body;
      if (!dbInstanceIdentifier) {
        return NextResponse.json(
          { success: false, error: "dbInstanceIdentifier is required" },
          { status: 400 }
        );
      }

      await client.send(
        new DeleteDBInstanceCommand({
          DBInstanceIdentifier: dbInstanceIdentifier,
          SkipFinalSnapshot: skipFinalSnapshot,
        })
      );

      return NextResponse.json({
        success: true,
        message: `DB Instance '${dbInstanceIdentifier}' deleted`,
      });
    }

    if (action === "reboot-instance") {
      const { dbInstanceIdentifier } = body;
      if (!dbInstanceIdentifier) {
        return NextResponse.json(
          { success: false, error: "dbInstanceIdentifier is required" },
          { status: 400 }
        );
      }

      await client.send(
        new RebootDBInstanceCommand({
          DBInstanceIdentifier: dbInstanceIdentifier,
        })
      );

      return NextResponse.json({
        success: true,
        message: `DB Instance '${dbInstanceIdentifier}' reboot initiated`,
      });
    }

    if (action === "create-snapshot") {
      const { dbInstanceIdentifier, dbSnapshotIdentifier } = body;
      if (!dbInstanceIdentifier || !dbSnapshotIdentifier) {
        return NextResponse.json(
          { success: false, error: "dbInstanceIdentifier and dbSnapshotIdentifier are required" },
          { status: 400 }
        );
      }

      const res = await client.send(
        new CreateDBSnapshotCommand({
          DBInstanceIdentifier: dbInstanceIdentifier,
          DBSnapshotIdentifier: dbSnapshotIdentifier.trim(),
        })
      );

      return NextResponse.json({
        success: true,
        message: `Snapshot '${dbSnapshotIdentifier}' created`,
        data: res.DBSnapshot,
      });
    }

    if (action === "delete-snapshot") {
      const { dbSnapshotIdentifier } = body;
      if (!dbSnapshotIdentifier) {
        return NextResponse.json(
          { success: false, error: "dbSnapshotIdentifier is required" },
          { status: 400 }
        );
      }

      await client.send(
        new DeleteDBSnapshotCommand({
          DBSnapshotIdentifier: dbSnapshotIdentifier,
        })
      );

      return NextResponse.json({
        success: true,
        message: `Snapshot '${dbSnapshotIdentifier}' deleted`,
      });
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to execute RDS action" },
      { status: 500 }
    );
  }
}
