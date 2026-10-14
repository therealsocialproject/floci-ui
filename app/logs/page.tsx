"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  FileText,
  RefreshCw,
  Plus,
  Trash2,
  Search,
  CheckCircle2,
  AlertCircle,
  X,
  Code,
  FolderOpen,
  Terminal,
  ArrowLeft,
} from "lucide-react";
import { useEndpoint } from "@/components/EndpointProvider";
import { useCloudTheme } from "@/components/CloudThemeContext";
import { ResourceDrawer } from "@/components/ResourceDrawer";

export default function LogsPage() {
  const { endpoint, isConnected } = useEndpoint();
  const { cloudMode, serviceLabels } = useCloudTheme();

  const [logGroups, setLogGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [mounted, setMounted] = useState(false);

  // Active Selected Log Group
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  const [streams, setStreams] = useState<any[]>([]);
  const [loadingStreams, setLoadingStreams] = useState(false);

  // Active Selected Stream & Events
  const [selectedStream, setSelectedStream] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [filterPattern, setFilterPattern] = useState("");

  // Create Log Group Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");

  // Inspection Drawer
  const [inspectData, setInspectData] = useState<any>(null);

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

  const fetchLogGroups = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/floci/logs?endpoint=${encodeURIComponent(endpoint)}&action=groups`);
      const data = await res.json();
      if (res.ok) {
        setLogGroups(data.logGroups || []);
      } else {
        showNotification(data.error || "Failed to fetch log groups", true);
      }
    } catch (e: any) {
      showNotification(e.message || "Failed to fetch log groups", true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isConnected) {
      fetchLogGroups();
    }
  }, [endpoint, isConnected]);

  const fetchStreams = async (group: any) => {
    setSelectedGroup(group);
    setSelectedStream(null);
    setEvents([]);
    setLoadingStreams(true);
    try {
      const res = await fetch(
        `/api/floci/logs?endpoint=${encodeURIComponent(endpoint)}&action=streams&logGroupName=${encodeURIComponent(group.name)}`
      );
      const data = await res.json();
      if (res.ok) {
        setStreams(data.streams || []);
      } else {
        showNotification(data.error || "Failed to fetch streams", true);
      }
    } catch (e: any) {
      showNotification(e.message, true);
    } finally {
      setLoadingStreams(false);
    }
  };

  const fetchEvents = async (stream?: any, pattern = "") => {
    if (!selectedGroup) return;
    if (stream) setSelectedStream(stream);
    setLoadingEvents(true);

    try {
      let url = `/api/floci/logs?endpoint=${encodeURIComponent(endpoint)}&action=events&logGroupName=${encodeURIComponent(selectedGroup.name)}`;
      if (stream?.logStreamName) {
        url += `&logStreamName=${encodeURIComponent(stream.logStreamName)}`;
      }
      if (pattern) {
        url += `&filterPattern=${encodeURIComponent(pattern)}`;
      }

      const res = await fetch(url);
      const data = await res.json();
      if (res.ok) {
        setEvents(data.events || []);
      } else {
        showNotification(data.error || "Failed to fetch log events", true);
      }
    } catch (e: any) {
      showNotification(e.message, true);
    } finally {
      setLoadingEvents(false);
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;

    try {
      const res = await fetch(`/api/floci/logs?endpoint=${encodeURIComponent(endpoint)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create_group", logGroupName: newGroupName.trim() }),
      });
      if (res.ok) {
        showNotification("Log Group created");
        setIsCreateOpen(false);
        setNewGroupName("");
        fetchLogGroups();
      } else {
        const d = await res.json();
        showNotification(d.error || "Failed to create group", true);
      }
    } catch (e: any) {
      showNotification(e.message, true);
    }
  };

  const handleDeleteGroup = async (group: any) => {
    if (!confirm(`Are you sure you want to delete log group ${group.name}?`)) return;
    try {
      const res = await fetch(`/api/floci/logs?endpoint=${encodeURIComponent(endpoint)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete_group", logGroupName: group.name }),
      });
      if (res.ok) {
        showNotification("Log Group deleted");
        if (selectedGroup?.name === group.name) {
          setSelectedGroup(null);
          setSelectedStream(null);
          setEvents([]);
        }
        fetchLogGroups();
      } else {
        const d = await res.json();
        showNotification(d.error || "Failed to delete log group", true);
      }
    } catch (e: any) {
      showNotification(e.message, true);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const filteredGroups = logGroups.filter((g) =>
    g.name.toLowerCase().includes(search.toLowerCase())
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
              {isAws ? "CloudWatch Logs" : "Cloud Logging"}
            </h1>
            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-primary/10 text-primary border border-primary/20">
              {logGroups.length} Log Groups
            </span>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            {isAws
              ? "Monitor, store, and access log files from your applications and AWS resources."
              : "Real-time log management and stream analysis."}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchLogGroups}
            disabled={loading}
            className="p-2 rounded-md border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            title="Refresh log groups"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-primary text-primary-foreground font-semibold text-xs hover:bg-primary/90 transition-colors shadow-sm cursor-pointer"
          >
            <Plus size={15} />
            <span>Create Log Group</span>
          </button>
        </div>
      </div>

      {/* Master/Detail Views */}
      {!selectedGroup ? (
        /* Log Groups List View */
        <div className="space-y-4">
          <div className="relative flex-1 max-w-sm">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search log groups..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-md bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="rounded-lg border border-border overflow-hidden bg-card">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-muted/40 border-b border-border text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    <th className="py-3 px-4">Log Group Name</th>
                    <th className="py-3 px-4 text-center">Stored Bytes</th>
                    <th className="py-3 px-4">Retention</th>
                    <th className="py-3 px-4">Creation Time</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-muted-foreground">
                        <RefreshCw size={20} className="animate-spin mx-auto mb-2" />
                        <span>Loading log groups...</span>
                      </td>
                    </tr>
                  ) : filteredGroups.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-muted-foreground">
                        <FileText size={32} className="mx-auto mb-2 opacity-30" />
                        <p className="font-medium">No log groups found</p>
                        <p className="text-[11px] mt-0.5">Create a log group to begin collecting logs.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredGroups.map((group) => (
                      <tr
                        key={group.arn || group.name}
                        className="border-b border-border/50 hover:bg-muted/20 transition-colors"
                      >
                        <td className="py-3 px-4 font-semibold text-foreground">
                          <button
                            onClick={() => fetchStreams(group)}
                            className="flex items-center gap-2 hover:text-primary transition-colors text-left font-mono text-xs cursor-pointer"
                          >
                            <FolderOpen size={15} className="text-primary flex-shrink-0" />
                            <span>{group.name}</span>
                          </button>
                        </td>
                        <td className="py-3 px-4 text-center font-mono">
                          {formatBytes(group.storedBytes)}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">
                          {group.retentionInDays}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground whitespace-nowrap text-[11px]">
                          {group.creationTime ? new Date(group.creationTime).toLocaleString() : "—"}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => fetchStreams(group)}
                              className="px-2.5 py-1 rounded text-[11px] font-medium bg-muted hover:bg-muted/80 text-foreground border border-border transition-colors cursor-pointer"
                            >
                              Explore Streams
                            </button>
                            <button
                              onClick={() => setInspectData(group.raw || group)}
                              className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                              title="Inspect JSON"
                            >
                              <Code size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteGroup(group)}
                              className="p-1.5 rounded text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                              title="Delete log group"
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
        </div>
      ) : (
        /* Log Streams & Events View */
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-muted/20 p-3 rounded-lg border border-border">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedGroup(null)}
                className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer flex items-center gap-1 text-xs"
              >
                <ArrowLeft size={16} />
                <span>Back to Log Groups</span>
              </button>
              <span className="text-muted-foreground">/</span>
              <span className="font-mono font-bold text-foreground text-xs">{selectedGroup.name}</span>
            </div>

            <button
              onClick={() => fetchStreams(selectedGroup)}
              className="p-1.5 rounded border border-border hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
              title="Refresh streams"
            >
              <RefreshCw size={14} className={loadingStreams ? "animate-spin" : ""} />
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Streams List */}
            <div className="lg:col-span-1 rounded-lg border border-border bg-card p-3 space-y-3">
              <span className="text-xs font-bold text-foreground block">
                Log Streams ({streams.length})
              </span>
              <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-1">
                {loadingStreams ? (
                  <div className="py-6 text-center text-xs text-muted-foreground">Loading streams...</div>
                ) : streams.length === 0 ? (
                  <div className="py-6 text-center text-xs text-muted-foreground">No streams found</div>
                ) : (
                  streams.map((s) => (
                    <button
                      key={s.logStreamName}
                      onClick={() => fetchEvents(s)}
                      className={`w-full text-left p-2.5 rounded-md border text-xs transition-colors cursor-pointer block ${
                        selectedStream?.logStreamName === s.logStreamName
                          ? "bg-primary/10 text-primary border-primary/30 font-semibold"
                          : "border-border/60 hover:bg-muted/40 text-foreground"
                      }`}
                    >
                      <span className="font-mono text-[11px] truncate block">{s.logStreamName}</span>
                      <span className="text-[10px] text-muted-foreground mt-0.5 block">
                        Last Event: {s.lastEventTimestamp ? new Date(s.lastEventTimestamp).toLocaleTimeString() : "Never"}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Events Console */}
            <div className="lg:col-span-2 rounded-lg border border-border bg-card p-4 space-y-3 flex flex-col min-h-[450px]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-border">
                <div className="flex items-center gap-2">
                  <Terminal size={16} className="text-primary" />
                  <span className="font-bold text-xs text-foreground">
                    {selectedStream ? `Stream: ${selectedStream.logStreamName}` : "Select a stream to view events"}
                  </span>
                </div>
                {selectedStream && (
                  <button
                    onClick={() => fetchEvents(selectedStream)}
                    className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                    title="Refresh events"
                  >
                    <RefreshCw size={14} className={loadingEvents ? "animate-spin" : ""} />
                  </button>
                )}
              </div>

              {/* Filter pattern */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder='Filter pattern (e.g. "ERROR", "RequestId")...'
                  value={filterPattern}
                  onChange={(e) => setFilterPattern(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && fetchEvents(selectedStream, filterPattern)}
                  className="flex-1 px-3 py-1.5 text-xs rounded-md bg-muted/40 border border-border text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <button
                  onClick={() => fetchEvents(selectedStream, filterPattern)}
                  className="px-3 py-1.5 rounded-md bg-muted text-foreground text-xs font-semibold hover:bg-muted/80 cursor-pointer"
                >
                  Filter
                </button>
              </div>

              {/* Event Logs Viewport */}
              <div className="flex-1 rounded-lg bg-zinc-950 p-3 border border-zinc-800 text-zinc-300 font-mono text-[11px] overflow-auto max-h-[450px] space-y-1 leading-relaxed">
                {loadingEvents ? (
                  <div className="py-12 text-center text-muted-foreground">Loading log events...</div>
                ) : events.length === 0 ? (
                  <div className="py-12 text-center text-zinc-500">
                    {selectedStream ? "No log events recorded in this stream." : "Pick a stream on the left to inspect logs."}
                  </div>
                ) : (
                  events.map((ev, i) => (
                    <div key={i} className="hover:bg-zinc-900/60 p-1 rounded transition-colors flex items-start gap-2">
                      <span className="text-zinc-500 text-[10px] whitespace-nowrap select-none">
                        {new Date(ev.timestamp).toISOString().slice(11, 23)}
                      </span>
                      <span className="text-zinc-200 whitespace-pre-wrap break-all flex-1">
                        {ev.message}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Log Group Modal */}
      {isCreateOpen &&
        mounted &&
        createPortal(
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-xl w-full max-w-md p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <FileText className="text-primary" size={18} />
                  <h3 className="font-bold text-foreground">Create Log Group</h3>
                </div>
                <button
                  onClick={() => setIsCreateOpen(false)}
                  className="text-muted-foreground hover:text-foreground p-1"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCreateGroup} className="space-y-4 text-xs">
                <div>
                  <label className="block font-medium text-foreground mb-1">Log Group Name</label>
                  <input
                    type="text"
                    required
                    placeholder="/aws/lambda/my-service"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    className="w-full px-3 py-2 rounded-md bg-muted/40 border border-border text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Typically namespaced with forward slashes (e.g. /aws/lambda/...)
                  </p>
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
                    Create
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* Resource Inspection Drawer */}
      <ResourceDrawer
        isOpen={Boolean(inspectData)}
        onClose={() => setInspectData(null)}
        title={inspectData?.name || "Log Group"}
        subtitle={inspectData?.arn}
        badge="CloudWatch Logs"
        data={inspectData}
      />
    </div>
  );
}
