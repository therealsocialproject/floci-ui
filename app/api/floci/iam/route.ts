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
  GetLoginProfileCommand,
  CreateLoginProfileCommand,
  UpdateLoginProfileCommand,
  DeleteLoginProfileCommand,
  ListAccessKeysCommand,
  CreateAccessKeyCommand,
  DeleteAccessKeyCommand,
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

    if (resource === "credentials") {
      const userName = searchParams.get("userName");
      if (!userName) {
        return NextResponse.json({ success: false, error: "userName is required for credentials" }, { status: 400 });
      }
      let hasPassword = false;
      try {
        const loginProfile = await client.send(new GetLoginProfileCommand({ UserName: userName }));
        hasPassword = !!loginProfile.LoginProfile;
      } catch (e: any) {
        hasPassword = false;
      }

      let accessKeys: any[] = [];
      try {
        const keysRes = await client.send(new ListAccessKeysCommand({ UserName: userName }));
        accessKeys =
          keysRes.AccessKeyMetadata?.map((k) => ({
            accessKeyId: k.AccessKeyId,
            status: k.Status,
            createDate: k.CreateDate,
          })) || [];
      } catch (e: any) {
        accessKeys = [];
      }

      result.credentials = {
        userName,
        hasPassword,
        accessKeys,
      };
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
      const { userName, password, createAccessKey } = body;
      if (!userName || !userName.trim()) {
        return NextResponse.json({ success: false, error: "userName is required" }, { status: 400 });
      }
      const res = await client.send(new CreateUserCommand({ UserName: userName.trim() }));
      let initialKey = null;
      let passwordCreated = false;

      if (password && password.trim()) {
        try {
          await client.send(
            new CreateLoginProfileCommand({
              UserName: userName.trim(),
              Password: password.trim(),
              PasswordResetRequired: false,
            })
          );
          passwordCreated = true;
        } catch (e: any) {
          console.warn("Could not create initial login profile:", e.message);
        }
      }

      if (createAccessKey) {
        try {
          const keyRes = await client.send(new CreateAccessKeyCommand({ UserName: userName.trim() }));
          initialKey = {
            accessKeyId: keyRes.AccessKey?.AccessKeyId,
            secretAccessKey: keyRes.AccessKey?.SecretAccessKey,
          };
        } catch (e: any) {
          console.warn("Could not create initial access key:", e.message);
        }
      }

      return NextResponse.json({
        success: true,
        message: `User '${userName}' created`,
        data: {
          ...res.User,
          passwordCreated,
          initialKey,
        },
      });
    }

    if (action === "delete-user") {
      const { userName } = body;
      if (!userName) {
        return NextResponse.json({ success: false, error: "userName is required" }, { status: 400 });
      }

      // 1. Delete login profile if present to avoid DeleteConflict
      try {
        await client.send(new DeleteLoginProfileCommand({ UserName: userName }));
      } catch (e) {
        // Ignore if no login profile
      }

      // 2. Delete access keys if present
      try {
        const keysRes = await client.send(new ListAccessKeysCommand({ UserName: userName }));
        for (const k of keysRes.AccessKeyMetadata || []) {
          if (k.AccessKeyId) {
            await client.send(new DeleteAccessKeyCommand({ UserName: userName, AccessKeyId: k.AccessKeyId }));
          }
        }
      } catch (e) {
        // Ignore
      }

      await client.send(new DeleteUserCommand({ UserName: userName }));
      return NextResponse.json({ success: true, message: `User '${userName}' deleted` });
    }

    if (action === "set-password") {
      const { userName, password } = body;
      if (!userName || !password) {
        return NextResponse.json({ success: false, error: "userName and password are required" }, { status: 400 });
      }

      try {
        await client.send(
          new CreateLoginProfileCommand({
            UserName: userName,
            Password: password,
            PasswordResetRequired: false,
          })
        );
      } catch (err: any) {
        if (err.name === "EntityAlreadyExistsException" || err.message?.includes("already exists")) {
          await client.send(
            new UpdateLoginProfileCommand({
              UserName: userName,
              Password: password,
              PasswordResetRequired: false,
            })
          );
        } else {
          throw err;
        }
      }

      return NextResponse.json({ success: true, message: `Password for '${userName}' set successfully` });
    }

    if (action === "delete-password") {
      const { userName } = body;
      if (!userName) {
        return NextResponse.json({ success: false, error: "userName is required" }, { status: 400 });
      }
      await client.send(new DeleteLoginProfileCommand({ UserName: userName }));
      return NextResponse.json({ success: true, message: `Password for '${userName}' removed` });
    }

    if (action === "create-access-key") {
      const { userName } = body;
      if (!userName) {
        return NextResponse.json({ success: false, error: "userName is required" }, { status: 400 });
      }
      const res = await client.send(new CreateAccessKeyCommand({ UserName: userName }));
      return NextResponse.json({
        success: true,
        message: `Access key generated for '${userName}'`,
        accessKey: {
          accessKeyId: res.AccessKey?.AccessKeyId,
          secretAccessKey: res.AccessKey?.SecretAccessKey,
          status: res.AccessKey?.Status,
          createDate: res.AccessKey?.CreateDate,
        },
      });
    }

    if (action === "delete-access-key") {
      const { userName, accessKeyId } = body;
      if (!userName || !accessKeyId) {
        return NextResponse.json({ success: false, error: "userName and accessKeyId are required" }, { status: 400 });
      }
      await client.send(new DeleteAccessKeyCommand({ UserName: userName, AccessKeyId: accessKeyId }));
      return NextResponse.json({ success: true, message: `Access key '${accessKeyId}' deleted` });
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
