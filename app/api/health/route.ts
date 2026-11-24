import { NextRequest, NextResponse } from "next/server";
import { fetchFlociHealth, resolveEndpoint } from "@/lib/floci-client";

export const dynamic = "force-dynamic";

const CONSOLE_INFO = {
  name: "floci-ui",
  version: "1.7.0",
};

/**
 * Floci Console Contract v1/v2 health endpoint (GET /api/health).
 * Returns HTTP 200 with status: "ok" when the Floci emulator is reachable,
 * or HTTP 200 with status: "unavailable" + error details when unreachable.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const endpointParam = searchParams.get("endpoint") || undefined;
  const target = resolveEndpoint(endpointParam);

  try {
    const health = await fetchFlociHealth(target);
    return NextResponse.json({
      status: "ok",
      endpoint: target,
      error: null,
      console: CONSOLE_INFO,
      emulator: {
        version: health.version || null,
        edition: health.edition || null,
        cloud: health.cloud || process.env.FLOCI_CLOUD || "aws",
      },
    });
  } catch (error: any) {
    return NextResponse.json({
      status: "unavailable",
      endpoint: target,
      error: error?.message || "Failed to reach Floci endpoint",
      console: CONSOLE_INFO,
    });
  }
}
