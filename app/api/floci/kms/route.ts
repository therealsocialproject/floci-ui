import { NextRequest, NextResponse } from "next/server";
import {
  ListKeysCommand,
  DescribeKeyCommand,
  CreateKeyCommand,
  EncryptCommand,
  DecryptCommand,
} from "@aws-sdk/client-kms";
import { getKMSClient } from "@/lib/floci-client";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const endpoint = searchParams.get("endpoint") || undefined;
    const client = getKMSClient(endpoint);

    const listCmd = new ListKeysCommand({ Limit: 100 });
    const listRes = await client.send(listCmd);
    const keyEntries = listRes.Keys || [];

    const keys = await Promise.all(
      keyEntries.map(async (k) => {
        try {
          const descCmd = new DescribeKeyCommand({ KeyId: k.KeyId });
          const descRes = await descCmd && await client.send(descCmd);
          const meta = descRes?.KeyMetadata;
          return {
            keyId: k.KeyId || "",
            arn: meta?.Arn || k.KeyArn || "",
            description: meta?.Description || "",
            enabled: meta?.Enabled ?? true,
            keyState: meta?.KeyState || "Enabled",
            keyUsage: meta?.KeyUsage || "ENCRYPT_DECRYPT",
            keySpec: meta?.KeySpec || "SYMMETRIC_DEFAULT",
            creationDate: meta?.CreationDate ? new Date(meta.CreationDate).toISOString() : "",
            raw: meta || k,
          };
        } catch {
          return {
            keyId: k.KeyId || "",
            arn: k.KeyArn || "",
            description: "",
            enabled: true,
            keyState: "Enabled",
            keyUsage: "ENCRYPT_DECRYPT",
            keySpec: "SYMMETRIC_DEFAULT",
            creationDate: "",
            raw: k,
          };
        }
      })
    );

    return NextResponse.json({ keys });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch KMS keys" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const endpoint = searchParams.get("endpoint") || undefined;
    const body = await req.json();
    const { action, description, keyId, plaintext, ciphertextBlob } = body;

    const client = getKMSClient(endpoint);

    if (action === "create") {
      const cmd = new CreateKeyCommand({
        Description: description || "Floci Managed KMS Key",
        KeyUsage: "ENCRYPT_DECRYPT",
      });
      const res = await client.send(cmd);
      return NextResponse.json({
        success: true,
        keyId: res.KeyMetadata?.KeyId,
        arn: res.KeyMetadata?.Arn,
      });
    }

    if (action === "encrypt") {
      const plaintextBuffer = Buffer.from(plaintext || "", "utf-8");
      const cmd = new EncryptCommand({
        KeyId: keyId,
        Plaintext: plaintextBuffer,
      });
      const res = await client.send(cmd);
      const cipherB64 = res.CiphertextBlob
        ? Buffer.from(res.CiphertextBlob).toString("base64")
        : "";
      return NextResponse.json({
        success: true,
        ciphertext: cipherB64,
        keyId: res.KeyId,
      });
    }

    if (action === "decrypt") {
      const cipherBuffer = Buffer.from(ciphertextBlob || "", "base64");
      const cmd = new DecryptCommand({
        CiphertextBlob: cipherBuffer,
        KeyId: keyId || undefined,
      });
      const res = await client.send(cmd);
      const decryptedText = res.Plaintext
        ? Buffer.from(res.Plaintext).toString("utf-8")
        : "";
      return NextResponse.json({
        success: true,
        plaintext: decryptedText,
        keyId: res.KeyId,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "KMS operation failed" },
      { status: 500 }
    );
  }
}
