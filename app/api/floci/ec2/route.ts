import { NextRequest, NextResponse } from "next/server";
import {
  DescribeInstancesCommand,
  StartInstancesCommand,
  StopInstancesCommand,
  TerminateInstancesCommand,
  RunInstancesCommand,
  _InstanceType,
} from "@aws-sdk/client-ec2";
import { getEC2Client, resolveEndpoint } from "@/lib/floci-client";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const endpoint = searchParams.get("endpoint") || undefined;

  try {
    const client = getEC2Client(endpoint);
    const command = new DescribeInstancesCommand({});
    const response = await client.send(command);

    const instances: any[] = [];
    if (response.Reservations) {
      for (const res of response.Reservations) {
        if (res.Instances) {
          for (const inst of res.Instances) {
            instances.push({
              instanceId: inst.InstanceId,
              instanceType: inst.InstanceType,
              state: inst.State?.Name || "unknown",
              publicIp: inst.PublicIpAddress || "-",
              privateIp: inst.PrivateIpAddress || "-",
              launchTime: inst.LaunchTime,
              iamInstanceProfile: inst.IamInstanceProfile?.Arn || "-",
              securityGroups:
                inst.SecurityGroups?.map((sg) => ({
                  groupId: sg.GroupId,
                  groupName: sg.GroupName,
                })) || [],
              tags:
                inst.Tags?.reduce((acc: Record<string, string>, tag) => {
                  if (tag.Key && tag.Value) acc[tag.Key] = tag.Value;
                  return acc;
                }, {}) || {},
            });
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      endpoint: resolveEndpoint(endpoint),
      count: instances.length,
      data: instances,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to describe EC2 instances",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { action, instanceId, endpoint, name, instanceType, workload, imageId } = body;

  if (!action) {
    return NextResponse.json(
      { success: false, error: "Missing action" },
      { status: 400 }
    );
  }

  try {
    const client = getEC2Client(endpoint);
    let res: any;

    if (action === "launch") {
      const tags: { Key: string; Value: string }[] = [];
      if (name && name.trim()) {
        tags.push({ Key: "Name", Value: name.trim() });
      }
      if (workload && workload.trim()) {
        tags.push({ Key: "Workload", Value: workload.trim() });
      }

      res = await client.send(
        new RunInstancesCommand({
          ImageId: imageId || "ami-12345678",
          InstanceType: (instanceType || "t3.micro") as _InstanceType,
          MinCount: 1,
          MaxCount: 1,
          TagSpecifications:
            tags.length > 0
              ? [
                  {
                    ResourceType: "instance",
                    Tags: tags,
                  },
                ]
              : undefined,
        })
      );
      return NextResponse.json({ success: true, action, result: res });
    }

    if (!instanceId) {
      return NextResponse.json(
        { success: false, error: "Missing instanceId" },
        { status: 400 }
      );
    }

    if (action === "start") {
      res = await client.send(new StartInstancesCommand({ InstanceIds: [instanceId] }));
    } else if (action === "stop") {
      res = await client.send(new StopInstancesCommand({ InstanceIds: [instanceId] }));
    } else if (action === "terminate") {
      res = await client.send(new TerminateInstancesCommand({ InstanceIds: [instanceId] }));
    } else {
      return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
    }

    return NextResponse.json({ success: true, action, result: res });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to execute EC2 action" },
      { status: 500 }
    );
  }
}
