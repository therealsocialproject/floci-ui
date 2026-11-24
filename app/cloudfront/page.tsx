"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Cloud,
  RefreshCw,
  Plus,
  Trash2,
  Zap,
  Code,
  CheckCircle2,
  AlertCircle,
  X,
} from "lucide-react";
import { useEndpoint } from "@/components/EndpointProvider";
import { useCloudTheme } from "@/components/CloudThemeContext";
import { ResourceDrawer } from "@/components/ResourceDrawer";

export default function CloudFrontPage() {
  const { endpoint, isConnected } = useEndpoint();
  const { serviceLabels } = useCloudTheme();

  const [distributions, setDistributions] = useState<any[]>([]);
  const [functions, setFunctions] = useState<any[]>([]);
  const [kvsList, setKvsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [inspectResource, setInspectResource] = useState<any>(null);
  const [notification, setNotification] = useState<{ msg: string; isError?: boolean } | null>(null);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [originDomain, setOriginDomain] = useState("my-bucket.s3.amazonaws.com");
  const [comment, setComment] = useState("");

  const [invDistId, setInvDistId] = useState<string | null>(null);
  const [invPaths, setInvPaths] = useState("/*");

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
      const res = await fetch(`/api/floci/cloudfront?endpoint=${encodeURIComponent(endpoint)}`);
      const data = await res.json();
      if (res.ok) {
        setDistributions(data.distributions || []);
        setFunctions(data.functions || []);
        setKvsList(data.keyValueStores || []);
      } else {
        notify(data.error || "Failed to load CloudFront resources", true);
      }
    } catch (e: any) {
      notify(e.message || "Failed to load CloudFront resources", true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isConnected) reloadData();
  }, [endpoint, isConnected]);

  const postAction = async (payload: Record<string, any>, successMsg: string) => {
    try {
      const res = await fetch(`/api/floci/cloudfront?endpoint=${encodeURIComponent(endpoint)}`, {
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
            <Cloud className="text-primary" size={24} />
            <span>{serviceLabels.cloudfront}</span>
          </h1>
          <p className="text-sm text-muted mt-1">
            Manage CDN distributions, cache invalidations, CloudFront Functions, and KeyValueStores.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsCreateOpen(true)}
            className="px-3 py-2 rounded-lg text-xs font-semibold bg-primary hover:opacity-90 text-white flex items-center gap-1.5 cursor-pointer"
          >
            <Plus size={14} /> Create Distribution
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
          Distributions ({distributions.length})
        </div>
        <table className="w-full text-left text-xs">
          <thead className="bg-background/50 border-b border-line text-muted uppercase">
            <tr>
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">Domain Name</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Origins</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted">Loading distributions...</td></tr>
            ) : distributions.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted">No CloudFront distributions found.</td></tr>
            ) : (
              distributions.map((d) => (
                <tr key={d.Id} className="hover:bg-background/40">
                  <td className="px-4 py-3 font-mono font-medium">{d.Id}</td>
                  <td className="px-4 py-3 font-mono text-primary">{d.DomainName}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-400">
                      {d.Status || "Deployed"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted font-mono text-[11px]">
                    {(d.Origins?.Items || []).map((o: any) => o.DomainName).join(", ") || "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        onClick={() => setInvDistId(d.Id)}
                        className="px-2 py-1 rounded bg-background border border-line hover:border-primary text-[11px] flex items-center gap-1 cursor-pointer"
                      >
                        <Zap size={11} /> Invalidate
                      </button>
                      <button onClick={() => setInspectResource(d)} className="p-1.5 rounded bg-background border border-line cursor-pointer">
                        <Code size={13} />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Delete distribution "${d.Id}"?`)) {
                            postAction({ action: "delete_distribution", distributionId: d.Id }, "Distribution deleted");
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-surface border border-line rounded-panel p-4 space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted">
            CloudFront Functions ({functions.length})
          </div>
          {functions.length === 0 ? (
            <p className="text-xs text-muted">No edge functions deployed.</p>
          ) : (
            functions.map((f: any) => (
              <div key={f.Name} className="p-2 rounded bg-background border border-line text-xs flex justify-between">
                <span className="font-mono font-medium">{f.Name}</span>
                <span className="text-muted">{f.Status}</span>
              </div>
            ))
          )}
        </div>
        <div className="bg-surface border border-line rounded-panel p-4 space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted">
            KeyValueStores ({kvsList.length})
          </div>
          {kvsList.length === 0 ? (
            <p className="text-xs text-muted">No KeyValueStores configured.</p>
          ) : (
            kvsList.map((k: any) => (
              <div key={k.Name} className="p-2 rounded bg-background border border-line text-xs flex justify-between">
                <span className="font-mono font-medium">{k.Name}</span>
                <span className="text-muted">{k.Status}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {mounted && isCreateOpen &&
        createPortal(
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-surface border border-line rounded-panel w-full max-w-md p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold">Create CloudFront Distribution</h2>
                <button onClick={() => setIsCreateOpen(false)} className="text-muted"><X size={18} /></button>
              </div>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const ok = await postAction(
                    { action: "create_distribution", originDomain: originDomain.trim(), comment: comment.trim() || undefined },
                    "Distribution created"
                  );
                  if (ok) { setComment(""); setIsCreateOpen(false); }
                }}
                className="space-y-3"
              >
                <div>
                  <label className="block text-xs text-muted mb-1">Origin Domain Name</label>
                  <input required value={originDomain} onChange={(e) => setOriginDomain(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-background border border-line text-sm font-mono" />
                </div>
                <div>
                  <label className="block text-xs text-muted mb-1">Comment (optional)</label>
                  <input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Static site CDN" className="w-full px-3 py-2 rounded-lg bg-background border border-line text-sm" />
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

      {mounted && invDistId &&
        createPortal(
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-surface border border-line rounded-panel w-full max-w-md p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold">Create Invalidation ({invDistId})</h2>
                <button onClick={() => setInvDistId(null)} className="text-muted"><X size={18} /></button>
              </div>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const ok = await postAction(
                    { action: "create_invalidation", distributionId: invDistId, paths: invPaths },
                    "Invalidation created"
                  );
                  if (ok) setInvDistId(null);
                }}
                className="space-y-3"
              >
                <div>
                  <label className="block text-xs text-muted mb-1">Paths (comma-separated)</label>
                  <input required value={invPaths} onChange={(e) => setInvPaths(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-background border border-line text-sm font-mono" />
                </div>
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setInvDistId(null)} className="px-3 py-1.5 rounded-lg border border-line text-xs">Cancel</button>
                  <button type="submit" className="px-4 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold">Invalidate</button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      <ResourceDrawer
        isOpen={!!inspectResource}
        onClose={() => setInspectResource(null)}
        title={inspectResource?.Id || "CloudFront Distribution"}
        subtitle={inspectResource?.DomainName || ""}
        data={inspectResource}
      />
    </div>
  );
}
