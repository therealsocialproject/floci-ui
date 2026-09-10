import { NextRequest, NextResponse } from "next/server";
import {
  ListBucketsCommand,
  ListObjectsV2Command,
  CreateBucketCommand,
  DeleteBucketCommand,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, endpoint, bucket, key, content } = body;
    const client = getS3Client(endpoint);

    if (action === "create-bucket") {
      if (!bucket || typeof bucket !== "string" || !bucket.trim()) {
        return NextResponse.json({ success: false, error: "Valid bucket name required" }, { status: 400 });
      }
      await client.send(new CreateBucketCommand({ Bucket: bucket.trim() }));
      return NextResponse.json({ success: true, message: `Bucket '${bucket}' created successfully` });
    }

    if (action === "delete-bucket") {
      if (!bucket) {
        return NextResponse.json({ success: false, error: "Bucket name required" }, { status: 400 });
      }
      await client.send(new DeleteBucketCommand({ Bucket: bucket }));
      return NextResponse.json({ success: true, message: `Bucket '${bucket}' deleted successfully` });
    }

    if (action === "upload-object") {
      if (!bucket || !key || typeof key !== "string" || !key.trim()) {
        return NextResponse.json({ success: false, error: "Bucket and key are required" }, { status: 400 });
      }
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key.trim(),
          Body: Buffer.from(content || ""),
        })
      );
      return NextResponse.json({ success: true, message: `Object '${key}' uploaded successfully` });
    }

    if (action === "delete-object") {
      if (!bucket || !key) {
        return NextResponse.json({ success: false, error: "Bucket and key are required" }, { status: 400 });
      }
      await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
      return NextResponse.json({ success: true, message: `Object '${key}' deleted successfully` });
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to execute S3 action" },
      { status: 500 }
    );
  }
}
