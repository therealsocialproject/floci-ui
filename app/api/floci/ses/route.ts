import { NextRequest, NextResponse } from "next/server";
import {
  ListIdentitiesCommand,
  GetIdentityVerificationAttributesCommand,
  VerifyEmailIdentityCommand,
  VerifyDomainIdentityCommand,
  DeleteIdentityCommand,
  SendEmailCommand,
  ListTemplatesCommand,
} from "@aws-sdk/client-ses";
import { getSESClient } from "@/lib/floci-client";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const endpoint = searchParams.get("endpoint") || undefined;

    const client = getSESClient(endpoint);

    const [idRes, tplRes] = await Promise.allSettled([
      client.send(new ListIdentitiesCommand({ MaxItems: 100 })),
      client.send(new ListTemplatesCommand({ MaxItems: 50 })),
    ]);

    const rawIdentities =
      idRes.status === "fulfilled" ? idRes.value.Identities || [] : [];
    const templates =
      tplRes.status === "fulfilled" ? tplRes.value.TemplatesMetadata || [] : [];

    let verificationAttrs: Record<string, any> = {};
    if (rawIdentities.length > 0) {
      try {
        const attrRes = await client.send(
          new GetIdentityVerificationAttributesCommand({
            Identities: rawIdentities,
          })
        );
        verificationAttrs = attrRes.VerificationAttributes || {};
      } catch {
        // ignore
      }
    }

    const identities = rawIdentities.map((id) => ({
      identity: id,
      type: id.includes("@") ? "EmailAddress" : "Domain",
      status: verificationAttrs[id]?.VerificationStatus || "Success",
      token: verificationAttrs[id]?.VerificationToken || null,
    }));

    return NextResponse.json({
      identities,
      templates,
      count: identities.length,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch SES resources" },
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

    const client = getSESClient(endpoint);

    if (action === "verify_email") {
      await client.send(
        new VerifyEmailIdentityCommand({ EmailAddress: body.email })
      );
      return NextResponse.json({ success: true });
    }

    if (action === "verify_domain") {
      const res = await client.send(
        new VerifyDomainIdentityCommand({ Domain: body.domain })
      );
      return NextResponse.json({
        success: true,
        verificationToken: res.VerificationToken,
      });
    }

    if (action === "delete_identity") {
      await client.send(
        new DeleteIdentityCommand({ Identity: body.identity })
      );
      return NextResponse.json({ success: true });
    }

    if (action === "send_email") {
      const toAddresses = String(body.to || "")
        .split(",")
        .map((s: string) => s.trim())
        .filter(Boolean);

      const res = await client.send(
        new SendEmailCommand({
          Source: body.source,
          Destination: { ToAddresses: toAddresses },
          Message: {
            Subject: { Data: body.subject || "(No subject)" },
            Body: {
              Text: { Data: body.textBody || "" },
              ...(body.htmlBody ? { Html: { Data: body.htmlBody } } : {}),
            },
          },
        })
      );
      return NextResponse.json({ success: true, messageId: res.MessageId });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "SES operation failed" },
      { status: 500 }
    );
  }
}
