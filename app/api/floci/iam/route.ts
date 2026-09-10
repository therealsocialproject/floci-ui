import { NextRequest, NextResponse } from "next/server";
import {
  ListUsersCommand,
  ListRolesCommand,
  ListGroupsCommand,
  ListPoliciesCommand,
  CreateUserCommand,
  DeleteUserCommand,
  CreateRoleCommand,
  DeleteRoleCommand,
  CreateGroupCommand,
  DeleteGroupCommand,
  CreatePolicyCommand,
  DeletePolicyCommand,
} from "@aws-sdk/client-iam";
import { getIAMClient, resolveEndpoint } from "@/lib/floci-client";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const endpoint = searchParams.get("endpoint") || undefined;
  const resource = searchParams.get("resource") || "all";

  try {
    const client = getIAMClient(endpoint);
    const result: any = {};

    if (resource === "all" || resource === "users") {
      const usersRes = await client.send(new ListUsersCommand({}));
      result.users =
        usersRes.Users?.map((u) => ({
          userName: u.UserName,
          userId: u.UserId,
          arn: u.Arn,
          createDate: u.CreateDate,
        })) || [];
    }

    if (resource === "all" || resource === "roles") {
      const rolesRes = await client.send(new ListRolesCommand({}));
      result.roles =
        rolesRes.Roles?.map((r) => ({
          roleName: r.RoleName,
          roleId: r.RoleId,
          arn: r.Arn,
          createDate: r.CreateDate,
          description: r.Description || "-",
        })) || [];
    }

    if (resource === "all" || resource === "groups") {
      const groupsRes = await client.send(new ListGroupsCommand({}));
      result.groups =
        groupsRes.Groups?.map((g) => ({
          groupName: g.GroupName,
          groupId: g.GroupId,
          arn: g.Arn,
          createDate: g.CreateDate,
        })) || [];
    }

    if (resource === "all" || resource === "policies") {
      const policiesRes = await client.send(new ListPoliciesCommand({ Scope: "All" }));
      result.policies =
        policiesRes.Policies?.map((p) => ({
          policyName: p.PolicyName,
          policyId: p.PolicyId,
          arn: p.Arn,
          attachmentCount: p.AttachmentCount || 0,
        })) || [];
    }

    return NextResponse.json({
      success: true,
      endpoint: resolveEndpoint(endpoint),
      data: result,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to query IAM service",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, endpoint } = body;
    const client = getIAMClient(endpoint);

    if (action === "create-user") {
      const { userName } = body;
      if (!userName || !userName.trim()) {
        return NextResponse.json({ success: false, error: "userName is required" }, { status: 400 });
      }
      const res = await client.send(new CreateUserCommand({ UserName: userName.trim() }));
      return NextResponse.json({ success: true, message: `User '${userName}' created`, data: res.User });
    }

    if (action === "delete-user") {
      const { userName } = body;
      if (!userName) {
        return NextResponse.json({ success: false, error: "userName is required" }, { status: 400 });
      }
      await client.send(new DeleteUserCommand({ UserName: userName }));
      return NextResponse.json({ success: true, message: `User '${userName}' deleted` });
    }

    if (action === "create-role") {
      const { roleName, description, assumeRolePolicyDocument } = body;
      if (!roleName || !roleName.trim()) {
        return NextResponse.json({ success: false, error: "roleName is required" }, { status: 400 });
      }
      const defaultTrustPolicy = JSON.stringify({
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Principal: { Service: "ec2.amazonaws.com" },
            Action: "sts:AssumeRole",
          },
        ],
      });

      const res = await client.send(
        new CreateRoleCommand({
          RoleName: roleName.trim(),
          Description: description?.trim() || undefined,
          AssumeRolePolicyDocument: assumeRolePolicyDocument || defaultTrustPolicy,
        })
      );
      return NextResponse.json({ success: true, message: `Role '${roleName}' created`, data: res.Role });
    }

    if (action === "delete-role") {
      const { roleName } = body;
      if (!roleName) {
        return NextResponse.json({ success: false, error: "roleName is required" }, { status: 400 });
      }
      await client.send(new DeleteRoleCommand({ RoleName: roleName }));
      return NextResponse.json({ success: true, message: `Role '${roleName}' deleted` });
    }

    if (action === "create-group") {
      const { groupName } = body;
      if (!groupName || !groupName.trim()) {
        return NextResponse.json({ success: false, error: "groupName is required" }, { status: 400 });
      }
      const res = await client.send(new CreateGroupCommand({ GroupName: groupName.trim() }));
      return NextResponse.json({ success: true, message: `Group '${groupName}' created`, data: res.Group });
    }

    if (action === "delete-group") {
      const { groupName } = body;
      if (!groupName) {
        return NextResponse.json({ success: false, error: "groupName is required" }, { status: 400 });
      }
      await client.send(new DeleteGroupCommand({ GroupName: groupName }));
      return NextResponse.json({ success: true, message: `Group '${groupName}' deleted` });
    }

    if (action === "create-policy") {
      const { policyName, description, policyDocument } = body;
      if (!policyName || !policyName.trim()) {
        return NextResponse.json({ success: false, error: "policyName is required" }, { status: 400 });
      }
      const defaultPolicyDoc = JSON.stringify({
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Action: "*",
            Resource: "*",
          },
        ],
      });

      const res = await client.send(
        new CreatePolicyCommand({
          PolicyName: policyName.trim(),
          Description: description?.trim() || undefined,
          PolicyDocument: policyDocument || defaultPolicyDoc,
        })
      );
      return NextResponse.json({ success: true, message: `Policy '${policyName}' created`, data: res.Policy });
    }

    if (action === "delete-policy") {
      const { policyArn } = body;
      if (!policyArn) {
        return NextResponse.json({ success: false, error: "policyArn is required" }, { status: 400 });
      }
      await client.send(new DeletePolicyCommand({ PolicyArn: policyArn }));
      return NextResponse.json({ success: true, message: `Policy deleted` });
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to execute IAM action" },
      { status: 500 }
    );
  }
}
