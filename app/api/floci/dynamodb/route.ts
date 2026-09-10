import { NextRequest, NextResponse } from "next/server";
import { ListTablesCommand, DescribeTableCommand, ScanCommand } from "@aws-sdk/client-dynamodb";
import { getDynamoDBClient, resolveEndpoint } from "@/lib/floci-client";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const endpoint = searchParams.get("endpoint") || undefined;
  const table = searchParams.get("table") || undefined;

  try {
    const client = getDynamoDBClient(endpoint);

    if (table) {
      const descRes = await client.send(new DescribeTableCommand({ TableName: table }));
      const scanRes = await client.send(new ScanCommand({ TableName: table, Limit: 50 }));

      return NextResponse.json({
        success: true,
        endpoint: resolveEndpoint(endpoint),
        table: descRes.Table,
        items: scanRes.Items || [],
        itemCount: scanRes.Count || 0,
      });
    }

    const command = new ListTablesCommand({});
    const response = await client.send(command);

    return NextResponse.json({
      success: true,
      endpoint: resolveEndpoint(endpoint),
      count: response.TableNames?.length || 0,
      tables: response.TableNames || [],
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to query DynamoDB service",
      },
      { status: 500 }
    );
  }
}
