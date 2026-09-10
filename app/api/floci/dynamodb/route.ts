import { NextRequest, NextResponse } from "next/server";
import {
  ListTablesCommand,
  DescribeTableCommand,
  ScanCommand,
  CreateTableCommand,
  DeleteTableCommand,
  PutItemCommand,
  DeleteItemCommand,
  ScalarAttributeType,
  KeySchemaElement,
  AttributeDefinition,
} from "@aws-sdk/client-dynamodb";
import { getDynamoDBClient, resolveEndpoint } from "@/lib/floci-client";

function toAttributeValue(val: any): any {
  if (typeof val === "string") return { S: val };
  if (typeof val === "number") return { N: val.toString() };
  if (typeof val === "boolean") return { BOOL: val };
  if (val === null || val === undefined) return { NULL: true };
  if (Array.isArray(val)) {
    return { L: val.map(toAttributeValue) };
  }
  if (typeof val === "object") {
    const keys = Object.keys(val);
    if (keys.length === 1 && ["S", "N", "B", "SS", "NS", "BS", "M", "L", "NULL", "BOOL"].includes(keys[0])) {
      return val;
    }
    const m: Record<string, any> = {};
    for (const [k, v] of Object.entries(val)) {
      m[k] = toAttributeValue(v);
    }
    return { M: m };
  }
  return { S: String(val) };
}

function toAttributeMap(obj: Record<string, any>): Record<string, any> {
  const map: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    map[k] = toAttributeValue(v);
  }
  return map;
}

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
      data: response.TableNames || [],
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, endpoint } = body;
    const client = getDynamoDBClient(endpoint);

    if (action === "create-table") {
      const { tableName, partitionKey, partitionKeyType = "S", sortKey, sortKeyType = "S" } = body;
      if (!tableName || !partitionKey) {
        return NextResponse.json(
          { success: false, error: "tableName and partitionKey are required" },
          { status: 400 }
        );
      }

      const attributeDefinitions: AttributeDefinition[] = [
        { AttributeName: partitionKey.trim(), AttributeType: partitionKeyType as ScalarAttributeType },
      ];
      const keySchema: KeySchemaElement[] = [
        { AttributeName: partitionKey.trim(), KeyType: "HASH" },
      ];

      if (sortKey && sortKey.trim()) {
        attributeDefinitions.push({
          AttributeName: sortKey.trim(),
          AttributeType: (sortKeyType || "S") as ScalarAttributeType,
        });
        keySchema.push({
          AttributeName: sortKey.trim(),
          KeyType: "RANGE",
        });
      }

      const res = await client.send(
        new CreateTableCommand({
          TableName: tableName.trim(),
          AttributeDefinitions: attributeDefinitions,
          KeySchema: keySchema,
          BillingMode: "PAY_PER_REQUEST",
        })
      );

      return NextResponse.json({
        success: true,
        message: `Table '${tableName}' created successfully`,
        data: res.TableDescription,
      });
    }

    if (action === "delete-table") {
      const { tableName } = body;
      if (!tableName) {
        return NextResponse.json({ success: false, error: "tableName required" }, { status: 400 });
      }
      await client.send(new DeleteTableCommand({ TableName: tableName }));
      return NextResponse.json({ success: true, message: `Table '${tableName}' deleted successfully` });
    }

    if (action === "put-item") {
      const { tableName, item } = body;
      if (!tableName || !item || typeof item !== "object") {
        return NextResponse.json(
          { success: false, error: "tableName and item object required" },
          { status: 400 }
        );
      }
      const attributeMap = toAttributeMap(item);
      await client.send(
        new PutItemCommand({
          TableName: tableName,
          Item: attributeMap,
        })
      );
      return NextResponse.json({ success: true, message: `Item added to '${tableName}' successfully` });
    }

    if (action === "delete-item") {
      const { tableName, key } = body;
      if (!tableName || !key || typeof key !== "object") {
        return NextResponse.json(
          { success: false, error: "tableName and key object required" },
          { status: 400 }
        );
      }
      const keyMap = toAttributeMap(key);
      await client.send(
        new DeleteItemCommand({
          TableName: tableName,
          Key: keyMap,
        })
      );
      return NextResponse.json({ success: true, message: `Item deleted from '${tableName}' successfully` });
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to execute DynamoDB action" },
      { status: 500 }
    );
  }
}
