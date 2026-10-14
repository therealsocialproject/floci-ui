"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  KeyRound,
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
  Edit3,
} from "lucide-react";
import { useEndpoint } from "@/components/EndpointProvider";
import { useCloudTheme } from "@/components/CloudThemeContext";
import { ResourceDrawer } from "@/components/ResourceDrawer";

export default function SecretsPage() {
  const { endpoint, isConnected } = useEndpoint();
  const { cloudMode, serviceLabels } = useCloudTheme();

  const [secrets, setSecrets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [mounted, setMounted] = useState(false);

  // Revealed Secrets Cache: { [secretName]: string }
  const [revealedValues, setRevealedValues] = useState<Record<string, string>>({});
  const [loadingSecret, setLoadingSecret] = useState<string | null>(null);
  const [copiedSecret, setCopiedSecret] = useState<string | null>(null);

  // Create Secret Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newSecretName, setNewSecretName] = useState("");
  const [newSecretDesc, setNewSecretDesc] = useState("");
  const [newSecretValue, setNewSecretValue] = useState("");

  // Update Secret Modal
  const [isUpdateOpen, setIsUpdateOpen] = useState(false);
  const [updateTarget, setUpdateTarget] = useState<any>(null);
  const [updateValue, setUpdateValue] = useState("");

  // Inspection Drawer
  const [inspectSecret, setInspectSecret] = useState<any>(null);

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

  const fetchSecrets = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/floci/secrets?endpoint=${encodeURIComponent(endpoint)}`);
      const data = await res.json();
      if (res.ok) {
        setSecrets(data.secrets || []);
      } else {
        showNotification(data.error || "Failed to fetch secrets", true);
      }
    } catch (e: any) {
      showNotification(e.message || "Failed to fetch secrets", true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isConnected) {
      fetchSecrets();
    }
  }, [endpoint, isConnected]);

  const toggleReveal = async (sec: any) => {
    if (revealedValues[sec.name]) {
      setRevealedValues((prev) => {
        const next = { ...prev };
        delete next[sec.name];
        return next;
      });
      return;
    }

    setLoadingSecret(sec.name);
    try {
      const res = await fetch(
        `/api/floci/secrets?endpoint=${encodeURIComponent(endpoint)}&action=get_value&secretId=${encodeURIComponent(sec.name)}`
      );
      const data = await res.json();
      if (res.ok) {
        setRevealedValues((prev) => ({
          ...prev,
          [sec.name]: data.secretString || "(empty)",
        }));
      } else {
        showNotification(data.error || "Failed to retrieve secret value", true);
      }
    } catch (e: any) {
      showNotification(e.message, true);
    } finally {
      setLoadingSecret(null);
    }
  };

  const copySecret = (name: string, val: string) => {
    navigator.clipboard.writeText(val);
    setCopiedSecret(name);
    setTimeout(() => setCopiedSecret(null), 2000);
  };

  const handleCreateSecret = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSecretName.trim()) return;

    try {
      const res = await fetch(`/api/floci/secrets?endpoint=${encodeURIComponent(endpoint)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          name: newSecretName.trim(),
          description: newSecretDesc.trim(),
          secretString: newSecretValue,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showNotification("Secret created successfully");
        setIsCreateOpen(false);
        setNewSecretName("");
        setNewSecretDesc("");
        setNewSecretValue("");
        fetchSecrets();
      } else {
        showNotification(data.error || "Failed to create secret", true);
      }
    } catch (e: any) {
      showNotification(e.message, true);
    }
  };

  const handleUpdateValue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!updateTarget) return;

    try {
      const res = await fetch(`/api/floci/secrets?endpoint=${encodeURIComponent(endpoint)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_value",
          secretId: updateTarget.name,
          secretString: updateValue,
        }),
      });
      if (res.ok) {
        showNotification("Secret value updated");
        setRevealedValues((prev) => ({ ...prev, [updateTarget.name]: updateValue }));
        setIsUpdateOpen(false);
        setUpdateValue("");
      } else {
        const d = await res.json();
        showNotification(d.error || "Failed to update secret value", true);
      }
    } catch (e: any) {
      showNotification(e.message, true);
    }
  };

  const handleDeleteSecret = async (sec: any) => {
    if (!confirm(`Are you sure you want to permanently delete secret ${sec.name}?`)) return;
    try {
      const res = await fetch(`/api/floci/secrets?endpoint=${encodeURIComponent(endpoint)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", secretId: sec.name }),
      });
      if (res.ok) {
        showNotification(`Secret ${sec.name} deleted`);
        fetchSecrets();
      } else {
        const d = await res.json();
        showNotification(d.error || "Failed to delete secret", true);
      }
    } catch (e: any) {
      showNotification(e.message, true);
    }
  };

  const filteredSecrets = secrets.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase())
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
              {isAws ? "Secrets Manager" : "Secret Manager"}
            </h1>
            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-primary/10 text-primary border border-primary/20">
              {secrets.length} {secrets.length === 1 ? "Secret" : "Secrets"}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            {isAws
              ? "Rotate, manage, and retrieve database credentials, API keys, and other secrets."
              : "Secure and convenient storage system for API keys, passwords, and sensitive certificates."}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchSecrets}
            disabled={loading}
            className="p-2 rounded-md border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            title="Refresh secrets"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-primary text-primary-foreground font-semibold text-xs hover:bg-primary/90 transition-colors shadow-sm cursor-pointer"
          >
            <Plus size={15} />
            <span>Store Secret</span>
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search secrets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-md bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {/* Secrets Table */}
      <div className="rounded-lg border border-border overflow-hidden bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-muted/40 border-b border-border text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                <th className="py-3 px-4">Secret Name</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4">Secret Value</th>
                <th className="py-3 px-4">Created</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-muted-foreground">
                    <RefreshCw size={20} className="animate-spin mx-auto mb-2" />
                    <span>Loading secrets...</span>
                  </td>
                </tr>
              ) : filteredSecrets.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-muted-foreground">
                    <KeyRound size={32} className="mx-auto mb-2 opacity-30" />
                    <p className="font-medium">No secrets stored in this environment</p>
                    <p className="text-[11px] mt-0.5">Click "Store Secret" to protect sensitive credentials.</p>
                  </td>
                </tr>
              ) : (
                filteredSecrets.map((sec) => (
                  <tr
                    key={sec.arn || sec.name}
                    className="border-b border-border/50 hover:bg-muted/20 transition-colors"
                  >
                    <td className="py-3 px-4 font-semibold text-foreground">
                      <div className="flex items-center gap-2">
                        <KeyRound size={15} className="text-primary" />
                        <span className="font-mono text-xs">{sec.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground truncate max-w-xs">
                      {sec.description || "—"}
                    </td>
                    <td className="py-3 px-4">
                      {revealedValues[sec.name] ? (
                        <div className="flex items-center gap-2">
                          <code className="px-2 py-0.5 rounded bg-zinc-950 text-emerald-400 font-mono text-[11px] max-w-[200px] truncate border border-zinc-800">
                            {revealedValues[sec.name]}
                          </code>
                          <button
                            onClick={() => copySecret(sec.name, revealedValues[sec.name])}
                            className="p-1 text-muted-foreground hover:text-foreground cursor-pointer"
                            title="Copy secret value"
                          >
                            {copiedSecret === sec.name ? (
                              <Check size={13} className="text-emerald-400" />
                            ) : (
                              <Copy size={13} />
                            )}
                          </button>
                        </div>
                      ) : (
                        <span className="font-mono text-muted-foreground text-[11px]">••••••••••••</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-muted-foreground whitespace-nowrap text-[11px]">
                      {sec.createdDate ? new Date(sec.createdDate).toLocaleDateString() : "—"}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => toggleReveal(sec)}
                          disabled={loadingSecret === sec.name}
                          className="px-2 py-1 rounded text-[11px] font-medium bg-muted hover:bg-muted/80 text-foreground border border-border transition-colors cursor-pointer flex items-center gap-1"
                          title={revealedValues[sec.name] ? "Hide Secret" : "Reveal Secret"}
                        >
                          {loadingSecret === sec.name ? (
                            <RefreshCw size={12} className="animate-spin" />
                          ) : revealedValues[sec.name] ? (
                            <>
                              <EyeOff size={12} />
                              <span>Hide</span>
                            </>
                          ) : (
                            <>
                              <Eye size={12} />
                              <span>Reveal</span>
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => {
                            setUpdateTarget(sec);
                            setUpdateValue(revealedValues[sec.name] || "");
                            setIsUpdateOpen(true);
                          }}
                          className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                          title="Update Secret Value"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          onClick={() => setInspectSecret(sec.raw || sec)}
                          className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                          title="Inspect Secret JSON"
                        >
                          <Code size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteSecret(sec)}
                          className="p-1.5 rounded text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                          title="Delete secret"
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

      {/* Create Secret Modal */}
      {isCreateOpen &&
        mounted &&
        createPortal(
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-xl w-full max-w-md p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <KeyRound className="text-primary" size={18} />
                  <h3 className="font-bold text-foreground">Store New Secret</h3>
                </div>
                <button
                  onClick={() => setIsCreateOpen(false)}
                  className="text-muted-foreground hover:text-foreground p-1"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCreateSecret} className="space-y-4 text-xs">
                <div>
                  <label className="block font-medium text-foreground mb-1">Secret Name</label>
                  <input
                    type="text"
                    required
                    placeholder="production/db/password"
                    value={newSecretName}
                    onChange={(e) => setNewSecretName(e.target.value)}
                    className="w-full px-3 py-2 rounded-md bg-muted/40 border border-border text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block font-medium text-foreground mb-1">Description (Optional)</label>
                  <input
                    type="text"
                    placeholder="Database master credentials"
                    value={newSecretDesc}
                    onChange={(e) => setNewSecretDesc(e.target.value)}
                    className="w-full px-3 py-2 rounded-md bg-muted/40 border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block font-medium text-foreground mb-1">Secret Value (Plaintext or JSON)</label>
                  <textarea
                    rows={4}
                    required
                    placeholder='{"username": "postgres", "password": "super-secret-password"}'
                    value={newSecretValue}
                    onChange={(e) => setNewSecretValue(e.target.value)}
                    className="w-full px-3 py-2 rounded-md bg-zinc-950 border border-zinc-800 text-zinc-100 font-mono focus:outline-none focus:ring-1 focus:ring-primary leading-relaxed"
                  />
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
                    Save Secret
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* Update Secret Value Modal */}
      {isUpdateOpen &&
        mounted &&
        createPortal(
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-xl w-full max-w-md p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <Edit3 className="text-primary" size={18} />
                  <h3 className="font-bold text-foreground">
                    Update Value: <span className="font-mono text-primary">{updateTarget?.name}</span>
                  </h3>
                </div>
                <button
                  onClick={() => setIsUpdateOpen(false)}
                  className="text-muted-foreground hover:text-foreground p-1"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleUpdateValue} className="space-y-4 text-xs">
                <div>
                  <label className="block font-medium text-foreground mb-1">New Secret Value</label>
                  <textarea
                    rows={5}
                    required
                    value={updateValue}
                    onChange={(e) => setUpdateValue(e.target.value)}
                    className="w-full px-3 py-2 rounded-md bg-zinc-950 border border-zinc-800 text-zinc-100 font-mono focus:outline-none focus:ring-1 focus:ring-primary leading-relaxed"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setIsUpdateOpen(false)}
                    className="px-3 py-1.5 rounded-md border border-border text-foreground hover:bg-muted font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-md bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors shadow-sm"
                  >
                    Update Secret
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* Resource Inspection Drawer */}
      <ResourceDrawer
        isOpen={Boolean(inspectSecret)}
        onClose={() => setInspectSecret(null)}
        title={inspectSecret?.name || "Secret Details"}
        subtitle={inspectSecret?.arn}
        badge="Secrets Manager"
        data={inspectSecret}
      />
    </div>
  );
}
