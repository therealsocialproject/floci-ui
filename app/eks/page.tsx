"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Cpu,
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

export default function EKSPage() {
  const { endpoint, isConnected } = useEndpoint();
  const { serviceLabels } = useCloudTheme();

  const [clusters, setClusters] = useState<any[]>([]);
  const [selectedCluster, setSelectedCluster] = useState<string | null>(null);
  const [nodegroups, setNodegroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [inspectResource, setInspectResource] = useState<any>(null);
  const [notification, setNotification] = useState<{ msg: string; isError?: boolean } | null>(null);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [clusterName, setClusterName] = useState("");
  const [k8sVersion, setK8sVersion] = useState("1.31");

  useEffect(() => {
    setMounted(true);
  }, []);

  const notify = (msg: string, isError = false) => {
    setNotification({ msg, isError });
    setTimeout(() => setNotification(null), 4000);
  };

  const loadClusters = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/floci/eks?endpoint=${encodeURIComponent(endpoint)}`);
      const data = await res.json();
      if (res.ok) {
        const list = data.clusters || [];
        setClusters(list);
        if (list.length > 0 && !selectedCluster) setSelectedCluster(list[0].name);
      } else {
        notify(data.error || "Failed to load EKS clusters", true);
      }
    } catch (e: any) {
      notify(e.message || "Failed to load EKS clusters", true);
    } finally {
      setLoading(false);
    }
  };

  const loadNodegroups = async (cName: string) => {
    try {
      const res = await fetch(
        `/api/floci/eks?endpoint=${encodeURIComponent(endpoint)}&action=nodegroups&clusterName=${encodeURIComponent(cName)}`
      );
      const data = await res.json();
      if (res.ok) setNodegroups(data.nodegroups || []);
    } catch {
      setNodegroups([]);
    }
  };

  useEffect(() => {
    if (isConnected) loadClusters();
  }, [endpoint, isConnected]);

  useEffect(() => {
    if (isConnected && selectedCluster) loadNodegroups(selectedCluster);
  }, [endpoint, isConnected, selectedCluster]);

  const postAction = async (payload: Record<string, any>, successMsg: string) => {
    try {
      const res = await fetch(`/api/floci/eks?endpoint=${encodeURIComponent(endpoint)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        notify(successMsg);
        loadClusters();
        if (selectedCluster) loadNodegroups(selectedCluster);
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
            <Cpu className="text-primary" size={24} />
            <span>{serviceLabels.eks}</span>
          </h1>
          <p className="text-sm text-muted mt-1">
            Manage k3s-backed EKS clusters, Kubernetes API endpoints, and managed node groups.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsCreateOpen(true)}
            className="px-3 py-2 rounded-lg text-xs font-semibold bg-primary hover:opacity-90 text-white flex items-center gap-1.5 cursor-pointer"
          >
            <Plus size={14} /> Create Cluster
          </button>
          <button
            onClick={loadClusters}
            className="p-2 rounded-lg bg-surface border border-line hover:bg-surface-hover cursor-pointer"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-surface border border-line rounded-panel p-4 space-y-3">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted">
            Kubernetes Clusters ({clusters.length})
          </div>
          {clusters.length === 0 ? (
            <div className="text-xs text-muted py-6 text-center">No EKS clusters found.</div>
          ) : (
            clusters.map((c) => (
              <div
                key={c.name}
                onClick={() => setSelectedCluster(c.name)}
                className={`p-3 rounded-lg border cursor-pointer ${
                  selectedCluster === c.name
                    ? "bg-primary/10 border-primary"
                    : "bg-background border-line hover:border-primary/40"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs">{c.name}</span>
                  <div className="flex items-center gap-1">
                    <button onClick={(e) => { e.stopPropagation(); setInspectResource(c); }} className="text-muted hover:text-primary">
                      <Code size={13} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Delete EKS cluster "${c.name}"?`)) {
                          postAction({ action: "delete_cluster", name: c.name }, `Cluster "${c.name}" deleted`);
                        }
                      }}
                      className="text-muted hover:text-red-400"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
                <div className="text-[11px] text-muted mt-1">
                  v{c.version || "1.31"} · <span className="text-emerald-400">{c.status || "ACTIVE"}</span>
                </div>
                {c.endpoint && (
                  <div className="text-[10px] font-mono text-muted truncate mt-1">{c.endpoint}</div>
                )}
              </div>
            ))
          )}
        </div>

        <div className="lg:col-span-2 bg-surface border border-line rounded-panel overflow-hidden">
          <div className="p-4 border-b border-line text-sm font-semibold">
            Managed Node Groups {selectedCluster ? `— ${selectedCluster}` : ""} ({nodegroups.length})
          </div>
          <table className="w-full text-left text-xs">
            <thead className="bg-background/50 border-b border-line text-muted uppercase">
              <tr>
                <th className="px-4 py-3">Node Group</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Instance Types</th>
                <th className="px-4 py-3">Scaling</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {nodegroups.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-muted">No managed node groups in this cluster.</td></tr>
              ) : (
                nodegroups.map((ng) => (
                  <tr key={ng.nodegroupName}>
                    <td className="px-4 py-3 font-medium">{ng.nodegroupName}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/15 text-emerald-400">
                        {ng.status || "ACTIVE"}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-muted">
                      {(ng.instanceTypes || []).join(", ") || "—"}
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px]">
                      {ng.scalingConfig ? `${ng.scalingConfig.desiredSize} (min ${ng.scalingConfig.minSize} / max ${ng.scalingConfig.maxSize})` : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex gap-1.5">
                        <button onClick={() => setInspectResource(ng)} className="p-1 rounded bg-background border border-line">
                          <Code size={13} />
                        </button>
                        <button
                          onClick={() =>
                            postAction(
                              { action: "delete_nodegroup", clusterName: selectedCluster, nodegroupName: ng.nodegroupName },
                              "Node group deleted"
                            )
                          }
                          className="p-1 rounded bg-background border border-line text-red-400"
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
      </div>

      {mounted && isCreateOpen &&
        createPortal(
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-surface border border-line rounded-panel w-full max-w-md p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold">Create EKS Cluster</h2>
                <button onClick={() => setIsCreateOpen(false)} className="text-muted"><X size={18} /></button>
              </div>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const ok = await postAction(
                    { action: "create_cluster", name: clusterName.trim(), version: k8sVersion },
                    `Cluster "${clusterName}" created`
                  );
                  if (ok) { setClusterName(""); setIsCreateOpen(false); }
                }}
                className="space-y-3"
              >
                <input required value={clusterName} onChange={(e) => setClusterName(e.target.value)} placeholder="dev-eks-cluster" className="w-full px-3 py-2 rounded-lg bg-background border border-line text-sm" />
                <div>
                  <label className="block text-xs text-muted mb-1">Kubernetes Version</label>
                  <select value={k8sVersion} onChange={(e) => setK8sVersion(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-background border border-line text-sm">
                    <option value="1.32">1.32</option>
                    <option value="1.31">1.31</option>
                    <option value="1.30">1.30</option>
                  </select>
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

      <ResourceDrawer
        isOpen={!!inspectResource}
        onClose={() => setInspectResource(null)}
        title={inspectResource?.name || inspectResource?.nodegroupName || "EKS Resource"}
        subtitle={inspectResource?.arn || inspectResource?.nodegroupArn || ""}
        data={inspectResource}
      />
    </div>
  );
}
