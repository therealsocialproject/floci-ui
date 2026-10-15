import { NextRequest, NextResponse } from "next/server";
import {
  ListQueuesCommand,
  GetQueueAttributesCommand,
  CreateQueueCommand,
  DeleteQueueCommand,
  PurgeQueueCommand,
  SendMessageCommand,
  ReceiveMessageCommand,
  DeleteMessageCommand,
} from "@aws-sdk/client-sqs";
import { getSQSClient } from "@/lib/floci-client";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const endpoint = searchParams.get("endpoint") || undefined;
    const action = searchParams.get("action") || "list";
    const queueUrl = searchParams.get("queueUrl");

    const client = getSQSClient(endpoint);

    if (action === "messages" && queueUrl) {
      const receiveCmd = new ReceiveMessageCommand({
        QueueUrl: queueUrl,
        MaxNumberOfMessages: 10,
        AttributeNames: ["All"],
        MessageAttributeNames: ["All"],
        VisibilityTimeout: 5,
        WaitTimeSeconds: 1,
      });
      const res = await client.send(receiveCmd);
      return NextResponse.json({
        messages: res.Messages || [],
      });
    }

    // Default: list queues with attributes
    const listCmd = new ListQueuesCommand({});
    const listRes = await client.send(listCmd);
    const queueUrls = listRes.QueueUrls || [];

    const queues = await Promise.all(
      queueUrls.map(async (url) => {
        try {
          const attrCmd = new GetQueueAttributesCommand({
            QueueUrl: url,
            AttributeNames: ["All"],
          });
          const attrRes = await client.send(attrCmd);
          const name = url.split("/").pop() || url;
          return {
            name,
            url,
            arn: attrRes.Attributes?.QueueArn || "",
            messages: parseInt(attrRes.Attributes?.ApproximateNumberOfMessages || "0", 10),
            messagesNotVisible: parseInt(attrRes.Attributes?.ApproximateNumberOfMessagesNotVisible || "0", 10),
            createdTimestamp: attrRes.Attributes?.CreatedTimestamp
              ? new Date(parseInt(attrRes.Attributes.CreatedTimestamp, 10) * 1000).toISOString()
              : undefined,
            isFifo: name.endsWith(".fifo"),
            attributes: attrRes.Attributes || {},
          };
        } catch {
          const name = url.split("/").pop() || url;
          return {
            name,
            url,
            messages: 0,
            messagesNotVisible: 0,
            isFifo: name.endsWith(".fifo"),
            attributes: {},
          };
        }
      })
    );

    return NextResponse.json({ queues });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch SQS queues" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const endpoint = searchParams.get("endpoint") || undefined;
    const body = await req.json();
    const { action, queueName, queueUrl, messageBody, delaySeconds, receiptHandle, isFifo } = body;

    const client = getSQSClient(endpoint);

    if (action === "create") {
      let finalName = queueName;
      const attributes: Record<string, string> = {};
      if (isFifo) {
        if (!finalName.endsWith(".fifo")) finalName += ".fifo";
        attributes["FifoQueue"] = "true";
        attributes["ContentBasedDeduplication"] = "true";
      }
      const cmd = new CreateQueueCommand({
        QueueName: finalName,
        Attributes: attributes,
      });
      const res = await client.send(cmd);
      return NextResponse.json({ success: true, queueUrl: res.QueueUrl });
    }

    if (action === "send") {
      const cmd = new SendMessageCommand({
        QueueUrl: queueUrl,
        MessageBody: messageBody,
        DelaySeconds: delaySeconds ? Number(delaySeconds) : undefined,
        MessageGroupId: queueUrl.endsWith(".fifo") ? "floci-group" : undefined,
        MessageDeduplicationId: queueUrl.endsWith(".fifo") ? `dedup-${Date.now()}` : undefined,
      });
      const res = await client.send(cmd);
      return NextResponse.json({ success: true, messageId: res.MessageId });
    }

    if (action === "purge") {
      const cmd = new PurgeQueueCommand({ QueueUrl: queueUrl });
      await client.send(cmd);
      return NextResponse.json({ success: true });
    }

    if (action === "delete_message") {
      const cmd = new DeleteMessageCommand({
        QueueUrl: queueUrl,
        ReceiptHandle: receiptHandle,
      });
      await client.send(cmd);
      return NextResponse.json({ success: true });
    }

    if (action === "delete_queue") {
      const cmd = new DeleteQueueCommand({ QueueUrl: queueUrl });
      await client.send(cmd);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "SQS operation failed" },
      { status: 500 }
    );
  }
}
