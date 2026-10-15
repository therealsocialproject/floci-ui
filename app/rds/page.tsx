"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Database,
  RefreshCw,
  Plus,
  Trash2,
  Search,
  CheckCircle2,
  AlertCircle,
  X,
  Code,
  RotateCcw,
  Camera,
  Server,
  HardDrive,
  Copy,
  Check,
  Shield,
  Layers,
} from "lucide-react";
import { useEndpoint } from "@/components/EndpointProvider";
import { useCloudTheme } from "@/components/CloudThemeContext";
import { ResourceDrawer } from "@/components/ResourceDrawer";

type RDSTab = "instances" | "clusters" | "snapshots";

export default function RDSPage() {
  const { endpoint, isConnected } = useEndpoint();
  const { cloudMode, serviceLabels } = useCloudTheme();

  const [activeTab, setActiveTab] = useState<RDSTab>("instances");
  const [data, setData] = useState<{
    instances: any[];
    clusters: any[];
    snapshots: any[];
  }>({ instances: [], clusters: [], snapshots: [] });

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [mounted, setMounted] = useState(false);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [dbIdentifier, setDbIdentifier] = useState("");
  const [engine, setEngine] = useState("postgres");
  const [instanceClass, setInstanceClass] = useState("db.t3.micro");
  const [masterUsername, setMasterUsername] = useState("postgres");
  const [masterPassword, setMasterPassword] = useState("FlociSecretPass123!");
  const [allocatedStorage, setAllocatedStorage] = useState(20);

  const [isSnapshotModalOpen, setIsSnapshotModalOpen] = useState(false);
  const [snapshotTargetInstance, setSnapshotTargetInstance] = useState<string | null>(null);
  const [snapshotIdentifierInput, setSnapshotIdentifierInput] = useState("");

  // Drawer
  const [inspectItem, setInspectItem] = useState<any>(null);
  const [copiedEndpoint, setCopiedEndpoint] = useState<string | null>(null);

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

  const fetchRDSData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/floci/rds?endpoint=${encodeURIComponent(endpoint)}&resource=all`);
      const json = await res.json();
      if (json.success) {
        setData({
          instances: json.data?.instances || [],
          clusters: json.data?.clusters || [],
          snapshots: json.data?.snapshots || [],
        });
      } else {
        showNotification(json.error || "Failed to fetch RDS data", true);
      }
    } catch (e: any) {
      showNotification(e.message || "Failed to fetch RDS data", true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isConnected) {
      fetchRDSData();
    }
  }, [endpoint, isConnected]);

  const handleCreateInstance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dbIdentifier.trim()) return;

    setActionLoading(true);
    try {
      const res = await fetch("/api/floci/rds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint,
          action: "create-instance",
          dbInstanceIdentifier: dbIdentifier.trim(),
          engine,
          dbInstanceClass: instanceClass,
          masterUsername: masterUsername.trim(),
          masterUserPassword: masterPassword,
          allocatedStorage,
        }),
      });

      const json = await res.json();
      if (json.success) {
        showNotification(json.message || "Database created successfully");
        setIsCreateOpen(false);
        setDbIdentifier("");
        await fetchRDSData();
      } else {
        showNotification(json.error || "Failed to create database instance", true);
      }
    } catch (err: any) {
      showNotification(err.message || "Network error", true);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteInstance = async (id: string) => {
    if (!confirm(`Are you sure you want to delete DB instance '${id}'? This cannot be undone.`)) return;

    setActionLoading(true);
    try {
      const res = await fetch("/api/floci/rds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint,
          action: "delete-instance",
          dbInstanceIdentifier: id,
          skipFinalSnapshot: true,
        }),
      });

      const json = await res.json();
      if (json.success) {
        showNotification(json.message || "Database deleted");
        await fetchRDSData();
      } else {
        showNotification(json.error || "Failed to delete database", true);
      }
    } catch (err: any) {
      showNotification(err.message || "Network error", true);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRebootInstance = async (id: string) => {
    if (!confirm(`Reboot DB instance '${id}'?`)) return;

    setActionLoading(true);
    try {
      const res = await fetch("/api/floci/rds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint,
          action: "reboot-instance",
          dbInstanceIdentifier: id,
        }),
      });

      const json = await res.json();
      if (json.success) {
        showNotification(json.message || "Reboot initiated");
        await fetchRDSData();
      } else {
        showNotification(json.error || "Failed to reboot database", true);
      }
    } catch (err: any) {
      showNotification(err.message || "Network error", true);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateSnapshot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!snapshotTargetInstance || !snapshotIdentifierInput.trim()) return;

    setActionLoading(true);
    try {
      const res = await fetch("/api/floci/rds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint,
          action: "create-snapshot",
          dbInstanceIdentifier: snapshotTargetInstance,
          dbSnapshotIdentifier: snapshotIdentifierInput.trim(),
        }),
      });

      const json = await res.json();
      if (json.success) {
        showNotification(json.message || "Snapshot created");
        setIsSnapshotModalOpen(false);
        setSnapshotIdentifierInput("");
        setSnapshotTargetInstance(null);
        await fetchRDSData();
      } else {
        showNotification(json.error || "Failed to create snapshot", true);
      }
    } catch (err: any) {
      showNotification(err.message || "Network error", true);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteSnapshot = async (id: string) => {
    if (!confirm(`Delete snapshot '${id}'?`)) return;

    setActionLoading(true);
    try {
      const res = await fetch("/api/floci/rds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint,
          action: "delete-snapshot",
          dbSnapshotIdentifier: id,
        }),
      });

      const json = await res.json();
      if (json.success) {
        showNotification(json.message || "Snapshot deleted");
        await fetchRDSData();
      } else {
        showNotification(json.error || "Failed to delete snapshot", true);
      }
    } catch (err: any) {
      showNotification(err.message || "Network error", true);
    } finally {
      setActionLoading(false);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedEndpoint(key);
    setTimeout(() => setCopiedEndpoint(null), 2000);
  };

  const filteredInstances = data.instances.filter((i: any) =>
    (i.dbInstanceIdentifier || "").toLowerCase().includes(search.toLowerCase()) ||
    (i.engine || "").toLowerCase().includes(search.toLowerCase())
  );

  const filteredClusters = data.clusters.filter((c: any) =>
    (c.dbClusterIdentifier || "").toLowerCase().includes(search.toLowerCase()) ||
    (c.engine || "").toLowerCase().includes(search.toLowerCase())
  );

  const filteredSnapshots = data.snapshots.filter((s: any) =>
    (s.dbSnapshotIdentifier || "").toLowerCase().includes(search.toLowerCase()) ||
    (s.dbInstanceIdentifier || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 resource-page">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed top-20 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-control shadow-2xl backdrop-blur-md text-xs border ${
            notification.isError
              ? "bg-danger-soft border-rose-500/50 text-danger"
              : "bg-surface border-emerald-500/50 text-emerald-400"
          }`}
        >
          {notification.isError ? (
            <AlertCircle className="w-4 h-4 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          )}
          <span>{notification.msg}</span>
          <button onClick={() => setNotification(null)} className="ml-2 hover:opacity-75">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-line pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-ink">
                {isAws ? "Relational Database Service (RDS)" : "Cloud SQL & Databases"}
              </h1>
              <p className="text-xs text-muted">
                Manage managed SQL database instances, clusters, and snapshots powered by Floci
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchRDSData}
            disabled={loading}
            className="p-2 bg-surface hover:bg-subtle text-muted hover:text-ink border border-line rounded-control text-xs font-medium transition-colors flex items-center gap-1.5"
            title="Refresh database list"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="px-3.5 py-2 bg-action text-white hover:opacity-90 rounded-control text-xs font-semibold shadow-sm transition-opacity flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            Create Database
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface border border-line rounded-panel p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-400">
            <Server className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-ink">{data.instances.length}</div>
            <div className="text-[11px] text-muted">DB Instances</div>
          </div>
        </div>

        <div className="bg-surface border border-line rounded-panel p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-purple-500/10 text-purple-400">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-ink">{data.clusters.length}</div>
            <div className="text-[11px] text-muted">DB Clusters</div>
          </div>
        </div>

        <div className="bg-surface border border-line rounded-panel p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400">
            <Camera className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-ink">{data.snapshots.length}</div>
            <div className="text-[11px] text-muted">Snapshots</div>
          </div>
        </div>
      </div>

      {/* Tabs and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex bg-subtle p-1 rounded-control border border-line self-start">
          <button
            onClick={() => setActiveTab("instances")}
            className={`px-3 py-1.5 rounded-[4px] text-xs font-semibold transition-all ${
              activeTab === "instances"
                ? "bg-action text-white shadow-sm"
                : "text-muted hover:text-ink"
            }`}
          >
            Instances ({data.instances.length})
          </button>
          <button
            onClick={() => setActiveTab("clusters")}
            className={`px-3 py-1.5 rounded-[4px] text-xs font-semibold transition-all ${
              activeTab === "clusters"
                ? "bg-action text-white shadow-sm"
                : "text-muted hover:text-ink"
            }`}
          >
            Clusters ({data.clusters.length})
          </button>
          <button
            onClick={() => setActiveTab("snapshots")}
            className={`px-3 py-1.5 rounded-[4px] text-xs font-semibold transition-all ${
              activeTab === "snapshots"
                ? "bg-action text-white shadow-sm"
                : "text-muted hover:text-ink"
            }`}
          >
            Snapshots ({data.snapshots.length})
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            placeholder={`Search ${activeTab}...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-surface border border-line pl-8 pr-3 py-1.5 rounded-control text-xs text-ink focus:outline-none focus:border-amber-400 font-mono"
          />
        </div>
      </div>

      {/* Content Tables */}
      {loading ? (
        <div className="bg-surface border border-line rounded-panel p-12 text-center text-muted">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-amber-400 mb-3" />
          Loading RDS {activeTab}...
        </div>
      ) : activeTab === "instances" ? (
        filteredInstances.length === 0 ? (
          <div className="bg-surface border border-line rounded-panel p-12 text-center text-muted space-y-3">
            <Database className="w-8 h-8 mx-auto text-muted/50" />
            <p>No database instances found.</p>
            <button
              onClick={() => setIsCreateOpen(true)}
              className="text-xs font-semibold text-amber-400 hover:underline"
            >
              + Create your first database instance
            </button>
          </div>
        ) : (
          <div className="bg-surface border border-line rounded-panel overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-subtle border-b border-line text-muted uppercase font-semibold">
                  <tr>
                    <th className="px-5 py-3">DB Identifier</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Engine</th>
                    <th className="px-5 py-3">Class</th>
                    <th className="px-5 py-3">Endpoint</th>
                    <th className="px-5 py-3">Storage</th>
                    <th className="px-5 py-3">Master User</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line font-mono">
                  {filteredInstances.map((inst: any) => {
                    const epString = inst.endpoint?.address
                      ? `${inst.endpoint.address}:${inst.endpoint.port || 5432}`
                      : "Pending...";
                    return (
                      <tr key={inst.dbInstanceIdentifier} className="hover:bg-subtle transition-colors">
                        <td className="px-5 py-3 font-semibold text-ink">
                          {inst.dbInstanceIdentifier}
                        </td>
                        <td className="px-5 py-3 font-sans">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                              inst.dbInstanceStatus === "available"
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                inst.dbInstanceStatus === "available"
                                  ? "bg-emerald-400"
                                  : "bg-amber-400 animate-pulse"
                              }`}
                            />
                            {inst.dbInstanceStatus || "unknown"}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-ink font-sans">
                          <span className="capitalize">{inst.engine}</span>{" "}
                          <span className="text-[10px] text-muted">v{inst.engineVersion || "default"}</span>
                        </td>
                        <td className="px-5 py-3 text-muted text-[11px]">{inst.dbInstanceClass}</td>
                        <td className="px-5 py-3 text-ink text-[11px]">
                          {inst.endpoint?.address ? (
                            <div className="flex items-center gap-1.5">
                              <span className="truncate max-w-[180px]" title={epString}>
                                {epString}
                              </span>
                              <button
                                onClick={() => copyToClipboard(epString, inst.dbInstanceIdentifier)}
                                className="text-muted hover:text-ink p-0.5"
                                title="Copy endpoint"
                              >
                                {copiedEndpoint === inst.dbInstanceIdentifier ? (
                                  <Check className="w-3 h-3 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                          ) : (
                            <span className="text-muted italic">pending</span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-muted font-sans text-[11px]">
                          {inst.allocatedStorage} GB
                        </td>
                        <td className="px-5 py-3 text-muted">{inst.masterUsername}</td>
                        <td className="px-5 py-3 text-right font-sans">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => {
                                setSnapshotTargetInstance(inst.dbInstanceIdentifier);
                                setSnapshotIdentifierInput(`${inst.dbInstanceIdentifier}-snap-${Date.now()}`);
                                setIsSnapshotModalOpen(true);
                              }}
                              title="Take snapshot"
                              className="p-1 text-muted hover:text-ink rounded transition-colors"
                            >
                              <Camera className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleRebootInstance(inst.dbInstanceIdentifier)}
                              title="Reboot instance"
                              className="p-1 text-muted hover:text-amber-400 rounded transition-colors"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setInspectItem(inst)}
                              title="Inspect JSON"
                              className="p-1 text-muted hover:text-ink rounded transition-colors cursor-pointer"
                            >
                              <Code className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteInstance(inst.dbInstanceIdentifier)}
                              title="Delete instance"
                              className="p-1 text-muted hover:text-rose-400 rounded transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : activeTab === "clusters" ? (
        filteredClusters.length === 0 ? (
          <div className="bg-surface border border-line rounded-panel p-12 text-center text-muted space-y-3">
            <Layers className="w-8 h-8 mx-auto text-muted/50" />
            <p>No database clusters found.</p>
          </div>
        ) : (
          <div className="bg-surface border border-line rounded-panel overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-subtle border-b border-line text-muted uppercase font-semibold">
                <tr>
                  <th className="px-5 py-3">Cluster Identifier</th>
                  <th className="px-5 py-3">Engine</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Endpoint</th>
                  <th className="px-5 py-3">Members</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line font-mono">
                {filteredClusters.map((c: any) => (
                  <tr key={c.dbClusterIdentifier} className="hover:bg-subtle transition-colors">
                    <td className="px-5 py-3 font-semibold text-ink">{c.dbClusterIdentifier}</td>
                    <td className="px-5 py-3 text-ink font-sans">{c.engine}</td>
                    <td className="px-5 py-3 font-sans">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {c.status || "available"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-muted text-[11px] truncate max-w-xs">{c.endpoint || "-"}</td>
                    <td className="px-5 py-3 text-muted text-[11px] font-sans">
                      {c.dbClusterMembers?.length || 0} instances
                    </td>
                    <td className="px-5 py-3 text-right font-sans">
                      <button
                        onClick={() => setInspectItem(c)}
                        title="Inspect Cluster JSON"
                        className="p-1 text-muted hover:text-ink rounded transition-colors"
                      >
                        <Code className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : (
        filteredSnapshots.length === 0 ? (
          <div className="bg-surface border border-line rounded-panel p-12 text-center text-muted space-y-3">
            <Camera className="w-8 h-8 mx-auto text-muted/50" />
            <p>No database snapshots found.</p>
          </div>
        ) : (
          <div className="bg-surface border border-line rounded-panel overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-subtle border-b border-line text-muted uppercase font-semibold">
                <tr>
                  <th className="px-5 py-3">Snapshot Identifier</th>
                  <th className="px-5 py-3">Source Instance</th>
                  <th className="px-5 py-3">Engine</th>
                  <th className="px-5 py-3">Storage</th>
                  <th className="px-5 py-3">Created</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line font-mono">
                {filteredSnapshots.map((s: any) => (
                  <tr key={s.dbSnapshotIdentifier} className="hover:bg-subtle transition-colors">
                    <td className="px-5 py-3 font-semibold text-ink">{s.dbSnapshotIdentifier}</td>
                    <td className="px-5 py-3 text-ink">{s.dbInstanceIdentifier}</td>
                    <td className="px-5 py-3 text-muted font-sans">{s.engine}</td>
                    <td className="px-5 py-3 text-muted font-sans">{s.allocatedStorage} GB</td>
                    <td className="px-5 py-3 text-muted font-sans text-[11px]">
                      {s.snapshotCreateTime ? new Date(s.snapshotCreateTime).toLocaleString() : "-"}
                    </td>
                    <td className="px-5 py-3 text-right font-sans">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setInspectItem(s)}
                          title="Inspect Snapshot JSON"
                          className="p-1 text-muted hover:text-ink rounded transition-colors"
                        >
                          <Code className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteSnapshot(s.dbSnapshotIdentifier)}
                          title="Delete snapshot"
                          className="p-1 text-muted hover:text-rose-400 rounded transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* Create Database Instance Modal */}
      {isCreateOpen && mounted && createPortal(
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsCreateOpen(false);
          }}
        >
          <div className="bg-surface border border-line rounded-panel w-full max-w-lg p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-ink text-base">
                  {isAws ? "Create RDS Database" : "Create Cloud SQL Instance"}
                </h3>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-muted hover:text-ink p-1 hover:bg-subtle rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateInstance} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-ink mb-1.5">
                  DB Instance Identifier
                </label>
                <input
                  type="text"
                  placeholder="e.g. pg-service-db-1"
                  value={dbIdentifier}
                  onChange={(e) => setDbIdentifier(e.target.value)}
                  required
                  className="w-full bg-subtle border border-line px-3.5 py-2 rounded-control text-xs text-ink focus:outline-none focus:border-amber-400 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1.5">Engine</label>
                  <select
                    value={engine}
                    onChange={(e) => setEngine(e.target.value)}
                    className="w-full bg-subtle border border-line px-3 py-2 rounded-control text-xs text-ink focus:outline-none focus:border-amber-400"
                  >
                    <option value="postgres">PostgreSQL</option>
                    <option value="mysql">MySQL</option>
                    <option value="mariadb">MariaDB</option>
                    <option value="aurora-postgresql">Aurora PostgreSQL</option>
                    <option value="aurora-mysql">Aurora MySQL</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink mb-1.5">DB Instance Class</label>
                  <select
                    value={instanceClass}
                    onChange={(e) => setInstanceClass(e.target.value)}
                    className="w-full bg-subtle border border-line px-3 py-2 rounded-control text-xs text-ink focus:outline-none focus:border-amber-400 font-mono"
                  >
                    <option value="db.t3.micro">db.t3.micro (2 vCPU, 1 GB)</option>
                    <option value="db.t3.small">db.t3.small (2 vCPU, 2 GB)</option>
                    <option value="db.t3.medium">db.t3.medium (2 vCPU, 4 GB)</option>
                    <option value="db.m5.large">db.m5.large (2 vCPU, 8 GB)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1.5">Master Username</label>
                  <input
                    type="text"
                    value={masterUsername}
                    onChange={(e) => setMasterUsername(e.target.value)}
                    required
                    className="w-full bg-subtle border border-line px-3.5 py-2 rounded-control text-xs text-ink focus:outline-none focus:border-amber-400 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink mb-1.5">Master Password</label>
                  <input
                    type="password"
                    value={masterPassword}
                    onChange={(e) => setMasterPassword(e.target.value)}
                    required
                    className="w-full bg-subtle border border-line px-3.5 py-2 rounded-control text-xs text-ink focus:outline-none focus:border-amber-400 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink mb-1.5">
                  Allocated Storage (GB)
                </label>
                <input
                  type="number"
                  min={5}
                  max={1000}
                  value={allocatedStorage}
                  onChange={(e) => setAllocatedStorage(Number(e.target.value))}
                  className="w-full bg-subtle border border-line px-3.5 py-2 rounded-control text-xs text-ink focus:outline-none focus:border-amber-400 font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-line">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 text-xs text-muted hover:text-ink rounded-control"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 text-xs font-semibold bg-action text-white hover:opacity-90 rounded-control flex items-center gap-1.5"
                >
                  {actionLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  Create Database
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Snapshot Modal */}
      {isSnapshotModalOpen && mounted && createPortal(
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsSnapshotModalOpen(false);
          }}
        >
          <div className="bg-surface border border-line rounded-panel w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-ink text-base">Take DB Snapshot</h3>
              </div>
              <button
                onClick={() => setIsSnapshotModalOpen(false)}
                className="text-muted hover:text-ink p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSnapshot} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-ink mb-1.5">Source Instance</label>
                <input
                  type="text"
                  value={snapshotTargetInstance || ""}
                  disabled
                  className="w-full bg-subtle border border-line px-3.5 py-2 rounded-control text-xs text-muted font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink mb-1.5">Snapshot Identifier</label>
                <input
                  type="text"
                  value={snapshotIdentifierInput}
                  onChange={(e) => setSnapshotIdentifierInput(e.target.value)}
                  required
                  className="w-full bg-subtle border border-line px-3.5 py-2 rounded-control text-xs text-ink focus:outline-none focus:border-amber-400 font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-line">
                <button
                  type="button"
                  onClick={() => setIsSnapshotModalOpen(false)}
                  className="px-4 py-2 text-xs text-muted hover:text-ink"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 text-xs font-semibold bg-action text-white hover:opacity-90 rounded-control flex items-center gap-1.5"
                >
                  {actionLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
                  Take Snapshot
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Resource Inspection Drawer */}
      <ResourceDrawer
        isOpen={Boolean(inspectItem)}
        onClose={() => setInspectItem(null)}
        title={inspectItem?.dbInstanceIdentifier || inspectItem?.dbClusterIdentifier || inspectItem?.dbSnapshotIdentifier || "RDS Resource"}
        subtitle={inspectItem?.engine ? `Engine: ${inspectItem.engine}` : undefined}
        badge={`RDS ${activeTab.toUpperCase()}`}
        data={inspectItem}
      />
    </div>
  );
}
