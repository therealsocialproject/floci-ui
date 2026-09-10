import { NextRequest, NextResponse } from "next/server";
import {
  ListUsersCommand,
  ListRolesCommand,
  ListGroupsCommand,
  ListPoliciesCommand,
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
