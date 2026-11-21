"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Waves,
  RefreshCw,
  Plus,
  Trash2,
  Send,
  Code,
  CheckCircle2,
  AlertCircle,
  X,
} from "lucide-react";
import { useEndpoint } from "@/components/EndpointProvider";
import { useCloudTheme } from "@/components/CloudThemeContext";
import { ResourceDrawer } from "@/components/ResourceDrawer";

export default function KinesisPage() {
  const { endpoint, isConnected } = useEndpoint();
  const { serviceLabels } = useCloudTheme();

  const [streams, setStreams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [inspectResource, setInspectResource] = useState<any>(null);
  const [notification, setNotification] = useState<{ msg: string; isError?: boolean } | null>(null);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [streamName, setStreamName] = useState("");
  const [shardCount, setShardCount] = useState("1");

  const [putTarget, setPutTarget] = useState<string | null>(null);
  const [partitionKey, setPartitionKey] = useState("pk-1");
  const [recordData, setRecordData] = useState('{\n  "event": "click",\n  "ts": 1700000000\n}');

  useEffect(() => {
    setMounted(true);
  }, []);

  const notify = (msg: string, isError = false) => {
    setNotification({ msg, isError });
    setTimeout(() => setNotification(null), 4000);
  };

  const reloadData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/floci/kinesis?endpoint=${encodeURIComponent(endpoint)}`);
      const data = await res.json();
      if (res.ok) {
        setStreams(data.streams || []);
      } else {
        notify(data.error || "Failed to load Kinesis streams", true);
      }
    } catch (e: any) {
      notify(e.message || "Failed to load Kinesis streams", true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isConnected) reloadData();
  }, [endpoint, isConnected]);

  const postAction = async (payload: Record<string, any>, successMsg: string) => {
    try {
      const res = await fetch(`/api/floci/kinesis?endpoint=${encodeURIComponent(endpoint)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        notify(successMsg);
        reloadData();
        return true;
      }
      notify(data.error || "Operation failed", true);
      return false;
    } catch (e: any) {
      notify(e.message || "Operation failed", true);
      return false;
    }
  };

  return (
    <div className="space-y-6">
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg border shadow-lg text-sm font-medium ${
            notification.isError
              ? "bg-red-500/15 border-red-500/40 text-red-300"
              : "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
          }`}
        >
          {notification.isError ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
          <span>{notification.msg}</span>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2.5">
            <Waves className="text-primary" size={24} />
            <span>{serviceLabels.kinesis}</span>
          </h1>
          <p className="text-sm text-muted mt-1">
            Manage real-time Kinesis data streams, shards, and push test records.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsCreateOpen(true)}
            className="px-3 py-2 rounded-lg text-xs font-semibold bg-primary hover:opacity-90 text-white flex items-center gap-1.5 cursor-pointer"
          >
            <Plus size={14} /> Create Stream
          </button>
          <button
            onClick={reloadData}
            className="p-2 rounded-lg bg-surface border border-line hover:bg-surface-hover cursor-pointer"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      <div className="bg-surface border border-line rounded-panel overflow-hidden">
        <div className="p-4 border-b border-line text-sm font-semibold">
          Data Streams ({streams.length})
        </div>
        <table className="w-full text-left text-xs">
          <thead className="bg-background/50 border-b border-line text-muted uppercase">
            <tr>
              <th className="px-4 py-3">Stream Name</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Open Shards</th>
              <th className="px-4 py-3">Retention</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted">Loading streams...</td></tr>
            ) : streams.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted">No Kinesis streams found.</td></tr>
            ) : (
              streams.map((s) => (
                <tr key={s.name} className="hover:bg-background/40">
                  <td className="px-4 py-3 font-medium font-mono">{s.name}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-400">
                      {s.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono">{s.shardCount}</td>
                  <td className="px-4 py-3 text-muted">{s.retentionHours}h</td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        onClick={() => setPutTarget(s.name)}
                        className="px-2 py-1 rounded bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 text-[11px] flex items-center gap-1 cursor-pointer"
                      >
                        <Send size={11} /> Put Record
                      </button>
                      <button onClick={() => setInspectResource(s.raw || s)} className="p-1.5 rounded bg-background border border-line cursor-pointer">
                        <Code size={13} />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Delete stream "${s.name}"?`)) {
                            postAction({ action: "delete_stream", streamName: s.name }, `Stream "${s.name}" deleted`);
                          }
                        }}
                        className="p-1.5 rounded bg-background border border-line text-red-400 cursor-pointer"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {mounted && isCreateOpen &&
        createPortal(
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-surface border border-line rounded-panel w-full max-w-md p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold">Create Kinesis Stream</h2>
                <button onClick={() => setIsCreateOpen(false)} className="text-muted"><X size={18} /></button>
              </div>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const ok = await postAction(
                    { action: "create_stream", streamName: streamName.trim(), shardCount: Number(shardCount) },
                    `Stream "${streamName}" created`
                  );
                  if (ok) { setStreamName(""); setIsCreateOpen(false); }
                }}
                className="space-y-3"
              >
                <input required value={streamName} onChange={(e) => setStreamName(e.target.value)} placeholder="clickstream-events" className="w-full px-3 py-2 rounded-lg bg-background border border-line text-sm" />
                <div>
                  <label className="block text-xs text-muted mb-1">Shard Count</label>
                  <input type="number" min={1} max={100} required value={shardCount} onChange={(e) => setShardCount(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-background border border-line text-sm" />
                </div>
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setIsCreateOpen(false)} className="px-3 py-1.5 rounded-lg border border-line text-xs">Cancel</button>
                  <button type="submit" className="px-4 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold">Create</button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {mounted && putTarget &&
        createPortal(
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-surface border border-line rounded-panel w-full max-w-lg p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold">Put Record to {putTarget}</h2>
                <button onClick={() => setPutTarget(null)} className="text-muted"><X size={18} /></button>
              </div>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const ok = await postAction(
                    { action: "put_record", streamName: putTarget, partitionKey: partitionKey.trim(), data: recordData },
                    `Record written to "${putTarget}"`
                  );
                  if (ok) setPutTarget(null);
                }}
                className="space-y-3"
              >
                <div>
                  <label className="block text-xs text-muted mb-1">Partition Key</label>
                  <input required value={partitionKey} onChange={(e) => setPartitionKey(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-background border border-line text-sm font-mono" />
                </div>
                <div>
                  <label className="block text-xs text-muted mb-1">Payload</label>
                  <textarea rows={5} required value={recordData} onChange={(e) => setRecordData(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-background border border-line text-xs font-mono" />
                </div>
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setPutTarget(null)} className="px-3 py-1.5 rounded-lg border border-line text-xs">Cancel</button>
                  <button type="submit" className="px-4 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold">PutRecord</button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      <ResourceDrawer
        isOpen={!!inspectResource}
        onClose={() => setInspectResource(null)}
        title={inspectResource?.StreamName || inspectResource?.name || "Kinesis Stream"}
        subtitle={inspectResource?.StreamARN || inspectResource?.arn || ""}
        data={inspectResource}
      />
    </div>
  );
}
