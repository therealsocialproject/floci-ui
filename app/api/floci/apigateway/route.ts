import { NextRequest, NextResponse } from "next/server";
import {
  GetRestApisCommand,
  CreateRestApiCommand,
  DeleteRestApiCommand,
  GetResourcesCommand,
  GetStagesCommand as GetRestStagesCommand,
} from "@aws-sdk/client-api-gateway";
import {
  GetApisCommand,
  CreateApiCommand,
  DeleteApiCommand,
  GetRoutesCommand,
  GetStagesCommand as GetHttpStagesCommand,
} from "@aws-sdk/client-apigatewayv2";
import {
  getAPIGatewayClient,
  getAPIGatewayV2Client,
  resolveEndpoint,
} from "@/lib/floci-client";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const endpoint = searchParams.get("endpoint") || undefined;
  const resource = searchParams.get("resource") || "all";
  const apiId = searchParams.get("apiId");
  const apiType = searchParams.get("apiType") || "REST";

  try {
    const restClient = getAPIGatewayClient(endpoint);
    const v2Client = getAPIGatewayV2Client(endpoint);

    if (resource === "routes" && apiId) {
      if (apiType === "REST") {
        const [resourcesRes, stagesRes] = await Promise.allSettled([
          restClient.send(new GetResourcesCommand({ restApiId: apiId })),
          restClient.send(new GetRestStagesCommand({ restApiId: apiId })),
        ]);

        const resources =
          resourcesRes.status === "fulfilled"
            ? resourcesRes.value.items?.map((r) => ({
                id: r.id,
                path: r.path,
                methods: r.resourceMethods ? Object.keys(r.resourceMethods) : [],
              })) || []
            : [];

        const stages =
          stagesRes.status === "fulfilled"
            ? stagesRes.value.item?.map((s) => s.stageName) || []
            : [];

        return NextResponse.json({
          success: true,
          apiId,
          apiType: "REST",
          resources,
          stages,
        });
      } else {
        const [routesRes, stagesRes] = await Promise.allSettled([
          v2Client.send(new GetRoutesCommand({ ApiId: apiId })),
          v2Client.send(new GetHttpStagesCommand({ ApiId: apiId })),
        ]);

        const routes =
          routesRes.status === "fulfilled"
            ? routesRes.value.Items?.map((r) => ({
                id: r.RouteId,
                routeKey: r.RouteKey,
                target: r.Target,
                authorizationType: r.AuthorizationType,
              })) || []
            : [];

        const stages =
          stagesRes.status === "fulfilled"
            ? stagesRes.value.Items?.map((s) => s.StageName) || []
            : [];

        return NextResponse.json({
          success: true,
          apiId,
          apiType: "HTTP",
          routes,
          stages,
        });
      }
    }

    // Default: fetch all APIs (REST + HTTP)
    const [restApisRes, v2ApisRes] = await Promise.allSettled([
      restClient.send(new GetRestApisCommand({})),
      v2Client.send(new GetApisCommand({})),
    ]);

    const restApis =
      restApisRes.status === "fulfilled"
        ? restApisRes.value.items?.map((a) => ({
            id: a.id,
            name: a.name,
            description: a.description || "",
            createdDate: a.createdDate,
            protocol: "REST",
            type: "REST",
            endpointUrl: `${resolveEndpoint(endpoint)}/restapis/${a.id}/_user_request_`,
          })) || []
        : [];

    const v2Apis =
      v2ApisRes.status === "fulfilled"
        ? v2ApisRes.value.Items?.map((a) => ({
            id: a.ApiId,
            name: a.Name,
            description: a.Description || "",
            createdDate: a.CreatedDate,
            protocol: a.ProtocolType || "HTTP",
            type: "HTTP",
            endpointUrl: a.ApiEndpoint || `${resolveEndpoint(endpoint)}/${a.ApiId}`,
          })) || []
        : [];

    const allApis = [...restApis, ...v2Apis].sort((a, b) =>
      (a.name || "").localeCompare(b.name || "")
    );

    return NextResponse.json({
      success: true,
      endpoint: resolveEndpoint(endpoint),
      count: allApis.length,
      apis: allApis,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to query API Gateway service",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, endpoint } = body;
    const restClient = getAPIGatewayClient(endpoint);
    const v2Client = getAPIGatewayV2Client(endpoint);

    if (action === "create-api") {
      const { name, description, protocol = "REST" } = body;
      if (!name || !name.trim()) {
        return NextResponse.json(
          { success: false, error: "API Name is required" },
          { status: 400 }
        );
      }

      if (protocol.toUpperCase() === "HTTP") {
        const res = await v2Client.send(
          new CreateApiCommand({
            Name: name.trim(),
            ProtocolType: "HTTP",
            Description: description?.trim() || undefined,
          })
        );
        return NextResponse.json({
          success: true,
          message: `HTTP API '${name}' created`,
          api: {
            id: res.ApiId,
            name: res.Name,
            protocol: "HTTP",
            type: "HTTP",
          },
        });
      } else {
        const res = await restClient.send(
          new CreateRestApiCommand({
            name: name.trim(),
            description: description?.trim() || undefined,
          })
        );
        return NextResponse.json({
          success: true,
          message: `REST API '${name}' created`,
          api: {
            id: res.id,
            name: res.name,
            protocol: "REST",
            type: "REST",
          },
        });
      }
    }

    if (action === "delete-api") {
      const { apiId, type = "REST" } = body;
      if (!apiId) {
        return NextResponse.json(
          { success: false, error: "apiId is required" },
          { status: 400 }
        );
      }

      if (type === "HTTP") {
        await v2Client.send(new DeleteApiCommand({ ApiId: apiId }));
      } else {
        await restClient.send(new DeleteRestApiCommand({ restApiId: apiId }));
      }

      return NextResponse.json({
        success: true,
        message: `API '${apiId}' deleted successfully`,
      });
    }

    if (action === "test-invoke") {
      const { url, method = "GET", headers = {}, payload } = body;
      if (!url) {
        return NextResponse.json(
          { success: false, error: "Invocation URL is required" },
          { status: 400 }
        );
      }

      const startTime = Date.now();
      try {
        const fetchOptions: RequestInit = {
          method,
          headers: {
            ...headers,
          },
          cache: "no-store",
        };

        if (payload && ["POST", "PUT", "PATCH"].includes(method.toUpperCase())) {
          fetchOptions.body = typeof payload === "string" ? payload : JSON.stringify(payload);
          if (!fetchOptions.headers || !("Content-Type" in fetchOptions.headers)) {
            (fetchOptions.headers as any)["Content-Type"] = "application/json";
          }
        }

        const invokeRes = await fetch(url, fetchOptions);
        const duration = Date.now() - startTime;
        const responseText = await invokeRes.text();

        let parsedBody = responseText;
        try {
          parsedBody = JSON.parse(responseText);
        } catch {
          // Keep as string
        }

        const resHeaders: Record<string, string> = {};
        invokeRes.headers.forEach((val, key) => {
          resHeaders[key] = val;
        });

        return NextResponse.json({
          success: true,
          status: invokeRes.status,
          statusText: invokeRes.statusText,
          durationMs: duration,
          headers: resHeaders,
          body: parsedBody,
        });
      } catch (invokeErr: any) {
        return NextResponse.json({
          success: false,
          error: invokeErr.message || "Request failed",
          durationMs: Date.now() - startTime,
        });
      }
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to execute API Gateway action" },
      { status: 500 }
    );
  }
}
