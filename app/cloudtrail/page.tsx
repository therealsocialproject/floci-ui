"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  ScrollText,
  RefreshCw,
  Plus,
  Trash2,
  Play,
  Square,
  Code,
  CheckCircle2,
  AlertCircle,
  X,
} from "lucide-react";
import { useEndpoint } from "@/components/EndpointProvider";
import { useCloudTheme } from "@/components/CloudThemeContext";
import { ResourceDrawer } from "@/components/ResourceDrawer";

export default function CloudTrailPage() {
  const { endpoint, isConnected } = useEndpoint();
  const { serviceLabels } = useCloudTheme();

  const [trails, setTrails] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [inspectResource, setInspectResource] = useState<any>(null);
  const [notification, setNotification] = useState<{ msg: string; isError?: boolean } | null>(null);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [trailName, setTrailName] = useState("");
  const [s3Bucket, setS3Bucket] = useState("");
  const [keyPrefix, setKeyPrefix] = useState("");

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
      const res = await fetch(`/api/floci/cloudtrail?endpoint=${encodeURIComponent(endpoint)}`);
      const data = await res.json();
      if (res.ok) setTrails(data.trails || []);
      else notify(data.error || "Failed to load CloudTrail trails", true);
    } catch (e: any) {
      notify(e.message || "Failed to load CloudTrail trails", true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isConnected) reloadData();
  }, [endpoint, isConnected]);

  const postAction = async (payload: Record<string, any>, successMsg: string) => {
    try {
      const res = await fetch(`/api/floci/cloudtrail?endpoint=${encodeURIComponent(endpoint)}`, {
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
            <ScrollText className="text-primary" size={24} />
            <span>{serviceLabels.cloudtrail}</span>
          </h1>
          <p className="text-sm text-muted mt-1">
            Configure audit trails, S3 log delivery buckets, and toggle live trail logging.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsCreateOpen(true)}
            className="px-3 py-2 rounded-lg text-xs font-semibold bg-primary hover:opacity-90 text-white flex items-center gap-1.5 cursor-pointer"
          >
            <Plus size={14} /> Create Trail
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
          Audit Trails ({trails.length})
        </div>
        <table className="w-full text-left text-xs">
          <thead className="bg-background/50 border-b border-line text-muted uppercase">
            <tr>
              <th className="px-4 py-3">Trail Name</th>
              <th className="px-4 py-3">S3 Bucket</th>
              <th className="px-4 py-3">Multi-Region</th>
              <th className="px-4 py-3">Logging</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {trails.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted">No CloudTrail trails configured.</td></tr>
            ) : (
              trails.map((t) => (
                <tr key={t.TrailARN || t.Name}>
                  <td className="px-4 py-3 font-medium">{t.Name}</td>
                  <td className="px-4 py-3 font-mono text-primary">
                    {t.S3BucketName}{t.S3KeyPrefix ? `/${t.S3KeyPrefix}` : ""}
                  </td>
                  <td className="px-4 py-3 text-muted">{t.IsMultiRegionTrail ? "Yes" : "No"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        t.IsLogging
                          ? "bg-emerald-500/15 text-emerald-400"
                          : "bg-amber-500/15 text-amber-400"
                      }`}
                    >
                      {t.IsLogging ? "LOGGING" : "STOPPED"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex gap-1.5">
                      <button
                        onClick={() =>
                          postAction(
                            { action: t.IsLogging ? "stop_logging" : "start_logging", name: t.Name },
                            t.IsLogging ? "Logging stopped" : "Logging started"
                          )
                        }
                        className="px-2 py-1 rounded bg-background border border-line hover:border-primary text-[11px] flex items-center gap-1 cursor-pointer"
                      >
                        {t.IsLogging ? <Square size={11} /> : <Play size={11} />}
                        <span>{t.IsLogging ? "Stop" : "Start"}</span>
                      </button>
                      <button onClick={() => setInspectResource(t)} className="p-1.5 rounded bg-background border border-line cursor-pointer">
                        <Code size={13} />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Delete trail "${t.Name}"?`)) {
                            postAction({ action: "delete_trail", name: t.Name }, `Trail "${t.Name}" deleted`);
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
                <h2 className="text-base font-bold">Create CloudTrail Trail</h2>
                <button onClick={() => setIsCreateOpen(false)} className="text-muted"><X size={18} /></button>
              </div>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const ok = await postAction(
                    {
                      action: "create_trail",
                      name: trailName.trim(),
                      s3BucketName: s3Bucket.trim(),
                      s3KeyPrefix: keyPrefix.trim() || undefined,
                    },
                    `Trail "${trailName}" created`
                  );
                  if (ok) { setTrailName(""); setS3Bucket(""); setKeyPrefix(""); setIsCreateOpen(false); }
                }}
                className="space-y-3"
              >
                <input required value={trailName} onChange={(e) => setTrailName(e.target.value)} placeholder="audit-trail" className="w-full px-3 py-2 rounded-lg bg-background border border-line text-sm" />
                <input required value={s3Bucket} onChange={(e) => setS3Bucket(e.target.value)} placeholder="Destination S3 Bucket Name" className="w-full px-3 py-2 rounded-lg bg-background border border-line text-sm font-mono" />
                <input value={keyPrefix} onChange={(e) => setKeyPrefix(e.target.value)} placeholder="S3 Key Prefix (optional)" className="w-full px-3 py-2 rounded-lg bg-background border border-line text-sm font-mono" />
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setIsCreateOpen(false)} className="px-3 py-1.5 rounded-lg border border-line text-xs">Cancel</button>
                  <button type="submit" className="px-4 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold">Create</button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      <ResourceDrawer
        isOpen={!!inspectResource}
        onClose={() => setInspectResource(null)}
        title={inspectResource?.Name || "CloudTrail Trail"}
        subtitle={inspectResource?.TrailARN || ""}
        data={inspectResource}
      />
    </div>
  );
}
