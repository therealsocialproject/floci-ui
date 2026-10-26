"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Radio,
  RefreshCw,
  Plus,
  Trash2,
  Search,
  CheckCircle2,
  AlertCircle,
  X,
  Code,
  Send,
  Link as LinkIcon,
  Bell,
  Layers,
  Copy,
  Check,
} from "lucide-react";
import { useEndpoint } from "@/components/EndpointProvider";
import { useCloudTheme } from "@/components/CloudThemeContext";
import { ResourceDrawer } from "@/components/ResourceDrawer";

export default function SNSPage() {
  const { endpoint, isConnected } = useEndpoint();
  const { cloudMode, serviceLabels } = useCloudTheme();

  const [activeTab, setActiveTab] = useState<"topics" | "subscriptions">("topics");
  const [topics, setTopics] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [mounted, setMounted] = useState(false);
  const [copiedArn, setCopiedArn] = useState<string | null>(null);

  // Modals
  const [isCreateTopicOpen, setIsCreateTopicOpen] = useState(false);
  const [newTopicName, setNewTopicName] = useState("");
  const [newTopicIsFifo, setNewTopicIsFifo] = useState(false);

  const [isPublishOpen, setIsPublishOpen] = useState(false);
  const [publishTargetTopic, setPublishTargetTopic] = useState<string>("");
  const [publishSubject, setPublishSubject] = useState("");
  const [publishMessage, setPublishMessage] = useState("");
  const [publishGroupId, setPublishGroupId] = useState("");
  const [publishDedupId, setPublishDedupId] = useState("");

  const [isSubscribeOpen, setIsSubscribeOpen] = useState(false);
  const [subTargetTopic, setSubTargetTopic] = useState("");
  const [subProtocol, setSubProtocol] = useState("sqs");
  const [subEndpoint, setSubEndpoint] = useState("");

  // Drawer
  const [inspectResource, setInspectResource] = useState<any>(null);

  // Notifications
  const [notification, setNotification] = useState<{ msg: string; isError?: boolean } | null>(null);

  const isAws = cloudMode === "aws";

  useEffect(() => {
    setMounted(true);
  }, []);

  const showNotification = (msg: string, isError = false) => {
    setNotification({ msg, isError });
    setTimeout(() => setNotification(null), 4000);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedArn(id);
    setTimeout(() => setCopiedArn(null), 2000);
  };

  const fetchTopics = async () => {
    try {
      const res = await fetch(`/api/floci/sns?endpoint=${encodeURIComponent(endpoint)}&action=list_topics`);
      const data = await res.json();
      if (res.ok) {
        setTopics(data.topics || []);
      } else {
        showNotification(data.error || "Failed to fetch SNS topics", true);
      }
    } catch (e: any) {
      showNotification(e.message || "Failed to fetch SNS topics", true);
    }
  };

  const fetchSubscriptions = async () => {
    try {
      const res = await fetch(`/api/floci/sns?endpoint=${encodeURIComponent(endpoint)}&action=subscriptions`);
      const data = await res.json();
      if (res.ok) {
        setSubscriptions(data.subscriptions || []);
      } else {
        showNotification(data.error || "Failed to fetch SNS subscriptions", true);
      }
    } catch (e: any) {
      showNotification(e.message || "Failed to fetch SNS subscriptions", true);
    }
  };

  const reloadData = async () => {
    setLoading(true);
    await Promise.all([fetchTopics(), fetchSubscriptions()]);
    setLoading(false);
  };

  useEffect(() => {
    if (isConnected) {
      reloadData();
    }
  }, [endpoint, isConnected]);

  const handleCreateTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTopicName.trim()) return;

    try {
      const res = await fetch(`/api/floci/sns?endpoint=${encodeURIComponent(endpoint)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_topic",
          name: newTopicName.trim(),
          isFifo: newTopicIsFifo,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showNotification(`Topic "${newTopicName}" created successfully`);
        setIsCreateTopicOpen(false);
        setNewTopicName("");
        setNewTopicIsFifo(false);
        reloadData();
      } else {
        showNotification(data.error || "Failed to create topic", true);
      }
    } catch (e: any) {
      showNotification(e.message || "Failed to create topic", true);
    }
  };

  const handleDeleteTopic = async (topicArn: string) => {
    const topicName = topicArn.split(":").pop();
    if (!confirm(`Are you sure you want to delete topic "${topicName}"?`)) return;

    try {
      const res = await fetch(`/api/floci/sns?endpoint=${encodeURIComponent(endpoint)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete_topic",
          topicArn,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showNotification(`Topic deleted`);
        reloadData();
      } else {
        showNotification(data.error || "Failed to delete topic", true);
      }
    } catch (e: any) {
      showNotification(e.message || "Failed to delete topic", true);
    }
  };

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!publishTargetTopic || !publishMessage) return;

    try {
      const isFifo = publishTargetTopic.endsWith(".fifo");
      const res = await fetch(`/api/floci/sns?endpoint=${encodeURIComponent(endpoint)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "publish",
          topicArn: publishTargetTopic,
          subject: publishSubject.trim() || undefined,
          message: publishMessage,
          messageGroupId: isFifo ? (publishGroupId.trim() || "default-group") : undefined,
          messageDeduplicationId: isFifo && publishDedupId.trim() ? publishDedupId.trim() : undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showNotification(`Message published! Message ID: ${data.messageId}`);
        setIsPublishOpen(false);
        setPublishSubject("");
        setPublishMessage("");
        setPublishGroupId("");
        setPublishDedupId("");
      } else {
        showNotification(data.error || "Failed to publish message", true);
      }
    } catch (e: any) {
      showNotification(e.message || "Failed to publish message", true);
    }
  };

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subTargetTopic || !subEndpoint) return;

    try {
      const res = await fetch(`/api/floci/sns?endpoint=${encodeURIComponent(endpoint)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "subscribe",
          topicArn: subTargetTopic,
          protocol: subProtocol,
          endpointTarget: subEndpoint.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showNotification("Subscription created successfully");
        setIsSubscribeOpen(false);
        setSubEndpoint("");
        reloadData();
      } else {
        showNotification(data.error || "Failed to create subscription", true);
      }
    } catch (e: any) {
      showNotification(e.message || "Failed to create subscription", true);
    }
  };

  const handleUnsubscribe = async (subscriptionArn: string) => {
    if (subscriptionArn.includes("PendingConfirmation")) {
      showNotification("Cannot unsubscribe a pending confirmation subscription", true);
      return;
    }
    if (!confirm("Are you sure you want to delete this subscription?")) return;

    try {
      const res = await fetch(`/api/floci/sns?endpoint=${encodeURIComponent(endpoint)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "unsubscribe",
          subscriptionArn,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showNotification("Subscription deleted");
        reloadData();
      } else {
        showNotification(data.error || "Failed to unsubscribe", true);
      }
    } catch (e: any) {
      showNotification(e.message || "Failed to unsubscribe", true);
    }
  };

  const filteredTopics = topics.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.arn.toLowerCase().includes(search.toLowerCase())
  );

  const filteredSubscriptions = subscriptions.filter((s) =>
    (s.TopicArn || "").toLowerCase().includes(search.toLowerCase()) ||
    (s.Endpoint || "").toLowerCase().includes(search.toLowerCase()) ||
    (s.Protocol || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm shadow-xl border animate-in fade-in slide-in-from-bottom-2 ${
            notification.isError
              ? "bg-rose-950/90 text-rose-200 border-rose-800/80"
              : "bg-emerald-950/90 text-emerald-200 border-emerald-800/80"
          }`}
        >
          {notification.isError ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
          <span>{notification.msg}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Radio className="text-amber-500" size={24} />
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              {serviceLabels.sns}
            </h1>
            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">
              Pub/Sub
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Fully managed pub/sub messaging engine for decoupled microservices, distributed systems, and serverless applications.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={reloadData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border text-xs font-medium text-foreground hover:bg-muted transition-colors"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => {
              if (topics.length > 0 && !publishTargetTopic) {
                setPublishTargetTopic(topics[0].arn);
              }
              setIsPublishOpen(true);
            }}
            disabled={topics.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-amber-500/30 bg-amber-500/10 text-xs font-medium text-amber-400 hover:bg-amber-500/20 transition-colors disabled:opacity-50"
          >
            <Send size={14} />
            <span>Publish Message</span>
          </button>
          <button
            onClick={() => setIsCreateTopicOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-amber-500 text-slate-950 text-xs font-semibold hover:bg-amber-400 transition-colors shadow-sm"
          >
            <Plus size={14} />
            <span>Create Topic</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-4 border-b border-border">
        <button
          onClick={() => setActiveTab("topics")}
          className={`pb-2.5 text-xs font-semibold transition-colors border-b-2 ${
            activeTab === "topics"
              ? "border-amber-500 text-amber-400"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Topics ({topics.length})
        </button>
        <button
          onClick={() => setActiveTab("subscriptions")}
          className={`pb-2.5 text-xs font-semibold transition-colors border-b-2 ${
            activeTab === "subscriptions"
              ? "border-amber-500 text-amber-400"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Subscriptions ({subscriptions.length})
        </button>
      </div>

      {/* Filter and Search */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder={activeTab === "topics" ? "Filter topics by name or ARN..." : "Filter subscriptions..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-md bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>
      </div>

      {/* Content */}
      {activeTab === "topics" ? (
        <div className="border border-border rounded-lg overflow-hidden bg-card">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/50 border-b border-border text-muted-foreground">
              <tr>
                <th className="py-2.5 px-4 font-medium">Topic Name</th>
                <th className="py-2.5 px-4 font-medium">Type</th>
                <th className="py-2.5 px-4 font-medium">Topic ARN</th>
                <th className="py-2.5 px-4 font-medium">Subscriptions</th>
                <th className="py-2.5 px-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading && topics.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-muted-foreground">
                    <RefreshCw size={18} className="animate-spin inline-block mr-2" />
                    Loading topics...
                  </td>
                </tr>
              ) : filteredTopics.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-muted-foreground">
                    No topics found. Create a topic to start publishing events.
                  </td>
                </tr>
              ) : (
                filteredTopics.map((topic) => (
                  <tr key={topic.arn} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4 font-medium text-foreground">
                      <div className="flex items-center gap-2">
                        <Radio size={14} className="text-amber-500 shrink-0" />
                        <span>{topic.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {topic.isFifo ? (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                          FIFO
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          Standard
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-muted-foreground font-mono text-[11px]">
                      <div className="flex items-center gap-1.5 max-w-xs truncate">
                        <span className="truncate" title={topic.arn}>{topic.arn}</span>
                        <button
                          onClick={() => copyToClipboard(topic.arn, topic.arn)}
                          className="hover:text-foreground text-zinc-500 shrink-0"
                          title="Copy ARN"
                        >
                          {copiedArn === topic.arn ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                        </button>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-foreground">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold">{topic.subscriptionsConfirmed || 0}</span>
                        <span className="text-muted-foreground text-[11px]">confirmed</span>
                        {topic.subscriptionsPending > 0 && (
                          <span className="text-amber-400 text-[10px] bg-amber-500/10 px-1 rounded">
                            ({topic.subscriptionsPending} pending)
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setPublishTargetTopic(topic.arn);
                            setIsPublishOpen(true);
                          }}
                          className="p-1 rounded text-amber-400 hover:bg-amber-500/10 transition-colors"
                          title="Publish Message"
                        >
                          <Send size={14} />
                        </button>
                        <button
                          onClick={() => {
                            setSubTargetTopic(topic.arn);
                            setIsSubscribeOpen(true);
                          }}
                          className="p-1 rounded text-blue-400 hover:bg-blue-500/10 transition-colors"
                          title="Create Subscription"
                        >
                          <LinkIcon size={14} />
                        </button>
                        <button
                          onClick={() => setInspectResource(topic)}
                          className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                          title="Inspect Resource"
                        >
                          <Code size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteTopic(topic.arn)}
                          className="p-1 rounded text-rose-400 hover:bg-rose-500/10 transition-colors"
                          title="Delete Topic"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden bg-card">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/50 border-b border-border text-muted-foreground">
              <tr>
                <th className="py-2.5 px-4 font-medium">Protocol</th>
                <th className="py-2.5 px-4 font-medium">Endpoint</th>
                <th className="py-2.5 px-4 font-medium">Topic ARN</th>
                <th className="py-2.5 px-4 font-medium">Subscription ARN</th>
                <th className="py-2.5 px-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading && subscriptions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-muted-foreground">
                    <RefreshCw size={18} className="animate-spin inline-block mr-2" />
                    Loading subscriptions...
                  </td>
                </tr>
              ) : filteredSubscriptions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-muted-foreground">
                    No subscriptions found. Select a topic and create a subscription.
                  </td>
                </tr>
              ) : (
                filteredSubscriptions.map((sub, idx) => (
                  <tr key={sub.SubscriptionArn || idx} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4 font-medium uppercase text-amber-400">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 border border-amber-500/20">
                        {sub.Protocol}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-foreground max-w-xs truncate" title={sub.Endpoint}>
                      {sub.Endpoint}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-muted-foreground max-w-xs truncate" title={sub.TopicArn}>
                      {(sub.TopicArn || "").split(":").pop() || sub.TopicArn}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-muted-foreground max-w-xs truncate">
                      {sub.SubscriptionArn?.includes("PendingConfirmation") ? (
                        <span className="text-amber-400">Pending Confirmation</span>
                      ) : (
                        sub.SubscriptionArn
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setInspectResource(sub)}
                          className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                          title="Inspect Subscription"
                        >
                          <Code size={14} />
                        </button>
                        <button
                          onClick={() => handleUnsubscribe(sub.SubscriptionArn)}
                          disabled={sub.SubscriptionArn?.includes("PendingConfirmation")}
                          className="p-1 rounded text-rose-400 hover:bg-rose-500/10 transition-colors disabled:opacity-40"
                          title="Delete Subscription"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal: Create Topic */}
      {mounted &&
        isCreateTopicOpen &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-md p-6">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <h3 className="text-base font-bold text-foreground">Create SNS Topic</h3>
                <button
                  onClick={() => setIsCreateTopicOpen(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCreateTopic} className="space-y-4 mt-4 text-xs">
                <div>
                  <label className="block font-medium text-foreground mb-1">Topic Name</label>
                  <input
                    type="text"
                    required
                    placeholder="my-orders-topic"
                    value={newTopicName}
                    onChange={(e) => setNewTopicName(e.target.value)}
                    className="w-full px-3 py-2 rounded-md bg-zinc-950 border border-zinc-800 text-zinc-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Up to 256 characters. Can contain letters, numbers, hyphens, and underscores.
                  </p>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="fifo-checkbox"
                    checked={newTopicIsFifo}
                    onChange={(e) => setNewTopicIsFifo(e.target.checked)}
                    className="rounded border-zinc-800 text-amber-500 focus:ring-amber-500 bg-zinc-950"
                  />
                  <label htmlFor="fifo-checkbox" className="font-medium text-foreground cursor-pointer">
                    FIFO (First-In-First-Out) Topic
                  </label>
                </div>
                {newTopicIsFifo && (
                  <p className="text-[11px] text-purple-400 bg-purple-500/10 p-2 rounded border border-purple-500/20">
                    Topic name will automatically end with <code>.fifo</code>. Ensures strict message ordering and deduplication.
                  </p>
                )}

                <div className="flex justify-end gap-2 pt-4 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setIsCreateTopicOpen(false)}
                    className="px-3 py-1.5 rounded-md border border-border text-foreground hover:bg-muted font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-md bg-amber-500 text-slate-950 font-semibold hover:bg-amber-400 shadow-sm"
                  >
                    Create Topic
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* Modal: Publish Message */}
      {mounted &&
        isPublishOpen &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-lg p-6">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <h3 className="text-base font-bold text-foreground">Publish Message to Topic</h3>
                <button
                  onClick={() => setIsPublishOpen(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handlePublish} className="space-y-4 mt-4 text-xs">
                <div>
                  <label className="block font-medium text-foreground mb-1">Target Topic</label>
                  <select
                    value={publishTargetTopic}
                    onChange={(e) => setPublishTargetTopic(e.target.value)}
                    className="w-full px-3 py-2 rounded-md bg-zinc-950 border border-zinc-800 text-zinc-100 focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono text-[11px]"
                  >
                    {topics.map((t) => (
                      <option key={t.arn} value={t.arn}>
                        {t.name} ({t.arn})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-foreground mb-1">Subject (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Order #1234 Processed"
                    value={publishSubject}
                    onChange={(e) => setPublishSubject(e.target.value)}
                    className="w-full px-3 py-2 rounded-md bg-zinc-950 border border-zinc-800 text-zinc-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block font-medium text-foreground mb-1">Message Body</label>
                  <textarea
                    rows={5}
                    required
                    placeholder='{"event": "order_created", "orderId": "ORD-99182"}'
                    value={publishMessage}
                    onChange={(e) => setPublishMessage(e.target.value)}
                    className="w-full px-3 py-2 rounded-md bg-zinc-950 border border-zinc-800 text-zinc-100 font-mono focus:outline-none focus:ring-1 focus:ring-amber-500 leading-relaxed"
                  />
                </div>

                {publishTargetTopic.endsWith(".fifo") && (
                  <div className="grid grid-cols-2 gap-3 p-3 bg-purple-500/10 border border-purple-500/20 rounded-md">
                    <div>
                      <label className="block font-medium text-purple-300 mb-1">Message Group ID</label>
                      <input
                        type="text"
                        placeholder="group-1"
                        value={publishGroupId}
                        onChange={(e) => setPublishGroupId(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded bg-zinc-950 border border-zinc-800 text-zinc-100 focus:outline-none focus:ring-1 focus:ring-purple-400 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-purple-300 mb-1">Deduplication ID</label>
                      <input
                        type="text"
                        placeholder="Optional (hash computed if empty)"
                        value={publishDedupId}
                        onChange={(e) => setPublishDedupId(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded bg-zinc-950 border border-zinc-800 text-zinc-100 focus:outline-none focus:ring-1 focus:ring-purple-400 font-mono"
                      />
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-4 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setIsPublishOpen(false)}
                    className="px-3 py-1.5 rounded-md border border-border text-foreground hover:bg-muted font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-md bg-amber-500 text-slate-950 font-semibold hover:bg-amber-400 shadow-sm"
                  >
                    Publish Message
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* Modal: Create Subscription */}
      {mounted &&
        isSubscribeOpen &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-md p-6">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <h3 className="text-base font-bold text-foreground">Create Subscription</h3>
                <button
                  onClick={() => setIsSubscribeOpen(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSubscribe} className="space-y-4 mt-4 text-xs">
                <div>
                  <label className="block font-medium text-foreground mb-1">Topic</label>
                  <select
                    value={subTargetTopic}
                    onChange={(e) => setSubTargetTopic(e.target.value)}
                    className="w-full px-3 py-2 rounded-md bg-zinc-950 border border-zinc-800 text-zinc-100 focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono text-[11px]"
                  >
                    {topics.map((t) => (
                      <option key={t.arn} value={t.arn}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-foreground mb-1">Protocol</label>
                  <select
                    value={subProtocol}
                    onChange={(e) => setSubProtocol(e.target.value)}
                    className="w-full px-3 py-2 rounded-md bg-zinc-950 border border-zinc-800 text-zinc-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  >
                    <option value="sqs">Amazon SQS</option>
                    <option value="lambda">AWS Lambda</option>
                    <option value="email">Email</option>
                    <option value="http">HTTP</option>
                    <option value="https">HTTPS</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-foreground mb-1">
                    Endpoint Target {subProtocol === "sqs" && "(Queue ARN)"} {subProtocol === "email" && "(Email Address)"}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={
                      subProtocol === "sqs"
                        ? "arn:aws:sqs:us-east-1:000000000000:my-queue"
                        : subProtocol === "email"
                        ? "admin@example.com"
                        : "http://example.com/webhook"
                    }
                    value={subEndpoint}
                    onChange={(e) => setSubEndpoint(e.target.value)}
                    className="w-full px-3 py-2 rounded-md bg-zinc-950 border border-zinc-800 text-zinc-100 focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono text-[11px]"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setIsSubscribeOpen(false)}
                    className="px-3 py-1.5 rounded-md border border-border text-foreground hover:bg-muted font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-md bg-amber-500 text-slate-950 font-semibold hover:bg-amber-400 shadow-sm"
                  >
                    Subscribe
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* Resource Inspection Drawer */}
      <ResourceDrawer
        isOpen={Boolean(inspectResource)}
        onClose={() => setInspectResource(null)}
        title={inspectResource?.name || inspectResource?.TopicArn || "Resource Details"}
        subtitle={inspectResource?.arn || inspectResource?.SubscriptionArn}
        badge="SNS"
        data={inspectResource}
      />
    </div>
  );
}
