import { NextRequest, NextResponse } from "next/server";
import { ListBucketsCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { getS3Client, resolveEndpoint } from "@/lib/floci-client";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const endpoint = searchParams.get("endpoint") || undefined;
  const bucket = searchParams.get("bucket") || undefined;

  try {
    const client = getS3Client(endpoint);

    if (bucket) {
      const command = new ListObjectsV2Command({ Bucket: bucket });
      const response = await client.send(command);
      const objects =
        response.Contents?.map((obj) => ({
          key: obj.Key,
          size: obj.Size,
          lastModified: obj.LastModified,
          storageClass: obj.StorageClass,
        })) || [];

      return NextResponse.json({
        success: true,
        endpoint: resolveEndpoint(endpoint),
        bucket,
        count: objects.length,
        data: objects,
      });
    }

    const command = new ListBucketsCommand({});
    const response = await client.send(command);
    const buckets =
      response.Buckets?.map((b) => ({
        name: b.Name,
        creationDate: b.CreationDate,
      })) || [];

    return NextResponse.json({
      success: true,
      endpoint: resolveEndpoint(endpoint),
      count: buckets.length,
      data: buckets,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to query S3 service",
      },
      { status: 500 }
    );
  }
}
