import { NextRequest, NextResponse } from "next/server";
import {
  ListTopicsCommand,
  CreateTopicCommand,
  DeleteTopicCommand,
  GetTopicAttributesCommand,
  ListSubscriptionsCommand,
  ListSubscriptionsByTopicCommand,
  SubscribeCommand,
  UnsubscribeCommand,
  PublishCommand,
} from "@aws-sdk/client-sns";
import { getSNSClient } from "@/lib/floci-client";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const endpoint = searchParams.get("endpoint") || undefined;
    const action = searchParams.get("action") || "list_topics";
    const topicArn = searchParams.get("topicArn") || undefined;

    const client = getSNSClient(endpoint);

    if (action === "subscriptions") {
      let subscriptions: any[] = [];
      if (topicArn) {
        const cmd = new ListSubscriptionsByTopicCommand({ TopicArn: topicArn });
        const res = await client.send(cmd);
        subscriptions = res.Subscriptions || [];
      } else {
        const cmd = new ListSubscriptionsCommand({});
        const res = await client.send(cmd);
        subscriptions = res.Subscriptions || [];
      }
      return NextResponse.json({ subscriptions });
    }

    // Default: List topics
    const cmd = new ListTopicsCommand({});
    const res = await client.send(cmd);
    const topicArns = res.Topics || [];

    const topics = await Promise.all(
      topicArns.map(async (t) => {
        const arn = t.TopicArn || "";
        const name = arn.split(":").pop() || arn;
        try {
          const attrRes = await client.send(new GetTopicAttributesCommand({ TopicArn: arn }));
          const attrs = attrRes.Attributes || {};
          return {
            arn,
            name,
            displayName: attrs.DisplayName || "",
            subscriptionsConfirmed: parseInt(attrs.SubscriptionsConfirmed || "0", 10),
            subscriptionsPending: parseInt(attrs.SubscriptionsPending || "0", 10),
            isFifo: name.endsWith(".fifo"),
            attributes: attrs,
          };
        } catch {
          return {
            arn,
            name,
            displayName: "",
            subscriptionsConfirmed: 0,
            subscriptionsPending: 0,
            isFifo: name.endsWith(".fifo"),
            attributes: {},
          };
        }
      })
    );

    return NextResponse.json({ topics });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch SNS resources" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const endpoint = searchParams.get("endpoint") || undefined;
    const body = await req.json();
    const {
      action,
      name,
      isFifo,
      topicArn,
      protocol,
      endpointTarget,
      message,
      subject,
      messageGroupId,
      messageDeduplicationId,
      subscriptionArn,
    } = body;

    const client = getSNSClient(endpoint);

    if (action === "create_topic") {
      let finalName = (name || "").trim();
      const attributes: Record<string, string> = {};
      if (isFifo) {
        if (!finalName.endsWith(".fifo")) finalName += ".fifo";
        attributes.FifoTopic = "true";
        attributes.ContentBasedDeduplication = "true";
      }
      const cmd = new CreateTopicCommand({
        Name: finalName,
        Attributes: Object.keys(attributes).length > 0 ? attributes : undefined,
      });
      const res = await client.send(cmd);
      return NextResponse.json({ success: true, topicArn: res.TopicArn });
    }

    if (action === "delete_topic") {
      const cmd = new DeleteTopicCommand({ TopicArn: topicArn });
      await client.send(cmd);
      return NextResponse.json({ success: true });
    }

    if (action === "subscribe") {
      const cmd = new SubscribeCommand({
        TopicArn: topicArn,
        Protocol: protocol,
        Endpoint: endpointTarget,
        ReturnSubscriptionArn: true,
      });
      const res = await client.send(cmd);
      return NextResponse.json({ success: true, subscriptionArn: res.SubscriptionArn });
    }

    if (action === "unsubscribe") {
      const cmd = new UnsubscribeCommand({
        SubscriptionArn: subscriptionArn,
      });
      await client.send(cmd);
      return NextResponse.json({ success: true });
    }

    if (action === "publish") {
      const cmd = new PublishCommand({
        TopicArn: topicArn,
        Message: message,
        Subject: subject || undefined,
        MessageGroupId: messageGroupId || undefined,
        MessageDeduplicationId: messageDeduplicationId || undefined,
      });
      const res = await client.send(cmd);
      return NextResponse.json({ success: true, messageId: res.MessageId });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to execute SNS action" },
      { status: 500 }
    );
  }
}
