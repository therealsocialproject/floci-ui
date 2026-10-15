"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Zap,
  RefreshCw,
  Play,
  Code,
  Search,
  CheckCircle2,
  AlertCircle,
  X,
  FileCode,
  Sliders,
  Terminal,
} from "lucide-react";
import { useEndpoint } from "@/components/EndpointProvider";
import { useCloudTheme } from "@/components/CloudThemeContext";
import { ResourceDrawer } from "@/components/ResourceDrawer";

export default function LambdaPage() {
  const { endpoint, isConnected } = useEndpoint();
  const { cloudMode, serviceLabels } = useCloudTheme();

  const [functions, setFunctions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [mounted, setMounted] = useState(false);

  // Invoke Modal
  const [isInvokeOpen, setIsInvokeOpen] = useState(false);
  const [selectedFn, setSelectedFn] = useState<any>(null);
  const [payloadInput, setPayloadInput] = useState('{\n  "key1": "value1",\n  "key2": "value2"\n}');
  const [invoking, setInvoking] = useState(false);
  const [invokeResult, setInvokeResult] = useState<any>(null);

  // Inspection Drawer
  const [inspectFn, setInspectFn] = useState<any>(null);

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

  const fetchFunctions = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/floci/lambda?endpoint=${encodeURIComponent(endpoint)}`);
      const data = await res.json();
      if (res.ok) {
        setFunctions(data.functions || []);
      } else {
        showNotification(data.error || "Failed to fetch Lambda functions", true);
      }
    } catch (e: any) {
      showNotification(e.message || "Failed to fetch Lambda functions", true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isConnected) {
      fetchFunctions();
    }
  }, [endpoint, isConnected]);

  const handleInvoke = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFn) return;

    setInvoking(true);
    setInvokeResult(null);

    try {
      let parsedPayload: any = {};
      try {
        parsedPayload = JSON.parse(payloadInput);
      } catch {
        parsedPayload = payloadInput;
      }

      const res = await fetch(`/api/floci/lambda?endpoint=${encodeURIComponent(endpoint)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          functionName: selectedFn.name,
          payload: parsedPayload,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setInvokeResult(data);
        showNotification(`Function executed (Status ${data.statusCode})`);
      } else {
        showNotification(data.error || "Invocation failed", true);
        setInvokeResult({ error: data.error });
      }
    } catch (e: any) {
      showNotification(e.message || "Invocation error", true);
      setInvokeResult({ error: e.message });
    } finally {
      setInvoking(false);
    }
  };

  const filteredFunctions = functions.filter((fn) =>
    fn.name.toLowerCase().includes(search.toLowerCase())
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
              {isAws ? "Lambda Functions" : "Cloud Functions"}
            </h1>
            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-primary/10 text-primary border border-primary/20">
              {functions.length} {functions.length === 1 ? "Function" : "Functions"}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            {isAws
              ? "Serverless compute engine. Run code in response to events without provisioning servers."
              : "Scalable event-driven function platform."}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchFunctions}
            disabled={loading}
            className="p-2 rounded-md border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            title="Refresh functions"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search functions by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-md bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {/* Functions Table */}
      <div className="rounded-lg border border-border overflow-hidden bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-muted/40 border-b border-border text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                <th className="py-3 px-4">Function Name</th>
                <th className="py-3 px-4">Runtime</th>
                <th className="py-3 px-4">Handler</th>
                <th className="py-3 px-4 text-center">Memory</th>
                <th className="py-3 px-4 text-center">Timeout</th>
                <th className="py-3 px-4">Last Modified</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-muted-foreground">
                    <RefreshCw size={20} className="animate-spin mx-auto mb-2" />
                    <span>Loading functions...</span>
                  </td>
                </tr>
              ) : filteredFunctions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-muted-foreground">
                    <Zap size={32} className="mx-auto mb-2 opacity-30" />
                    <p className="font-medium">No functions deployed in this environment</p>
                    <p className="text-[11px] mt-0.5">Deploy functions via AWS CLI, Terraform, or Floci CLI to see them here.</p>
                  </td>
                </tr>
              ) : (
                filteredFunctions.map((fn) => (
                  <tr
                    key={fn.arn}
                    className="border-b border-border/50 hover:bg-muted/20 transition-colors"
                  >
                    <td className="py-3 px-4 font-semibold text-foreground">
                      <div className="flex items-center gap-2">
                        <Zap size={16} className="text-primary" />
                        <span className="font-mono text-xs">{fn.name}</span>
                      </div>
                      {fn.description && (
                        <p className="text-[11px] text-muted-foreground font-normal truncate max-w-xs mt-0.5">
                          {fn.description}
                        </p>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-muted text-foreground border border-border">
                        {fn.runtime}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-muted-foreground">
                      {fn.handler}
                    </td>
                    <td className="py-3 px-4 text-center font-mono">
                      {fn.memorySize} MB
                    </td>
                    <td className="py-3 px-4 text-center font-mono">
                      {fn.timeout}s
                    </td>
                    <td className="py-3 px-4 text-muted-foreground whitespace-nowrap text-[11px]">
                      {fn.lastModified ? new Date(fn.lastModified).toLocaleString() : "—"}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setSelectedFn(fn);
                            setInvokeResult(null);
                            setIsInvokeOpen(true);
                          }}
                          className="px-2.5 py-1 rounded text-[11px] font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer flex items-center gap-1 shadow-sm"
                          title="Test / Invoke Function"
                        >
                          <Play size={12} />
                          <span>Test</span>
                        </button>
                        <button
                          onClick={() => setInspectFn(fn)}
                          className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                          title="Inspect Function JSON"
                        >
                          <Code size={14} />
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

      {/* Invoke & Test Workbench Modal */}
      {isInvokeOpen &&
        mounted &&
        createPortal(
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-xl w-full max-w-2xl p-6 shadow-2xl space-y-4 flex flex-col max-h-[90vh]">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <Play className="text-primary" size={18} />
                  <h3 className="font-bold text-foreground">
                    Invoke Function: <span className="font-mono text-primary">{selectedFn?.name}</span>
                  </h3>
                </div>
                <button
                  onClick={() => setIsInvokeOpen(false)}
                  className="text-muted-foreground hover:text-foreground p-1"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleInvoke} className="space-y-4 text-xs flex-1 overflow-auto">
                <div>
                  <label className="block font-medium text-foreground mb-1">
                    Event JSON Payload
                  </label>
                  <textarea
                    rows={5}
                    value={payloadInput}
                    onChange={(e) => setPayloadInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-md bg-zinc-950 border border-zinc-800 text-zinc-100 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-primary leading-relaxed"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">
                    Runtime: <strong className="text-foreground">{selectedFn?.runtime}</strong> • Handler: <strong className="text-foreground">{selectedFn?.handler}</strong>
                  </span>
                  <button
                    type="submit"
                    disabled={invoking}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-md bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
                  >
                    <Play size={13} className={invoking ? "animate-spin" : ""} />
                    <span>{invoking ? "Invoking..." : "Execute Function"}</span>
                  </button>
                </div>

                {/* Invocation Results */}
                {invokeResult && (
                  <div className="space-y-3 pt-3 border-t border-border">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-foreground flex items-center gap-1.5">
                        <Terminal size={14} className="text-primary" />
                        <span>Execution Output</span>
                      </span>
                      {invokeResult.statusCode && (
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            invokeResult.statusCode >= 200 && invokeResult.statusCode < 300
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                          }`}
                        >
                          Status: {invokeResult.statusCode}
                        </span>
                      )}
                    </div>

                    {/* Returned Payload */}
                    {invokeResult.payload && (
                      <div>
                        <span className="text-[11px] font-semibold text-muted-foreground block mb-1">Response Payload:</span>
                        <div className="rounded bg-zinc-950 p-3 text-emerald-400 font-mono text-xs overflow-x-auto border border-zinc-800 whitespace-pre-wrap">
                          {invokeResult.payload}
                        </div>
                      </div>
                    )}

                    {/* Tailed Execution Logs */}
                    {invokeResult.logs && (
                      <div>
                        <span className="text-[11px] font-semibold text-muted-foreground block mb-1">Execution Log Stream:</span>
                        <div className="rounded bg-zinc-950 p-3 text-zinc-300 font-mono text-[11px] overflow-x-auto border border-zinc-800 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                          {invokeResult.logs}
                        </div>
                      </div>
                    )}

                    {invokeResult.error && (
                      <div className="p-3 rounded bg-rose-950/40 border border-rose-900 text-rose-200 text-xs font-mono">
                        {invokeResult.error}
                      </div>
                    )}
                  </div>
                )}
              </form>

              <div className="pt-3 border-t border-border flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsInvokeOpen(false)}
                  className="px-4 py-1.5 rounded-md bg-muted text-foreground font-medium text-xs hover:bg-muted/80 cursor-pointer"
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
        isOpen={Boolean(inspectFn)}
        onClose={() => setInspectFn(null)}
        title={inspectFn?.name || "Lambda Function"}
        subtitle={inspectFn?.arn}
        badge={inspectFn?.runtime}
        data={inspectFn?.raw || inspectFn}
      />
    </div>
  );
}
