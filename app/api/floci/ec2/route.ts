import { NextRequest, NextResponse } from "next/server";
import {
  DescribeInstancesCommand,
  StartInstancesCommand,
  StopInstancesCommand,
  TerminateInstancesCommand,
  RunInstancesCommand,
  ModifyInstanceAttributeCommand,
  DescribeSecurityGroupsCommand,
  AuthorizeSecurityGroupIngressCommand,
  RevokeSecurityGroupIngressCommand,
  DescribeImagesCommand,
  CreateImageCommand,
  DeregisterImageCommand,
  DescribeVolumesCommand,
  _InstanceType,
} from "@aws-sdk/client-ec2";
import { getEC2Client, resolveEndpoint } from "@/lib/floci-client";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const endpoint = searchParams.get("endpoint") || undefined;
  const view = searchParams.get("view");

  try {
    const client = getEC2Client(endpoint);

    // View: Security Groups
    if (view === "security_groups") {
      const groupId = searchParams.get("groupId");
      const command = new DescribeSecurityGroupsCommand({
        GroupIds: groupId ? [groupId] : undefined,
      });
      const response = await client.send(command);
      return NextResponse.json({
        success: true,
        endpoint: resolveEndpoint(endpoint),
        data: response.SecurityGroups || [],
      });
    }

    // View: AMI Images / Backups
    if (view === "images") {
      const command = new DescribeImagesCommand({});
      const response = await client.send(command);
      return NextResponse.json({
        success: true,
        endpoint: resolveEndpoint(endpoint),
        data: response.Images || [],
      });
    }

    // View: Volumes
    if (view === "volumes") {
      const instanceId = searchParams.get("instanceId");
      const command = new DescribeVolumesCommand({
        Filters: instanceId
          ? [{ Name: "attachment.instance-id", Values: [instanceId] }]
          : undefined,
      });
      const response = await client.send(command);
      return NextResponse.json({
        success: true,
        endpoint: resolveEndpoint(endpoint),
        data: response.Volumes || [],
      });
    }

    // Default: Describe Instances
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
              publicDns: inst.PublicDnsName || "-",
              privateDns: inst.PrivateDnsName || "-",
              availabilityZone: inst.Placement?.AvailabilityZone,
              vpcId: inst.VpcId,
              subnetId: inst.SubnetId,
              imageId: inst.ImageId,
              keyName: inst.KeyName,
              platform: inst.PlatformDetails || inst.Platform,
              architecture: inst.Architecture,
              launchTime: inst.LaunchTime,
              iamInstanceProfile: inst.IamInstanceProfile?.Arn || "-",
              blockDeviceMappings: inst.BlockDeviceMappings || [],
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
        error: error.message || "Failed to describe EC2 resources",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const {
    action,
    instanceId,
    endpoint,
    name,
    instanceType,
    workload,
    imageId,
    description,
    groupId,
    ipProtocol,
    fromPort,
    toPort,
    cidrIp,
  } = body;

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

    if (action === "modify_instance_type") {
      if (!instanceId || !instanceType) {
        return NextResponse.json(
          { success: false, error: "Missing instanceId or instanceType" },
          { status: 400 }
        );
      }
      res = await client.send(
        new ModifyInstanceAttributeCommand({
          InstanceId: instanceId,
          InstanceType: { Value: instanceType },
        })
      );
      return NextResponse.json({ success: true, action, result: res });
    }

    if (action === "create_image") {
      if (!instanceId) {
        return NextResponse.json(
          { success: false, error: "Missing instanceId" },
          { status: 400 }
        );
      }
      res = await client.send(
        new CreateImageCommand({
          InstanceId: instanceId,
          Name: name || `backup-${instanceId}-${Date.now()}`,
          Description: description || "AMI backup created from Floci UI",
        })
      );
      return NextResponse.json({ success: true, action, result: res });
    }

    if (action === "deregister_image") {
      if (!imageId) {
        return NextResponse.json(
          { success: false, error: "Missing imageId" },
          { status: 400 }
        );
      }
      res = await client.send(
        new DeregisterImageCommand({
          ImageId: imageId,
        })
      );
      return NextResponse.json({ success: true, action, result: res });
    }

    if (action === "authorize_security_group_ingress") {
      if (!groupId) {
        return NextResponse.json(
          { success: false, error: "Missing groupId" },
          { status: 400 }
        );
      }
      res = await client.send(
        new AuthorizeSecurityGroupIngressCommand({
          GroupId: groupId,
          IpPermissions: [
            {
              IpProtocol: ipProtocol || "tcp",
              FromPort: fromPort !== undefined && fromPort !== "" ? Number(fromPort) : undefined,
              ToPort: toPort !== undefined && toPort !== "" ? Number(toPort) : undefined,
              IpRanges: [{ CidrIp: cidrIp || "0.0.0.0/0" }],
            },
          ],
        })
      );
      return NextResponse.json({ success: true, action, result: res });
    }

    if (action === "revoke_security_group_ingress") {
      if (!groupId) {
        return NextResponse.json(
          { success: false, error: "Missing groupId" },
          { status: 400 }
        );
      }
      res = await client.send(
        new RevokeSecurityGroupIngressCommand({
          GroupId: groupId,
          IpPermissions: [
            {
              IpProtocol: ipProtocol || "tcp",
              FromPort: fromPort !== undefined && fromPort !== "" ? Number(fromPort) : undefined,
              ToPort: toPort !== undefined && toPort !== "" ? Number(toPort) : undefined,
              IpRanges: [{ CidrIp: cidrIp || "0.0.0.0/0" }],
            },
          ],
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
