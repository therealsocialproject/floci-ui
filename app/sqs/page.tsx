"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  MessageSquare,
  RefreshCw,
  Plus,
  Trash2,
  Send,
  Inbox,
  Eraser,
  Search,
  CheckCircle2,
  AlertCircle,
  X,
  Code,
  ExternalLink,
} from "lucide-react";
import { useEndpoint } from "@/components/EndpointProvider";
import { useCloudTheme } from "@/components/CloudThemeContext";
import { ResourceDrawer } from "@/components/ResourceDrawer";

export default function SQSPage() {
  const { endpoint, isConnected } = useEndpoint();
  const { cloudMode, serviceLabels } = useCloudTheme();

  const [queues, setQueues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [mounted, setMounted] = useState(false);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newQueueName, setNewQueueName] = useState("");
  const [isFifo, setIsFifo] = useState(false);

  const [isSendOpen, setIsSendOpen] = useState(false);
  const [targetQueue, setTargetQueue] = useState<any>(null);
  const [messageBody, setMessageBody] = useState("");
  const [delaySeconds, setDelaySeconds] = useState(0);

  const [isMessagesOpen, setIsMessagesOpen] = useState(false);
  const [queueMessages, setQueueMessages] = useState<any[]>([]);
  const [fetchingMessages, setFetchingMessages] = useState(false);

  // Inspection Drawer
  const [selectedQueue, setSelectedQueue] = useState<any>(null);

  // Notification
  const [notification, setNotification] = useState<{ msg: string; isError?: boolean } | null>(null);

  const isAws = cloudMode === "aws";

  useEffect(() => {
    setMounted(true);
  }, []);

  const showNotification = (msg: string, isError = false) => {
    setNotification({ msg, isError });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchQueues = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/floci/sqs?endpoint=${encodeURIComponent(endpoint)}`);
      const data = await res.json();
      if (res.ok) {
        setQueues(data.queues || []);
      } else {
        showNotification(data.error || "Failed to fetch queues", true);
      }
    } catch (e: any) {
      showNotification(e.message || "Failed to fetch queues", true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isConnected) {
      fetchQueues();
    }
  }, [endpoint, isConnected]);

  const handleCreateQueue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQueueName.trim()) return;

    try {
      const res = await fetch(`/api/floci/sqs?endpoint=${encodeURIComponent(endpoint)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          queueName: newQueueName.trim(),
          isFifo,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showNotification(`Queue created successfully`);
        setIsCreateOpen(false);
        setNewQueueName("");
        fetchQueues();
      } else {
        showNotification(data.error || "Failed to create queue", true);
      }
    } catch (e: any) {
      showNotification(e.message || "Error creating queue", true);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetQueue || !messageBody.trim()) return;

    try {
      const res = await fetch(`/api/floci/sqs?endpoint=${encodeURIComponent(endpoint)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send",
          queueUrl: targetQueue.url,
          messageBody: messageBody.trim(),
          delaySeconds: Number(delaySeconds) || 0,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showNotification(`Message sent (ID: ${data.messageId?.slice(0, 8)}...)`);
        setIsSendOpen(false);
        setMessageBody("");
        fetchQueues();
      } else {
        showNotification(data.error || "Failed to send message", true);
      }
    } catch (e: any) {
      showNotification(e.message || "Error sending message", true);
    }
  };

  const handlePurgeQueue = async (q: any) => {
    if (!confirm(`Are you sure you want to purge all messages in ${q.name}?`)) return;
    try {
      const res = await fetch(`/api/floci/sqs?endpoint=${encodeURIComponent(endpoint)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "purge", queueUrl: q.url }),
      });
      if (res.ok) {
        showNotification(`Queue ${q.name} purged`);
        fetchQueues();
      } else {
        const d = await res.json();
        showNotification(d.error || "Failed to purge queue", true);
      }
    } catch (e: any) {
      showNotification(e.message, true);
    }
  };

  const handleDeleteQueue = async (q: any) => {
    if (!confirm(`Are you sure you want to delete queue ${q.name}?`)) return;
    try {
      const res = await fetch(`/api/floci/sqs?endpoint=${encodeURIComponent(endpoint)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete_queue", queueUrl: q.url }),
      });
      if (res.ok) {
        showNotification(`Queue ${q.name} deleted`);
        fetchQueues();
      } else {
        const d = await res.json();
        showNotification(d.error || "Failed to delete queue", true);
      }
    } catch (e: any) {
      showNotification(e.message, true);
    }
  };

  const openMessagesViewer = async (q: any) => {
    setTargetQueue(q);
    setIsMessagesOpen(true);
    setFetchingMessages(true);
    try {
      const res = await fetch(
        `/api/floci/sqs?endpoint=${encodeURIComponent(endpoint)}&action=messages&queueUrl=${encodeURIComponent(q.url)}`
      );
      const data = await res.json();
      if (res.ok) {
        setQueueMessages(data.messages || []);
      } else {
        showNotification(data.error || "Failed to receive messages", true);
      }
    } catch (e: any) {
      showNotification(e.message, true);
    } finally {
      setFetchingMessages(false);
    }
  };

  const handleDeleteMessage = async (receiptHandle: string) => {
    if (!targetQueue) return;
    try {
      const res = await fetch(`/api/floci/sqs?endpoint=${encodeURIComponent(endpoint)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete_message",
          queueUrl: targetQueue.url,
          receiptHandle,
        }),
      });
      if (res.ok) {
        showNotification("Message deleted");
        setQueueMessages((prev) => prev.filter((m) => m.ReceiptHandle !== receiptHandle));
        fetchQueues();
      }
    } catch (e: any) {
      showNotification(e.message, true);
    }
  };

  const filteredQueues = queues.filter((q) =>
    q.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-xl text-sm font-medium border ${
            notification.isError
              ? "bg-rose-950/90 text-rose-200 border-rose-800"
              : "bg-emerald-950/90 text-emerald-200 border-emerald-800"
          }`}
        >
          {notification.isError ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
          <span>{notification.msg}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              {isAws ? "Simple Queue Service (SQS)" : "Cloud Pub/Sub Queues"}
            </h1>
            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-primary/10 text-primary border border-primary/20">
              {queues.length} {queues.length === 1 ? "Queue" : "Queues"}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            {isAws
              ? "Fully managed message queues for decoupling microservices and serverless apps."
              : "Asynchronous messaging service for event-driven systems."}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchQueues}
            disabled={loading}
            className="p-2 rounded-md border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            title="Refresh queues"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-primary text-primary-foreground font-semibold text-xs hover:bg-primary/90 transition-colors shadow-sm cursor-pointer"
          >
            <Plus size={15} />
            <span>Create Queue</span>
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search queues..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-md bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {/* Queues Table */}
      <div className="rounded-lg border border-border overflow-hidden bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-muted/40 border-b border-border text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                <th className="py-3 px-4">Name</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4 text-center">Messages Available</th>
                <th className="py-3 px-4 text-center">In Flight</th>
                <th className="py-3 px-4">Created</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-muted-foreground">
                    <RefreshCw size={20} className="animate-spin mx-auto mb-2" />
                    <span>Loading queues...</span>
                  </td>
                </tr>
              ) : filteredQueues.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-muted-foreground">
                    <MessageSquare size={32} className="mx-auto mb-2 opacity-30" />
                    <p className="font-medium">No SQS queues found</p>
                    <p className="text-[11px] mt-0.5">Click "Create Queue" to launch your first message queue.</p>
                  </td>
                </tr>
              ) : (
                filteredQueues.map((q) => (
                  <tr
                    key={q.url}
                    className="border-b border-border/50 hover:bg-muted/20 transition-colors"
                  >
                    <td className="py-3 px-4 font-semibold text-foreground">
                      <div className="flex items-center gap-2">
                        <MessageSquare size={16} className="text-primary" />
                        <span className="font-mono text-xs">{q.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {q.isFifo ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          FIFO
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-zinc-500/10 text-zinc-400 border border-zinc-500/20">
                          Standard
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="font-mono font-bold text-foreground">
                        {q.messages}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="font-mono text-muted-foreground">
                        {q.messagesNotVisible}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground whitespace-nowrap">
                      {q.createdTimestamp ? new Date(q.createdTimestamp).toLocaleString() : "—"}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setTargetQueue(q);
                            setIsSendOpen(true);
                          }}
                          className="px-2 py-1 rounded text-[11px] font-medium bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors cursor-pointer flex items-center gap-1"
                          title="Send message to queue"
                        >
                          <Send size={12} />
                          <span>Send</span>
                        </button>
                        <button
                          onClick={() => openMessagesViewer(q)}
                          className="px-2 py-1 rounded text-[11px] font-medium bg-muted hover:bg-muted/80 text-foreground border border-border transition-colors cursor-pointer flex items-center gap-1"
                          title="View / poll messages in queue"
                        >
                          <Inbox size={12} />
                          <span>Messages</span>
                        </button>
                        <button
                          onClick={() => setSelectedQueue(q)}
                          className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                          title="Inspect Queue JSON"
                        >
                          <Code size={14} />
                        </button>
                        <button
                          onClick={() => handlePurgeQueue(q)}
                          className="p-1.5 rounded text-muted-foreground hover:text-amber-400 hover:bg-amber-500/10 transition-colors cursor-pointer"
                          title="Purge all messages"
                        >
                          <Eraser size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteQueue(q)}
                          className="p-1.5 rounded text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                          title="Delete queue"
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
      </div>

      {/* Create Queue Modal */}
      {isCreateOpen &&
        mounted &&
        createPortal(
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-xl w-full max-w-md p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <MessageSquare className="text-primary" size={18} />
                  <h3 className="font-bold text-foreground">Create SQS Queue</h3>
                </div>
                <button
                  onClick={() => setIsCreateOpen(false)}
                  className="text-muted-foreground hover:text-foreground p-1"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCreateQueue} className="space-y-4 text-xs">
                <div>
                  <label className="block font-medium text-foreground mb-1">Queue Name</label>
                  <input
                    type="text"
                    required
                    placeholder="my-sample-queue"
                    value={newQueueName}
                    onChange={(e) => setNewQueueName(e.target.value)}
                    className="w-full px-3 py-2 rounded-md bg-muted/40 border border-border text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {isFifo ? "FIFO queues must end with .fifo (appended automatically)" : "Standard queue name"}
                  </p>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/20">
                  <div>
                    <span className="font-semibold text-foreground block">FIFO Queue</span>
                    <span className="text-[11px] text-muted-foreground">
                      Guaranteed first-in-first-out ordering and exactly-once processing
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={isFifo}
                    onChange={(e) => setIsFifo(e.target.checked)}
                    className="rounded text-primary focus:ring-primary h-4 w-4"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setIsCreateOpen(false)}
                    className="px-3 py-1.5 rounded-md border border-border text-foreground hover:bg-muted font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-md bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors shadow-sm"
                  >
                    Create Queue
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* Send Message Modal */}
      {isSendOpen &&
        mounted &&
        createPortal(
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-xl w-full max-w-lg p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <Send className="text-primary" size={18} />
                  <h3 className="font-bold text-foreground">
                    Send Message to <span className="font-mono text-primary">{targetQueue?.name}</span>
                  </h3>
                </div>
                <button
                  onClick={() => setIsSendOpen(false)}
                  className="text-muted-foreground hover:text-foreground p-1"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSendMessage} className="space-y-4 text-xs">
                <div>
                  <label className="block font-medium text-foreground mb-1">Message Body</label>
                  <textarea
                    rows={6}
                    required
                    placeholder='{"event": "order_created", "orderId": "ORD-12345"}'
                    value={messageBody}
                    onChange={(e) => setMessageBody(e.target.value)}
                    className="w-full px-3 py-2 rounded-md bg-muted/40 border border-border text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block font-medium text-foreground mb-1">Delay Seconds (0 - 900)</label>
                  <input
                    type="number"
                    min={0}
                    max={900}
                    value={delaySeconds}
                    onChange={(e) => setDelaySeconds(Number(e.target.value))}
                    className="w-32 px-3 py-1.5 rounded-md bg-muted/40 border border-border text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setIsSendOpen(false)}
                    className="px-3 py-1.5 rounded-md border border-border text-foreground hover:bg-muted font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-md bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors shadow-sm"
                  >
                    Send Message
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* Messages Viewer Modal */}
      {isMessagesOpen &&
        mounted &&
        createPortal(
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-xl w-full max-w-2xl p-6 shadow-2xl space-y-4 flex flex-col max-h-[85vh]">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <Inbox className="text-primary" size={18} />
                  <h3 className="font-bold text-foreground">
                    Messages in <span className="font-mono text-primary">{targetQueue?.name}</span>
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openMessagesViewer(targetQueue)}
                    className="p-1 text-muted-foreground hover:text-foreground"
                    title="Poll again"
                  >
                    <RefreshCw size={15} className={fetchingMessages ? "animate-spin" : ""} />
                  </button>
                  <button
                    onClick={() => setIsMessagesOpen(false)}
                    className="text-muted-foreground hover:text-foreground p-1"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-auto space-y-3">
                {fetchingMessages ? (
                  <div className="py-8 text-center text-muted-foreground text-xs">
                    <RefreshCw size={20} className="animate-spin mx-auto mb-2" />
                    Polling for messages...
                  </div>
                ) : queueMessages.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground text-xs">
                    <Inbox size={28} className="mx-auto mb-2 opacity-30" />
                    No visible messages received in this poll.
                  </div>
                ) : (
                  queueMessages.map((msg, idx) => (
                    <div
                      key={msg.ReceiptHandle || idx}
                      className="p-3 rounded-lg border border-border bg-muted/20 space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[10px] text-muted-foreground">
                          ID: {msg.MessageId}
                        </span>
                        <button
                          onClick={() => handleDeleteMessage(msg.ReceiptHandle)}
                          className="text-rose-400 hover:text-rose-300 text-[11px] flex items-center gap-1"
                          title="Delete message from queue"
                        >
                          <Trash2 size={12} />
                          <span>Delete</span>
                        </button>
                      </div>
                      <div className="rounded bg-zinc-950 p-2 text-zinc-100 font-mono text-[11px] whitespace-pre-wrap break-all">
                        {msg.Body}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="pt-3 border-t border-border flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsMessagesOpen(false)}
                  className="px-4 py-1.5 rounded-md bg-muted text-foreground font-medium text-xs hover:bg-muted/80"
                >
                  Close
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Resource Inspection Drawer */}
      <ResourceDrawer
        isOpen={Boolean(selectedQueue)}
        onClose={() => setSelectedQueue(null)}
        title={selectedQueue?.name || "Queue Details"}
        subtitle={selectedQueue?.url}
        badge={selectedQueue?.isFifo ? "FIFO Queue" : "Standard Queue"}
        data={selectedQueue?.attributes || selectedQueue}
      />
    </div>
  );
}
