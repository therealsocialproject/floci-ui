"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Container,
  RefreshCw,
  Plus,
  Trash2,
  Square,
  CheckCircle2,
  AlertCircle,
  X,
  Code,
} from "lucide-react";
import { useEndpoint } from "@/components/EndpointProvider";
import { useCloudTheme } from "@/components/CloudThemeContext";
import { ResourceDrawer } from "@/components/ResourceDrawer";

export default function ECSPage() {
  const { endpoint, isConnected } = useEndpoint();
  const { serviceLabels } = useCloudTheme();

  const [clusters, setClusters] = useState<any[]>([]);
  const [taskDefinitions, setTaskDefinitions] = useState<string[]>([]);
  const [selectedCluster, setSelectedCluster] = useState<string | null>(null);
  const [services, setServices] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [inspectResource, setInspectResource] = useState<any>(null);
  const [notification, setNotification] = useState<{ msg: string; isError?: boolean } | null>(null);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [clusterName, setClusterName] = useState("");

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
      const res = await fetch(`/api/floci/ecs?endpoint=${encodeURIComponent(endpoint)}`);
      const data = await res.json();
      if (res.ok) {
        const list = data.clusters || [];
        setClusters(list);
        setTaskDefinitions(data.taskDefinitions || []);
        if (list.length > 0 && !selectedCluster) setSelectedCluster(list[0].clusterName);
      } else {
        notify(data.error || "Failed to fetch ECS clusters", true);
      }
    } catch (e: any) {
      notify(e.message || "Failed to fetch ECS clusters", true);
    } finally {
      setLoading(false);
    }
  };

  const loadDetails = async (cName: string) => {
    try {
      const res = await fetch(
        `/api/floci/ecs?endpoint=${encodeURIComponent(endpoint)}&action=cluster_details&cluster=${encodeURIComponent(cName)}`
      );
      const data = await res.json();
      if (res.ok) {
        setServices(data.services || []);
        setTasks(data.tasks || []);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (isConnected) loadClusters();
  }, [endpoint, isConnected]);

  useEffect(() => {
    if (isConnected && selectedCluster) loadDetails(selectedCluster);
  }, [endpoint, isConnected, selectedCluster]);

  const postAction = async (payload: Record<string, any>, successMsg: string) => {
    try {
      const res = await fetch(`/api/floci/ecs?endpoint=${encodeURIComponent(endpoint)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        notify(successMsg);
        loadClusters();
        if (selectedCluster) loadDetails(selectedCluster);
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
            <Container className="text-primary" size={24} />
            <span>{serviceLabels.ecs}</span>
          </h1>
          <p className="text-sm text-muted mt-1">
            Inspect Docker-backed ECS clusters, services, running tasks, and task definitions.
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
        <div className="space-y-4">
          <div className="bg-surface border border-line rounded-panel p-4 space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted">
              Clusters ({clusters.length})
            </div>
            {clusters.length === 0 ? (
              <div className="text-xs text-muted py-4 text-center">No ECS clusters found.</div>
            ) : (
              clusters.map((c) => (
                <div
                  key={c.clusterArn}
                  onClick={() => setSelectedCluster(c.clusterName)}
                  className={`p-3 rounded-lg border cursor-pointer ${
                    selectedCluster === c.clusterName
                      ? "bg-primary/10 border-primary"
                      : "bg-background border-line hover:border-primary/40"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs">{c.clusterName}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Delete cluster "${c.clusterName}"?`)) {
                          postAction({ action: "delete_cluster", cluster: c.clusterName }, `Cluster deleted`);
                        }
                      }}
                      className="text-muted hover:text-red-400"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                  <div className="text-[11px] text-muted mt-1">
                    {c.status} · {c.runningTasksCount || 0} tasks · {c.activeServicesCount || 0} services
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="bg-surface border border-line rounded-panel p-4 space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted">
              Task Definitions ({taskDefinitions.length})
            </div>
            {taskDefinitions.length === 0 ? (
              <div className="text-xs text-muted py-2">None registered.</div>
            ) : (
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {taskDefinitions.map((arn) => (
                  <div key={arn} className="text-[11px] font-mono text-muted truncate py-1 border-b border-line/50 last:border-0">
                    {arn.split("/").pop()}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="bg-surface border border-line rounded-panel overflow-hidden">
            <div className="p-4 border-b border-line text-sm font-semibold">
              Services ({services.length})
            </div>
            <table className="w-full text-left text-xs">
              <thead className="bg-background/50 border-b border-line text-muted uppercase">
                <tr>
                  <th className="px-4 py-2.5">Service</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5">Running / Desired</th>
                  <th className="px-4 py-2.5 text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {services.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-6 text-center text-muted">No services in this cluster.</td></tr>
                ) : (
                  services.map((s) => (
                    <tr key={s.serviceArn}>
                      <td className="px-4 py-2.5 font-medium">{s.serviceName}</td>
                      <td className="px-4 py-2.5">{s.status}</td>
                      <td className="px-4 py-2.5 font-mono">{s.runningCount || 0} / {s.desiredCount || 0}</td>
                      <td className="px-4 py-2.5 text-right">
                        <button onClick={() => setInspectResource(s)} className="p-1 rounded bg-background border border-line">
                          <Code size={13} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="bg-surface border border-line rounded-panel overflow-hidden">
            <div className="p-4 border-b border-line text-sm font-semibold">
              Tasks ({tasks.length})
            </div>
            <table className="w-full text-left text-xs">
              <thead className="bg-background/50 border-b border-line text-muted uppercase">
                <tr>
                  <th className="px-4 py-2.5">Task ID</th>
                  <th className="px-4 py-2.5">Last Status</th>
                  <th className="px-4 py-2.5">Launch Type</th>
                  <th className="px-4 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {tasks.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-6 text-center text-muted">No active tasks in this cluster.</td></tr>
                ) : (
                  tasks.map((t) => (
                    <tr key={t.taskArn}>
                      <td className="px-4 py-2.5 font-mono">{(t.taskArn || "").split("/").pop()}</td>
                      <td className="px-4 py-2.5">
                        <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/15 text-emerald-400">
                          {t.lastStatus}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-muted">{t.launchType || "EC2"}</td>
                      <td className="px-4 py-2.5 text-right">
                        <div className="inline-flex gap-1.5">
                          <button onClick={() => setInspectResource(t)} className="p-1 rounded bg-background border border-line">
                            <Code size={13} />
                          </button>
                          <button
                            onClick={() =>
                              postAction({ action: "stop_task", cluster: selectedCluster, task: t.taskArn }, "Task stopped")
                            }
                            className="p-1 rounded bg-background border border-line text-red-400"
                            title="Stop Task"
                          >
                            <Square size={12} />
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
      </div>

      {mounted && isCreateOpen &&
        createPortal(
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-surface border border-line rounded-panel w-full max-w-md p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold">Create ECS Cluster</h2>
                <button onClick={() => setIsCreateOpen(false)} className="text-muted"><X size={18} /></button>
              </div>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const ok = await postAction({ action: "create_cluster", clusterName: clusterName.trim() }, `Cluster "${clusterName}" created`);
                  if (ok) { setClusterName(""); setIsCreateOpen(false); }
                }}
                className="space-y-4"
              >
                <input required value={clusterName} onChange={(e) => setClusterName(e.target.value)} placeholder="production-cluster" className="w-full px-3 py-2 rounded-lg bg-background border border-line text-sm" />
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
        title={inspectResource?.serviceName || inspectResource?.clusterName || "ECS Resource"}
        subtitle={inspectResource?.serviceArn || inspectResource?.taskArn || ""}
        data={inspectResource}
      />
    </div>
  );
}
