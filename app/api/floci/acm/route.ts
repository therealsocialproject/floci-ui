import { NextRequest, NextResponse } from "next/server";
import {
  ListCertificatesCommand,
  DescribeCertificateCommand,
  RequestCertificateCommand,
  DeleteCertificateCommand,
} from "@aws-sdk/client-acm";
import { getACMClient } from "@/lib/floci-client";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const endpoint = searchParams.get("endpoint") || undefined;

    const client = getACMClient(endpoint);
    const listRes = await client.send(new ListCertificatesCommand({}));
    const summaries = listRes.CertificateSummaryList || [];

    const certificates = await Promise.all(
      summaries.map(async (s) => {
        if (!s.CertificateArn) return s;
        try {
          const desc = await client.send(
            new DescribeCertificateCommand({ CertificateArn: s.CertificateArn })
          );
          return desc.Certificate || s;
        } catch {
          return s;
        }
      })
    );

    return NextResponse.json({
      certificates,
      count: certificates.length,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch ACM certificates" },
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

    const client = getACMClient(endpoint);

    if (action === "request_certificate") {
      const sans = String(body.subjectAlternativeNames || "")
        .split(",")
        .map((s: string) => s.trim())
        .filter(Boolean);
      const res = await client.send(
        new RequestCertificateCommand({
          DomainName: body.domainName,
          ValidationMethod: body.validationMethod || "DNS",
          SubjectAlternativeNames: sans.length > 0 ? sans : undefined,
        })
      );
      return NextResponse.json({
        success: true,
        certificateArn: res.CertificateArn,
      });
    }

    if (action === "delete_certificate") {
      await client.send(
        new DeleteCertificateCommand({ CertificateArn: body.certificateArn })
      );
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "ACM operation failed" },
      { status: 500 }
    );
  }
}
