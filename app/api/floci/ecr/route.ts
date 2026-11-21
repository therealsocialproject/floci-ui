import { NextRequest, NextResponse } from "next/server";
import {
  DescribeRepositoriesCommand,
  CreateRepositoryCommand,
  DeleteRepositoryCommand,
  DescribeImagesCommand,
  BatchDeleteImageCommand,
} from "@aws-sdk/client-ecr";
import { getECRClient } from "@/lib/floci-client";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const endpoint = searchParams.get("endpoint") || undefined;
    const action = searchParams.get("action") || "list";
    const repositoryName = searchParams.get("repositoryName") || undefined;

    const client = getECRClient(endpoint);

    if (action === "images" && repositoryName) {
      const res = await client.send(
        new DescribeImagesCommand({ repositoryName })
      );
      return NextResponse.json({ images: res.imageDetails || [] });
    }

    const res = await client.send(new DescribeRepositoriesCommand({}));
    const repositories = res.repositories || [];
    return NextResponse.json({
      repositories,
      count: repositories.length,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch ECR repositories" },
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

    const client = getECRClient(endpoint);

    if (action === "create_repository") {
      const res = await client.send(
        new CreateRepositoryCommand({
          repositoryName: body.repositoryName,
          imageTagMutability: body.imageTagMutability || "MUTABLE",
        })
      );
      return NextResponse.json({ success: true, repository: res.repository });
    }

    if (action === "delete_repository") {
      await client.send(
        new DeleteRepositoryCommand({
          repositoryName: body.repositoryName,
          force: true,
        })
      );
      return NextResponse.json({ success: true });
    }

    if (action === "delete_image") {
      await client.send(
        new BatchDeleteImageCommand({
          repositoryName: body.repositoryName,
          imageIds: [
            body.imageDigest
              ? { imageDigest: body.imageDigest }
              : { imageTag: body.imageTag },
          ],
        })
      );
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "ECR operation failed" },
      { status: 500 }
    );
  }
}
