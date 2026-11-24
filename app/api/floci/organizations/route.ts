import { NextRequest, NextResponse } from "next/server";
import {
  DescribeOrganizationCommand,
  CreateOrganizationCommand,
  ListAccountsCommand,
  CreateAccountCommand,
  CloseAccountCommand,
  ListRootsCommand,
  ListOrganizationalUnitsForParentCommand,
  CreateOrganizationalUnitCommand,
  ListPoliciesCommand,
} from "@aws-sdk/client-organizations";
import { getOrganizationsClient } from "@/lib/floci-client";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const endpoint = searchParams.get("endpoint") || undefined;

    const client = getOrganizationsClient(endpoint);

    const [orgRes, accRes, rootsRes, polRes] = await Promise.allSettled([
      client.send(new DescribeOrganizationCommand({})),
      client.send(new ListAccountsCommand({})),
      client.send(new ListRootsCommand({})),
      client.send(new ListPoliciesCommand({ Filter: "SERVICE_CONTROL_POLICY" })),
    ]);

    const organization =
      orgRes.status === "fulfilled" ? orgRes.value.Organization || null : null;
    const accounts =
      accRes.status === "fulfilled" ? accRes.value.Accounts || [] : [];
    const roots =
      rootsRes.status === "fulfilled" ? rootsRes.value.Roots || [] : [];
    const policies =
      polRes.status === "fulfilled" ? polRes.value.Policies || [] : [];

    let ous: any[] = [];
    if (roots.length > 0 && roots[0].Id) {
      try {
        const ouRes = await client.send(
          new ListOrganizationalUnitsForParentCommand({ ParentId: roots[0].Id })
        );
        ous = ouRes.OrganizationalUnits || [];
      } catch {
        // ignore
      }
    }

    return NextResponse.json({
      organization,
      accounts,
      roots,
      organizationalUnits: ous,
      policies,
      count: accounts.length,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch Organizations data" },
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

    const client = getOrganizationsClient(endpoint);

    if (action === "create_org") {
      const res = await client.send(
        new CreateOrganizationCommand({ FeatureSet: "ALL" })
      );
      return NextResponse.json({ success: true, organization: res.Organization });
    }

    if (action === "create_account") {
      const res = await client.send(
        new CreateAccountCommand({
          AccountName: body.accountName,
          Email: body.email,
        })
      );
      return NextResponse.json({
        success: true,
        status: res.CreateAccountStatus,
      });
    }

    if (action === "close_account") {
      await client.send(
        new CloseAccountCommand({ AccountId: body.accountId })
      );
      return NextResponse.json({ success: true });
    }

    if (action === "create_ou") {
      const res = await client.send(
        new CreateOrganizationalUnitCommand({
          ParentId: body.parentId,
          Name: body.name,
        })
      );
      return NextResponse.json({
        success: true,
        organizationalUnit: res.OrganizationalUnit,
      });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Organizations operation failed" },
      { status: 500 }
    );
  }
}
