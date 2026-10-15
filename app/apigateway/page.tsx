"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Globe,
  RefreshCw,
  Plus,
  Trash2,
  Search,
  CheckCircle2,
  AlertCircle,
  X,
  Code,
  Send,
  ExternalLink,
  Layers,
  Copy,
  Check,
  ChevronRight,
  Terminal,
  Activity,
  Network,
} from "lucide-react";
import { useEndpoint } from "@/components/EndpointProvider";
import { useCloudTheme } from "@/components/CloudThemeContext";
import { ResourceDrawer } from "@/components/ResourceDrawer";

export default function ApiGatewayPage() {
  const { endpoint, isConnected } = useEndpoint();
  const { cloudMode, serviceLabels } = useCloudTheme();

  const [apis, setApis] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [mounted, setMounted] = useState(false);

  // Selected API for explorer
  const [selectedApi, setSelectedApi] = useState<any>(null);
  const [apiRoutesData, setApiRoutesData] = useState<{ resources?: any[]; routes?: any[]; stages?: string[] } | null>(null);
  const [loadingRoutes, setLoadingRoutes] = useState(false);

  // Request Tester State
  const [testMethod, setTestMethod] = useState("GET");
  const [testStage, setTestStage] = useState("_user_request_");
  const [testPath, setTestPath] = useState("/");
  const [testHeaders, setTestHeaders] = useState("Content-Type: application/json");
  const [testBody, setTestBody] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [testResponse, setTestResponse] = useState<any>(null);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newApiName, setNewApiName] = useState("");
  const [newApiProtocol, setNewApiProtocol] = useState<"REST" | "HTTP">("REST");
  const [newApiDescription, setNewApiDescription] = useState("");

  // Drawer & Clipboard
  const [inspectItem, setInspectItem] = useState<any>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

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

  const fetchApis = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/floci/apigateway?endpoint=${encodeURIComponent(endpoint)}&resource=all`);
      const json = await res.json();
      if (json.success) {
        setApis(json.apis || []);
        if (json.apis && json.apis.length > 0 && !selectedApi) {
          selectApi(json.apis[0]);
        }
      } else {
        showNotification(json.error || "Failed to load APIs", true);
      }
    } catch (e: any) {
      showNotification(e.message || "Failed to load APIs", true);
    } finally {
      setLoading(false);
    }
  };

  const selectApi = async (api: any) => {
    setSelectedApi(api);
    setTestResponse(null);
    setLoadingRoutes(true);
    try {
      const res = await fetch(
        `/api/floci/apigateway?endpoint=${encodeURIComponent(endpoint)}&resource=routes&apiId=${encodeURIComponent(
          api.id
        )}&apiType=${encodeURIComponent(api.type)}`
      );
      const json = await res.json();
      if (json.success) {
        setApiRoutesData({
          resources: json.resources,
          routes: json.routes,
          stages: json.stages,
        });
        if (json.stages && json.stages.length > 0) {
          setTestStage(json.stages[0]);
        } else {
          setTestStage(api.type === "REST" ? "_user_request_" : "$default");
        }
      }
    } catch (err: any) {
      console.warn("Could not load API routes:", err);
    } finally {
      setLoadingRoutes(false);
    }
  };

  useEffect(() => {
    if (isConnected) {
      fetchApis();
    }
  }, [endpoint, isConnected]);

  const handleCreateApi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newApiName.trim()) return;

    setActionLoading(true);
    try {
      const res = await fetch("/api/floci/apigateway", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint,
          action: "create-api",
          name: newApiName.trim(),
          protocol: newApiProtocol,
          description: newApiDescription.trim(),
        }),
      });

      const json = await res.json();
      if (json.success) {
        showNotification(json.message || "API created successfully");
        setIsCreateOpen(false);
        setNewApiName("");
        setNewApiDescription("");
        await fetchApis();
        if (json.api) {
          selectApi(json.api);
        }
      } else {
        showNotification(json.error || "Failed to create API", true);
      }
    } catch (err: any) {
      showNotification(err.message || "Network error", true);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteApi = async (api: any) => {
    if (!confirm(`Delete API '${api.name}' (${api.id})?`)) return;

    setActionLoading(true);
    try {
      const res = await fetch("/api/floci/apigateway", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint,
          action: "delete-api",
          apiId: api.id,
          type: api.type,
        }),
      });

      const json = await res.json();
      if (json.success) {
        showNotification(json.message || "API deleted");
        if (selectedApi?.id === api.id) {
          setSelectedApi(null);
          setApiRoutesData(null);
        }
        await fetchApis();
      } else {
        showNotification(json.error || "Failed to delete API", true);
      }
    } catch (err: any) {
      showNotification(err.message || "Network error", true);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendTestRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApi) return;

    setIsSending(true);
    setTestResponse(null);

    // Build the request URL
    const cleanPath = testPath.startsWith("/") ? testPath : `/${testPath}`;
    let invokeUrl = "";
    if (selectedApi.type === "REST") {
      const stagePart = testStage ? `/${testStage}` : "/_user_request_";
      invokeUrl = `${endpoint}/restapis/${selectedApi.id}${stagePart}${cleanPath}`;
    } else {
      invokeUrl = `${endpoint}/${selectedApi.id}${cleanPath}`;
    }

    // Parse headers
    const parsedHeaders: Record<string, string> = {};
    if (testHeaders.trim()) {
      testHeaders.split("\n").forEach((line) => {
        const colonIndex = line.indexOf(":");
        if (colonIndex > 0) {
          const key = line.slice(0, colonIndex).trim();
          const val = line.slice(colonIndex + 1).trim();
          if (key) parsedHeaders[key] = val;
        }
      });
    }

    try {
      const res = await fetch("/api/floci/apigateway", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "test-invoke",
          url: invokeUrl,
          method: testMethod,
          headers: parsedHeaders,
          payload: ["POST", "PUT", "PATCH"].includes(testMethod) ? testBody : undefined,
        }),
      });

      const json = await res.json();
      setTestResponse({
        url: invokeUrl,
        status: json.status,
        statusText: json.statusText,
        durationMs: json.durationMs,
        headers: json.headers,
        body: json.body,
        error: json.error,
      });
    } catch (err: any) {
      setTestResponse({
        url: invokeUrl,
        status: 500,
        statusText: "Client Invocation Error",
        durationMs: 0,
        error: err.message,
      });
    } finally {
      setIsSending(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedUrl(id);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  const filteredApis = apis.filter(
    (a) =>
      (a.name || "").toLowerCase().includes(search.toLowerCase()) ||
      (a.id || "").toLowerCase().includes(search.toLowerCase())
  );

  const getMethodBadgeColor = (method: string) => {
    switch (method.toUpperCase()) {
      case "GET":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "POST":
        return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      case "PUT":
        return "bg-blue-500/10 text-blue-400 border-blue-500/20";
      case "DELETE":
        return "bg-rose-500/10 text-rose-400 border-rose-500/20";
      default:
        return "bg-purple-500/10 text-purple-400 border-purple-500/20";
    }
  };

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
            <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <Network className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-ink">
                {isAws ? "API Gateway & Explorer" : "API Gateway / Cloud Endpoints"}
              </h1>
              <p className="text-xs text-muted">
                Inspect, test, and invoke emulated REST and HTTP endpoints powered by Floci
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchApis}
            disabled={loading}
            className="p-2 bg-surface hover:bg-subtle text-muted hover:text-ink border border-line rounded-control text-xs font-medium transition-colors flex items-center gap-1.5"
            title="Refresh APIs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="px-3.5 py-2 bg-action text-white hover:opacity-90 rounded-control text-xs font-semibold shadow-sm transition-opacity flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            Create API
          </button>
        </div>
      </div>

      {/* Main Grid: Left side APIs list, Right side Explorer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: APIs List (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="text"
                placeholder="Search APIs..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-surface border border-line pl-8 pr-3 py-1.5 rounded-control text-xs text-ink focus:outline-none focus:border-blue-400 font-mono"
              />
            </div>
            <span className="text-xs text-muted font-mono">{filteredApis.length} APIs</span>
          </div>

          {loading ? (
            <div className="bg-surface border border-line rounded-panel p-8 text-center text-muted">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto text-blue-400 mb-2" />
              Loading APIs...
            </div>
          ) : filteredApis.length === 0 ? (
            <div className="bg-surface border border-line rounded-panel p-8 text-center text-muted space-y-2">
              <Globe className="w-6 h-6 mx-auto text-muted/50" />
              <p className="text-xs">No APIs found in Floci.</p>
              <button
                onClick={() => setIsCreateOpen(true)}
                className="text-xs font-semibold text-blue-400 hover:underline"
              >
                + Create REST or HTTP API
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredApis.map((api) => {
                const isSelected = selectedApi?.id === api.id;
                return (
                  <div
                    key={api.id}
                    onClick={() => selectApi(api)}
                    className={`p-3.5 rounded-panel border transition-all cursor-pointer ${
                      isSelected
                        ? "bg-selected/30 border-action ring-1 ring-action/50"
                        : "bg-surface border-line hover:border-line-hover"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-ink truncate">{api.name}</span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${
                              api.type === "REST"
                                ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                                : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                            }`}
                          >
                            {api.protocol}
                          </span>
                        </div>
                        <div className="text-[11px] text-muted font-mono truncate">{api.id}</div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setInspectItem(api);
                          }}
                          title="Inspect JSON"
                          className="p-1 text-muted hover:text-ink rounded transition-colors"
                        >
                          <Code className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteApi(api);
                          }}
                          title="Delete API"
                          className="p-1 text-muted hover:text-rose-400 rounded transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {api.description && (
                      <p className="text-[11px] text-muted truncate mt-1">{api.description}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: API Explorer & Request Tester (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {selectedApi ? (
            <div className="space-y-4">
              {/* Selected API Banner */}
              <div className="p-4 rounded-panel bg-surface border border-line space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-blue-400" />
                    <span className="text-xs font-bold text-ink">API Explorer & Tester</span>
                  </div>
                  <span className="text-[11px] text-muted font-mono">
                    ID: <span className="text-ink">{selectedApi.id}</span>
                  </span>
                </div>

                <div className="flex items-center justify-between bg-subtle p-2 rounded border border-line text-xs font-mono">
                  <span className="text-muted text-[11px] truncate max-w-sm">
                    {selectedApi.endpointUrl}
                  </span>
                  <button
                    onClick={() => copyToClipboard(selectedApi.endpointUrl, selectedApi.id)}
                    className="p-1 text-muted hover:text-ink flex items-center gap-1 text-[11px]"
                  >
                    {copiedUrl === selectedApi.id ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>Copy Base URL</span>
                  </button>
                </div>
              </div>

              {/* Request Tester Card */}
              <div className="p-4 rounded-panel bg-surface border border-line space-y-4">
                <form onSubmit={handleSendTestRequest} className="space-y-3">
                  {/* Method + Stage + Path Input */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 font-mono text-xs">
                    <select
                      value={testMethod}
                      onChange={(e) => setTestMethod(e.target.value)}
                      className={`px-3 py-2 rounded-control font-bold uppercase border bg-surface ${getMethodBadgeColor(
                        testMethod
                      )} focus:outline-none`}
                    >
                      <option value="GET">GET</option>
                      <option value="POST">POST</option>
                      <option value="PUT">PUT</option>
                      <option value="DELETE">DELETE</option>
                      <option value="PATCH">PATCH</option>
                    </select>

                    {selectedApi.type === "REST" && (
                      <input
                        type="text"
                        placeholder="Stage (e.g. _user_request_)"
                        value={testStage}
                        onChange={(e) => setTestStage(e.target.value)}
                        className="w-32 bg-subtle border border-line px-2.5 py-2 rounded-control text-xs text-ink focus:outline-none focus:border-blue-400"
                        title="API Stage"
                      />
                    )}

                    <input
                      type="text"
                      placeholder="/path (e.g. /items or /health)"
                      value={testPath}
                      onChange={(e) => setTestPath(e.target.value)}
                      required
                      className="flex-1 bg-subtle border border-line px-3 py-2 rounded-control text-xs text-ink focus:outline-none focus:border-blue-400"
                    />

                    <button
                      type="submit"
                      disabled={isSending}
                      className="px-4 py-2 bg-action text-white hover:opacity-90 rounded-control font-semibold flex items-center justify-center gap-1.5 transition-opacity"
                    >
                      {isSending ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Send className="w-3.5 h-3.5" />
                      )}
                      <span>Send</span>
                    </button>
                  </div>

                  {/* Headers Input */}
                  <div>
                    <label className="block text-[11px] font-semibold text-muted mb-1">
                      Request Headers <span className="font-normal">(Header: Value, one per line)</span>
                    </label>
                    <textarea
                      rows={2}
                      value={testHeaders}
                      onChange={(e) => setTestHeaders(e.target.value)}
                      className="w-full bg-subtle border border-line p-2 rounded-control text-xs text-ink focus:outline-none focus:border-blue-400 font-mono"
                    />
                  </div>

                  {/* Request Body (for POST/PUT/PATCH) */}
                  {["POST", "PUT", "PATCH"].includes(testMethod) && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-semibold text-muted">
                          Request Body (JSON)
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            try {
                              setTestBody(JSON.stringify(JSON.parse(testBody), null, 2));
                            } catch {}
                          }}
                          className="text-[10px] text-blue-400 hover:underline"
                        >
                          Format JSON
                        </button>
                      </div>
                      <textarea
                        rows={4}
                        placeholder='{\n  "message": "hello from floci"\n}'
                        value={testBody}
                        onChange={(e) => setTestBody(e.target.value)}
                        className="w-full bg-subtle border border-line p-2.5 rounded-control text-xs text-ink focus:outline-none focus:border-blue-400 font-mono"
                      />
                    </div>
                  )}
                </form>

                {/* Response Panel */}
                {testResponse && (
                  <div className="pt-3 border-t border-line space-y-3 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-ink">Response</span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                            testResponse.status >= 200 && testResponse.status < 300
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                              : testResponse.status >= 400
                              ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                              : "bg-blue-500/10 text-blue-400 border-blue-500/30"
                          }`}
                        >
                          {testResponse.status} {testResponse.statusText || ""}
                        </span>
                      </div>
                      <span className="text-[11px] text-muted font-mono">
                        {testResponse.durationMs} ms
                      </span>
                    </div>

                    {testResponse.error && (
                      <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs rounded-control">
                        {testResponse.error}
                      </div>
                    )}

                    <div className="bg-black/60 border border-line rounded-panel p-3 overflow-x-auto max-h-80 font-mono text-xs text-slate-200">
                      <pre>
                        {typeof testResponse.body === "object"
                          ? JSON.stringify(testResponse.body, null, 2)
                          : testResponse.body || "<Empty response>"}
                      </pre>
                    </div>
                  </div>
                )}
              </div>

              {/* Resources & Routes Section */}
              <div className="p-4 rounded-panel bg-surface border border-line space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-accent" />
                    <span className="text-xs font-bold text-ink">
                      {selectedApi.type === "REST" ? "Configured Resources" : "Configured Routes"}
                    </span>
                  </div>
                  {loadingRoutes && <RefreshCw className="w-3.5 h-3.5 animate-spin text-muted" />}
                </div>

                {selectedApi.type === "REST" ? (
                  apiRoutesData?.resources && apiRoutesData.resources.length > 0 ? (
                    <div className="space-y-1.5 font-mono text-xs">
                      {apiRoutesData.resources.map((res: any) => (
                        <div
                          key={res.id}
                          className="flex items-center justify-between p-2.5 bg-subtle border border-line rounded-control hover:bg-subtle/80 cursor-pointer"
                          onClick={() => setTestPath(res.path || "/")}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-ink font-semibold">{res.path}</span>
                            <span className="text-muted text-[10px]">({res.id})</span>
                          </div>
                          <div className="flex items-center gap-1">
                            {res.methods?.map((m: string) => (
                              <span
                                key={m}
                                className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase border ${getMethodBadgeColor(
                                  m
                                )}`}
                              >
                                {m}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted">No custom resources configured on this REST API.</p>
                  )
                ) : apiRoutesData?.routes && apiRoutesData.routes.length > 0 ? (
                  <div className="space-y-1.5 font-mono text-xs">
                    {apiRoutesData.routes.map((rt: any) => (
                      <div
                        key={rt.id}
                        className="flex items-center justify-between p-2.5 bg-subtle border border-line rounded-control hover:bg-subtle/80 cursor-pointer"
                        onClick={() => {
                          const parts = (rt.routeKey || "").split(" ");
                          if (parts.length === 2) {
                            setTestMethod(parts[0]);
                            setTestPath(parts[1]);
                          } else {
                            setTestPath(rt.routeKey || "/");
                          }
                        }}
                      >
                        <span className="text-ink font-semibold">{rt.routeKey}</span>
                        <span className="text-muted text-[10px]">{rt.target || "Direct Integration"}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted">No custom routes configured on this HTTP API.</p>
                )}
              </div>
            </div>
          ) : (
            <div className="p-12 rounded-panel bg-surface border border-line text-center text-muted space-y-3">
              <Globe className="w-10 h-10 mx-auto text-muted/40" />
              <p className="text-sm font-semibold text-ink">Select an API to explore and test</p>
              <p className="text-xs text-muted">
                Choose an API from the list on the left to inspect its routes and send test invocations.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Create API Modal */}
      {isCreateOpen && mounted && createPortal(
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsCreateOpen(false);
          }}
        >
          <div className="bg-surface border border-line rounded-panel w-full max-w-md p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-ink text-base">Create New API</h3>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-muted hover:text-ink p-1 hover:bg-subtle rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateApi} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-ink mb-1.5">API Protocol</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewApiProtocol("REST")}
                    className={`py-2 px-3 rounded-control text-xs font-bold border transition-colors ${
                      newApiProtocol === "REST"
                        ? "bg-amber-500/10 text-amber-400 border-amber-500/30 ring-1 ring-amber-500/30"
                        : "bg-subtle text-muted border-line hover:text-ink"
                    }`}
                  >
                    REST API (v1)
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewApiProtocol("HTTP")}
                    className={`py-2 px-3 rounded-control text-xs font-bold border transition-colors ${
                      newApiProtocol === "HTTP"
                        ? "bg-blue-500/10 text-blue-400 border-blue-500/30 ring-1 ring-blue-500/30"
                        : "bg-subtle text-muted border-line hover:text-ink"
                    }`}
                  >
                    HTTP API (v2)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink mb-1.5">API Name</label>
                <input
                  type="text"
                  placeholder="e.g. backend-api, auth-service, orders-gateway"
                  value={newApiName}
                  onChange={(e) => setNewApiName(e.target.value)}
                  required
                  className="w-full bg-subtle border border-line px-3.5 py-2 rounded-control text-xs text-ink focus:outline-none focus:border-blue-400 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink mb-1.5">
                  Description <span className="text-muted font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Production microservice gateway"
                  value={newApiDescription}
                  onChange={(e) => setNewApiDescription(e.target.value)}
                  className="w-full bg-subtle border border-line px-3.5 py-2 rounded-control text-xs text-ink focus:outline-none focus:border-blue-400"
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
                  Create API
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
        title={inspectItem?.name || inspectItem?.id || "API Gateway Resource"}
        subtitle={inspectItem?.id ? `ID: ${inspectItem.id}` : undefined}
        badge={`API ${inspectItem?.protocol || "GATEWAY"}`}
        data={inspectItem}
      />
    </div>
  );
}
