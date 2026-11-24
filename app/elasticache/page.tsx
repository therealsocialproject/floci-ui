"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Zap,
  RefreshCw,
  Plus,
  Trash2,
  Code,
  CheckCircle2,
  AlertCircle,
  X,
} from "lucide-react";
import { useEndpoint } from "@/components/EndpointProvider";
import { useCloudTheme } from "@/components/CloudThemeContext";
import { ResourceDrawer } from "@/components/ResourceDrawer";

export default function ElastiCachePage() {
  const { endpoint, isConnected } = useEndpoint();
  const { serviceLabels } = useCloudTheme();

  const [clusters, setClusters] = useState<any[]>([]);
  const [repGroups, setRepGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [inspectResource, setInspectResource] = useState<any>(null);
  const [notification, setNotification] = useState<{ msg: string; isError?: boolean } | null>(null);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [clusterId, setClusterId] = useState("");
  const [engine, setEngine] = useState("valkey");

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
      const res = await fetch(`/api/floci/elasticache?endpoint=${encodeURIComponent(endpoint)}`);
      const data = await res.json();
      if (res.ok) {
        setClusters(data.clusters || []);
        setRepGroups(data.replicationGroups || []);
      } else {
        notify(data.error || "Failed to fetch ElastiCache clusters", true);
      }
    } catch (e: any) {
      notify(e.message || "Failed to fetch ElastiCache clusters", true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isConnected) reloadData();
  }, [endpoint, isConnected]);

  const postAction = async (payload: Record<string, any>, successMsg: string) => {
    try {
      const res = await fetch(`/api/floci/elasticache?endpoint=${encodeURIComponent(endpoint)}`, {
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
            <Zap className="text-primary" size={24} />
            <span>{serviceLabels.elasticache}</span>
          </h1>
          <p className="text-sm text-muted mt-1">
            Manage Docker-backed Valkey / Redis cache clusters and replication groups.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsCreateOpen(true)}
            className="px-3 py-2 rounded-lg text-xs font-semibold bg-primary hover:opacity-90 text-white flex items-center gap-1.5 cursor-pointer"
          >
            <Plus size={14} /> Create Cache Cluster
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
          Cache Clusters ({clusters.length})
        </div>
        <table className="w-full text-left text-xs">
          <thead className="bg-background/50 border-b border-line text-muted uppercase">
            <tr>
              <th className="px-4 py-3">Cluster ID</th>
              <th className="px-4 py-3">Engine</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Endpoint</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {clusters.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted">No ElastiCache clusters found.</td></tr>
            ) : (
              clusters.map((c) => {
                const ep = c.CacheNodes?.[0]?.Endpoint;
                return (
                  <tr key={c.CacheClusterId}>
                    <td className="px-4 py-3 font-medium font-mono">{c.CacheClusterId}</td>
                    <td className="px-4 py-3">{c.Engine} {c.EngineVersion || ""}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-400">
                        {c.CacheClusterStatus || "available"}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-primary">
                      {ep ? `${ep.Address}:${ep.Port}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex gap-1.5">
                        <button onClick={() => setInspectResource(c)} className="p-1.5 rounded bg-background border border-line cursor-pointer">
                          <Code size={13} />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Delete cluster "${c.CacheClusterId}"?`)) {
                              postAction({ action: "delete_cluster", clusterId: c.CacheClusterId }, "Cluster deleted");
                            }
                          }}
                          className="p-1.5 rounded bg-background border border-line text-red-400 cursor-pointer"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {repGroups.length > 0 && (
        <div className="bg-surface border border-line rounded-panel overflow-hidden">
          <div className="p-4 border-b border-line text-sm font-semibold">
            Replication Groups ({repGroups.length})
          </div>
          <table className="w-full text-left text-xs">
            <thead className="bg-background/50 border-b border-line text-muted uppercase">
              <tr>
                <th className="px-4 py-3">Group ID</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {repGroups.map((rg) => (
                <tr key={rg.ReplicationGroupId}>
                  <td className="px-4 py-3 font-mono font-medium">{rg.ReplicationGroupId}</td>
                  <td className="px-4 py-3">{rg.Status}</td>
                  <td className="px-4 py-3 text-muted">{rg.Description || "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => postAction({ action: "delete_replication_group", replicationGroupId: rg.ReplicationGroupId }, "Replication group deleted")}
                      className="text-red-400 hover:text-red-300"
                    >
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {mounted && isCreateOpen &&
        createPortal(
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-surface border border-line rounded-panel w-full max-w-md p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold">Create ElastiCache Cluster</h2>
                <button onClick={() => setIsCreateOpen(false)} className="text-muted"><X size={18} /></button>
              </div>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const ok = await postAction(
                    { action: "create_cluster", clusterId: clusterId.trim(), engine },
                    `Cluster "${clusterId}" created`
                  );
                  if (ok) { setClusterId(""); setIsCreateOpen(false); }
                }}
                className="space-y-3"
              >
                <input required value={clusterId} onChange={(e) => setClusterId(e.target.value)} placeholder="app-cache" className="w-full px-3 py-2 rounded-lg bg-background border border-line text-sm" />
                <select value={engine} onChange={(e) => setEngine(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-background border border-line text-sm">
                  <option value="valkey">Valkey</option>
                  <option value="redis">Redis</option>
                </select>
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
        title={inspectResource?.CacheClusterId || "ElastiCache Resource"}
        subtitle={inspectResource?.ARN || ""}
        data={inspectResource}
      />
    </div>
  );
}
