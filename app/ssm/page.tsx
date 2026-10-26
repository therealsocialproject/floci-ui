"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  SlidersHorizontal,
  RefreshCw,
  Plus,
  Trash2,
  Search,
  CheckCircle2,
  AlertCircle,
  X,
  Code,
  Eye,
  EyeOff,
  Copy,
  Check,
  History,
  Lock,
  Layers,
} from "lucide-react";
import { useEndpoint } from "@/components/EndpointProvider";
import { useCloudTheme } from "@/components/CloudThemeContext";
import { ResourceDrawer } from "@/components/ResourceDrawer";

export default function SSMPage() {
  const { endpoint, isConnected } = useEndpoint();
  const { cloudMode, serviceLabels } = useCloudTheme();

  const [parameters, setParameters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [mounted, setMounted] = useState(false);

  // Hidden/revealed state for SecureString values
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Create / Edit Modal
  const [isPutOpen, setIsPutOpen] = useState(false);
  const [paramName, setParamName] = useState("");
  const [paramType, setParamType] = useState<"String" | "StringList" | "SecureString">("String");
  const [paramValue, setParamValue] = useState("");
  const [paramDescription, setParamDescription] = useState("");

  // History Modal
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyParamName, setHistoryParamName] = useState("");
  const [historyItems, setHistoryItems] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Drawer
  const [inspectParam, setInspectParam] = useState<any>(null);

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

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const fetchParameters = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/floci/ssm?endpoint=${encodeURIComponent(endpoint)}&action=list`);
      const data = await res.json();
      if (res.ok) {
        setParameters(data.parameters || []);
      } else {
        showNotification(data.error || "Failed to fetch SSM parameters", true);
      }
    } catch (e: any) {
      showNotification(e.message || "Failed to fetch SSM parameters", true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isConnected) {
      fetchParameters();
    }
  }, [endpoint, isConnected]);

  const toggleReveal = (name: string) => {
    setRevealed((prev) => ({
      ...prev,
      [name]: !prev[name],
    }));
  };

  const handlePutParameter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paramName.trim() || !paramValue) return;

    try {
      const res = await fetch(`/api/floci/ssm?endpoint=${encodeURIComponent(endpoint)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "put",
          name: paramName.trim(),
          type: paramType,
          value: paramValue,
          description: paramDescription.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showNotification(`Parameter "${paramName}" saved (Version ${data.version || 1})`);
        setIsPutOpen(false);
        setParamName("");
        setParamValue("");
        setParamDescription("");
        setParamType("String");
        fetchParameters();
      } else {
        showNotification(data.error || "Failed to save parameter", true);
      }
    } catch (e: any) {
      showNotification(e.message || "Failed to save parameter", true);
    }
  };

  const handleDeleteParameter = async (name: string) => {
    if (!confirm(`Are you sure you want to delete parameter "${name}"?`)) return;

    try {
      const res = await fetch(`/api/floci/ssm?endpoint=${encodeURIComponent(endpoint)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete",
          name,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showNotification(`Parameter "${name}" deleted`);
        fetchParameters();
      } else {
        showNotification(data.error || "Failed to delete parameter", true);
      }
    } catch (e: any) {
      showNotification(e.message || "Failed to delete parameter", true);
    }
  };

  const openHistory = async (name: string) => {
    setHistoryParamName(name);
    setIsHistoryOpen(true);
    setLoadingHistory(true);
    try {
      const res = await fetch(`/api/floci/ssm?endpoint=${encodeURIComponent(endpoint)}&action=history&name=${encodeURIComponent(name)}`);
      const data = await res.json();
      if (res.ok) {
        setHistoryItems(data.history || []);
      } else {
        showNotification(data.error || "Failed to load history", true);
      }
    } catch (e: any) {
      showNotification(e.message || "Failed to load history", true);
    } finally {
      setLoadingHistory(false);
    }
  };

  const filteredParams = parameters.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.description || "").toLowerCase().includes(search.toLowerCase()) ||
    (p.value || "").toLowerCase().includes(search.toLowerCase())
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
            <SlidersHorizontal className="text-amber-500" size={24} />
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              {serviceLabels.ssm}
            </h1>
            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">
              Parameter Store
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Centralized store to manage configuration data, plain text, and encrypted secrets for your workloads.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchParameters}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border text-xs font-medium text-foreground hover:bg-muted transition-colors"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => {
              setParamName("");
              setParamValue("");
              setParamDescription("");
              setParamType("String");
              setIsPutOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-amber-500 text-slate-950 text-xs font-semibold hover:bg-amber-400 transition-colors shadow-sm"
          >
            <Plus size={14} />
            <span>Create Parameter</span>
          </button>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Filter parameters by name or value..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-md bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="border border-border rounded-lg overflow-hidden bg-card">
        <table className="w-full text-left text-xs">
          <thead className="bg-muted/50 border-b border-border text-muted-foreground">
            <tr>
              <th className="py-2.5 px-4 font-medium">Name</th>
              <th className="py-2.5 px-4 font-medium">Type</th>
              <th className="py-2.5 px-4 font-medium">Version</th>
              <th className="py-2.5 px-4 font-medium">Value</th>
              <th className="py-2.5 px-4 font-medium">Tier</th>
              <th className="py-2.5 px-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading && parameters.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-muted-foreground">
                  <RefreshCw size={18} className="animate-spin inline-block mr-2" />
                  Loading parameters...
                </td>
              </tr>
            ) : filteredParams.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-muted-foreground">
                  No parameters found. Create one to store configuration keys and secrets.
                </td>
              </tr>
            ) : (
              filteredParams.map((param) => {
                const isSecure = param.type === "SecureString";
                const isRevealed = !isSecure || Boolean(revealed[param.name]);
                const displayVal = isRevealed ? (param.value || "—") : "••••••••••••••••";

                return (
                  <tr key={param.name} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4 font-mono font-medium text-foreground">
                      <div className="flex items-center gap-1.5">
                        <span className="text-amber-400">{param.name}</span>
                        <button
                          onClick={() => copyToClipboard(param.name, `name-${param.name}`)}
                          className="text-zinc-500 hover:text-foreground"
                          title="Copy Parameter Name"
                        >
                          {copiedKey === `name-${param.name}` ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                        </button>
                      </div>
                      {param.description && (
                        <p className="text-[11px] text-muted-foreground font-sans mt-0.5">{param.description}</p>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {param.type === "SecureString" ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <Lock size={10} />
                          SecureString
                        </span>
                      ) : param.type === "StringList" ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                          StringList
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          String
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-muted-foreground">
                      v{param.version}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2 max-w-sm">
                        <span className="font-mono text-[11px] truncate text-zinc-300" title={isRevealed ? param.value : undefined}>
                          {displayVal}
                        </span>
                        {isSecure && (
                          <button
                            onClick={() => toggleReveal(param.name)}
                            className="text-zinc-500 hover:text-foreground shrink-0"
                            title={isRevealed ? "Hide Secret" : "Reveal Secret"}
                          >
                            {isRevealed ? <EyeOff size={13} /> : <Eye size={13} />}
                          </button>
                        )}
                        {isRevealed && param.value && (
                          <button
                            onClick={() => copyToClipboard(param.value, `val-${param.name}`)}
                            className="text-zinc-500 hover:text-foreground shrink-0"
                            title="Copy Value"
                          >
                            {copiedKey === `val-${param.name}` ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground text-[11px]">
                      {param.tier || "Standard"}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setParamName(param.name);
                            setParamValue(param.value || "");
                            setParamDescription(param.description || "");
                            setParamType(param.type || "String");
                            setIsPutOpen(true);
                          }}
                          className="p-1 rounded text-amber-400 hover:bg-amber-500/10 transition-colors"
                          title="Edit / Update Parameter"
                        >
                          <Plus size={14} />
                        </button>
                        <button
                          onClick={() => openHistory(param.name)}
                          className="p-1 rounded text-blue-400 hover:bg-blue-500/10 transition-colors"
                          title="View Version History"
                        >
                          <History size={14} />
                        </button>
                        <button
                          onClick={() => setInspectParam(param)}
                          className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                          title="Inspect Resource"
                        >
                          <Code size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteParameter(param.name)}
                          className="p-1 rounded text-rose-400 hover:bg-rose-500/10 transition-colors"
                          title="Delete Parameter"
                        >
                          <Trash2 size={14} />
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

      {/* Modal: Put / Update Parameter */}
      {mounted &&
        isPutOpen &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-md p-6">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <h3 className="text-base font-bold text-foreground">
                  {parameters.some((p) => p.name === paramName) ? "Update Parameter" : "Create Parameter"}
                </h3>
                <button
                  onClick={() => setIsPutOpen(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handlePutParameter} className="space-y-4 mt-4 text-xs">
                <div>
                  <label className="block font-medium text-foreground mb-1">Parameter Name</label>
                  <input
                    type="text"
                    required
                    placeholder="/my-app/production/database/url"
                    value={paramName}
                    onChange={(e) => setParamName(e.target.value)}
                    className="w-full px-3 py-2 rounded-md bg-zinc-950 border border-zinc-800 text-zinc-100 font-mono text-[11px] focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Path-style names (e.g. <code>/app/env/key</code>) are recommended for hierarchical organization.
                  </p>
                </div>

                <div>
                  <label className="block font-medium text-foreground mb-1">Type</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["String", "StringList", "SecureString"] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setParamType(t)}
                        className={`py-1.5 px-2 rounded border text-center font-medium transition-colors ${
                          paramType === t
                            ? "bg-amber-500/20 text-amber-300 border-amber-500/50"
                            : "bg-zinc-900 border-zinc-800 text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block font-medium text-foreground mb-1">Description (Optional)</label>
                  <input
                    type="text"
                    placeholder="Primary PostgreSQL connection string"
                    value={paramDescription}
                    onChange={(e) => setParamDescription(e.target.value)}
                    className="w-full px-3 py-2 rounded-md bg-zinc-950 border border-zinc-800 text-zinc-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block font-medium text-foreground mb-1">Value</label>
                  <textarea
                    rows={4}
                    required
                    placeholder={paramType === "StringList" ? "val1,val2,val3" : "parameter-value"}
                    value={paramValue}
                    onChange={(e) => setParamValue(e.target.value)}
                    className="w-full px-3 py-2 rounded-md bg-zinc-950 border border-zinc-800 text-zinc-100 font-mono focus:outline-none focus:ring-1 focus:ring-amber-500 leading-relaxed"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setIsPutOpen(false)}
                    className="px-3 py-1.5 rounded-md border border-border text-foreground hover:bg-muted font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-md bg-amber-500 text-slate-950 font-semibold hover:bg-amber-400 shadow-sm"
                  >
                    Save Parameter
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* Modal: Version History */}
      {mounted &&
        isHistoryOpen &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-lg p-6">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <History size={16} className="text-amber-500" />
                  <h3 className="text-base font-bold text-foreground">Version History: {historyParamName}</h3>
                </div>
                <button
                  onClick={() => setIsHistoryOpen(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="mt-4 max-h-96 overflow-y-auto space-y-3 text-xs">
                {loadingHistory ? (
                  <div className="py-8 text-center text-muted-foreground">
                    <RefreshCw size={18} className="animate-spin inline-block mr-2" />
                    Fetching history...
                  </div>
                ) : historyItems.length === 0 ? (
                  <div className="py-6 text-center text-muted-foreground">No history records found.</div>
                ) : (
                  historyItems.map((hist, idx) => (
                    <div key={hist.Version || idx} className="p-3 bg-zinc-900 border border-zinc-800 rounded-lg space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-amber-400">Version {hist.Version}</span>
                        <span className="text-[11px] text-muted-foreground">
                          {hist.LastModifiedDate ? new Date(hist.LastModifiedDate).toLocaleString() : "—"}
                        </span>
                      </div>
                      <div className="font-mono text-[11px] bg-zinc-950 p-2 rounded border border-zinc-800/80 text-zinc-200 break-all">
                        {hist.Value}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="flex justify-end pt-4 border-t border-border mt-4">
                <button
                  type="button"
                  onClick={() => setIsHistoryOpen(false)}
                  className="px-3 py-1.5 rounded-md border border-border text-foreground hover:bg-muted font-medium text-xs"
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
        isOpen={Boolean(inspectParam)}
        onClose={() => setInspectParam(null)}
        title={inspectParam?.name || "Parameter Details"}
        subtitle={`Version ${inspectParam?.version || 1} · ${inspectParam?.type || "String"}`}
        badge="SSM Parameter"
        data={inspectParam}
      />
    </div>
  );
}
