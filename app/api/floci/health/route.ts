import { NextRequest, NextResponse } from "next/server";
import { fetchFlociHealth, resolveEndpoint } from "@/lib/floci-client";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const endpoint = searchParams.get("endpoint") || undefined;
  const target = resolveEndpoint(endpoint);

  try {
    const health = await fetchFlociHealth(target);
    return NextResponse.json({
      success: true,
      endpoint: target,
      data: health,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        endpoint: target,
        error: error.message || "Failed to reach Floci endpoint",
      },
      { status: 502 }
    );
  }
}
