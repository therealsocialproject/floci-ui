import { NextRequest, NextResponse } from "next/server";
import {
  ListDistributionsCommand,
  CreateDistributionCommand,
  DeleteDistributionCommand,
  GetDistributionConfigCommand,
  UpdateDistributionCommand,
  CreateInvalidationCommand,
  ListInvalidationsCommand,
  ListFunctionsCommand,
  ListKeyValueStoresCommand,
} from "@aws-sdk/client-cloudfront";
import { getCloudFrontClient } from "@/lib/floci-client";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const endpoint = searchParams.get("endpoint") || undefined;
    const action = searchParams.get("action") || "list";
    const distributionId = searchParams.get("distributionId") || undefined;

    const client = getCloudFrontClient(endpoint);

    if (action === "invalidations" && distributionId) {
      const res = await client.send(
        new ListInvalidationsCommand({ DistributionId: distributionId })
      );
      return NextResponse.json({
        invalidations: res.InvalidationList?.Items || [],
      });
    }

    const [distRes, fnRes, kvsRes] = await Promise.allSettled([
      client.send(new ListDistributionsCommand({})),
      client.send(new ListFunctionsCommand({})),
      client.send(new ListKeyValueStoresCommand({})),
    ]);

    const distributions =
      distRes.status === "fulfilled"
        ? distRes.value.DistributionList?.Items || []
        : [];
    const functions =
      fnRes.status === "fulfilled" ? fnRes.value.FunctionList?.Items || [] : [];
    const keyValueStores =
      kvsRes.status === "fulfilled"
        ? kvsRes.value.KeyValueStoreList?.Items || []
        : [];

    return NextResponse.json({
      distributions,
      functions,
      keyValueStores,
      count: distributions.length,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch CloudFront resources" },
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

    const client = getCloudFrontClient(endpoint);

    if (action === "create_distribution") {
      const originDomain = (body.originDomain || "example.s3.amazonaws.com").trim();
      const originId = body.originId || `origin-${Date.now()}`;
      const res = await client.send(
        new CreateDistributionCommand({
          DistributionConfig: {
            CallerReference: `floci-ui-${Date.now()}`,
            Comment: body.comment || "Created via Floci Console",
            Enabled: true,
            Origins: {
              Quantity: 1,
              Items: [
                {
                  Id: originId,
                  DomainName: originDomain,
                  CustomOriginConfig: {
                    HTTPPort: 80,
                    HTTPSPort: 443,
                    OriginProtocolPolicy: "https-only",
                  },
                },
              ],
            },
            DefaultCacheBehavior: {
              TargetOriginId: originId,
              ViewerProtocolPolicy: "redirect-to-https",
              ForwardedValues: {
                QueryString: false,
                Cookies: { Forward: "none" },
              },
              MinTTL: 0,
            },
          },
        })
      );
      return NextResponse.json({ success: true, distribution: res.Distribution });
    }

    if (action === "create_invalidation") {
      const paths: string[] = String(body.paths || "/*")
        .split(",")
        .map((p: string) => p.trim())
        .filter(Boolean);
      const res = await client.send(
        new CreateInvalidationCommand({
          DistributionId: body.distributionId,
          InvalidationBatch: {
            CallerReference: `floci-inv-${Date.now()}`,
            Paths: {
              Quantity: paths.length,
              Items: paths,
            },
          },
        })
      );
      return NextResponse.json({ success: true, invalidation: res.Invalidation });
    }

    if (action === "delete_distribution") {
      const cfgRes = await client.send(
        new GetDistributionConfigCommand({ Id: body.distributionId })
      );
      let etag = cfgRes.ETag;
      if (cfgRes.DistributionConfig?.Enabled) {
        const upd = await client.send(
          new UpdateDistributionCommand({
            Id: body.distributionId,
            IfMatch: etag,
            DistributionConfig: { ...cfgRes.DistributionConfig, Enabled: false },
          })
        );
        etag = upd.ETag || etag;
      }
      await client.send(
        new DeleteDistributionCommand({
          Id: body.distributionId,
          IfMatch: etag,
        })
      );
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "CloudFront operation failed" },
      { status: 500 }
    );
  }
}
