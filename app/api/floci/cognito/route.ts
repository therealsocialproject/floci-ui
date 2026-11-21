import { NextRequest, NextResponse } from "next/server";
import {
  ListUserPoolsCommand,
  CreateUserPoolCommand,
  DeleteUserPoolCommand,
  ListUsersCommand,
  AdminCreateUserCommand,
  AdminDeleteUserCommand,
  ListUserPoolClientsCommand,
  CreateUserPoolClientCommand,
  DeleteUserPoolClientCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { getCognitoClient } from "@/lib/floci-client";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const endpoint = searchParams.get("endpoint") || undefined;
    const action = searchParams.get("action") || "list";
    const userPoolId = searchParams.get("userPoolId") || undefined;

    const client = getCognitoClient(endpoint);

    if (action === "details" && userPoolId) {
      const [usersRes, clientsRes] = await Promise.allSettled([
        client.send(new ListUsersCommand({ UserPoolId: userPoolId, Limit: 60 })),
        client.send(
          new ListUserPoolClientsCommand({ UserPoolId: userPoolId, MaxResults: 60 })
        ),
      ]);
      return NextResponse.json({
        users: usersRes.status === "fulfilled" ? usersRes.value.Users || [] : [],
        clients:
          clientsRes.status === "fulfilled"
            ? clientsRes.value.UserPoolClients || []
            : [],
      });
    }

    const res = await client.send(new ListUserPoolsCommand({ MaxResults: 60 }));
    const userPools = res.UserPools || [];
    return NextResponse.json({
      userPools,
      count: userPools.length,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch Cognito resources" },
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

    const client = getCognitoClient(endpoint);

    if (action === "create_pool") {
      const res = await client.send(
        new CreateUserPoolCommand({ PoolName: body.poolName })
      );
      return NextResponse.json({ success: true, userPool: res.UserPool });
    }

    if (action === "delete_pool") {
      await client.send(
        new DeleteUserPoolCommand({ UserPoolId: body.userPoolId })
      );
      return NextResponse.json({ success: true });
    }

    if (action === "create_user") {
      const attrs = [];
      if (body.email) {
        attrs.push({ Name: "email", Value: body.email });
        attrs.push({ Name: "email_verified", Value: "true" });
      }
      const res = await client.send(
        new AdminCreateUserCommand({
          UserPoolId: body.userPoolId,
          Username: body.username,
          TemporaryPassword: body.temporaryPassword || undefined,
          UserAttributes: attrs.length > 0 ? attrs : undefined,
        })
      );
      return NextResponse.json({ success: true, user: res.User });
    }

    if (action === "delete_user") {
      await client.send(
        new AdminDeleteUserCommand({
          UserPoolId: body.userPoolId,
          Username: body.username,
        })
      );
      return NextResponse.json({ success: true });
    }

    if (action === "create_client") {
      const res = await client.send(
        new CreateUserPoolClientCommand({
          UserPoolId: body.userPoolId,
          ClientName: body.clientName,
          GenerateSecret: Boolean(body.generateSecret),
          ExplicitAuthFlows: [
            "ALLOW_USER_PASSWORD_AUTH",
            "ALLOW_REFRESH_TOKEN_AUTH",
            "ALLOW_ADMIN_USER_PASSWORD_AUTH",
          ],
        })
      );
      return NextResponse.json({ success: true, client: res.UserPoolClient });
    }

    if (action === "delete_client") {
      await client.send(
        new DeleteUserPoolClientCommand({
          UserPoolId: body.userPoolId,
          ClientId: body.clientId,
        })
      );
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Cognito operation failed" },
      { status: 500 }
    );
  }
}
