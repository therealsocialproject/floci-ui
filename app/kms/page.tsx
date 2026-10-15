"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  ShieldCheck,
  RefreshCw,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  X,
  Code,
  Lock,
  Unlock,
  Key,
  Copy,
  Check,
} from "lucide-react";
import { useEndpoint } from "@/components/EndpointProvider";
import { useCloudTheme } from "@/components/CloudThemeContext";
import { ResourceDrawer } from "@/components/ResourceDrawer";

export default function KMSPage() {
  const { endpoint, isConnected } = useEndpoint();
  const { cloudMode, serviceLabels } = useCloudTheme();

  const [keys, setKeys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [mounted, setMounted] = useState(false);

  // Workbench State
  const [selectedKeyId, setSelectedKeyId] = useState<string>("");
  const [plainInput, setPlainInput] = useState("Hello from Floci Cloud Emulator!");
  const [cipherOutput, setCipherOutput] = useState("");
  const [decryptInput, setDecryptInput] = useState("");
  const [decryptedOutput, setDecryptedOutput] = useState("");
  const [encrypting, setEncrypting] = useState(false);
  const [decrypting, setDecrypting] = useState(false);

  // Create Key Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [keyDescription, setKeyDescription] = useState("");

  // Inspection Drawer
  const [inspectKey, setInspectKey] = useState<any>(null);

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

  const fetchKeys = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/floci/kms?endpoint=${encodeURIComponent(endpoint)}`);
      const data = await res.json();
      if (res.ok) {
        setKeys(data.keys || []);
        if (data.keys?.length > 0 && !selectedKeyId) {
          setSelectedKeyId(data.keys[0].keyId);
        }
      } else {
        showNotification(data.error || "Failed to fetch KMS keys", true);
      }
    } catch (e: any) {
      showNotification(e.message || "Failed to fetch KMS keys", true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isConnected) {
      fetchKeys();
    }
  }, [endpoint, isConnected]);

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/floci/kms?endpoint=${encodeURIComponent(endpoint)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          description: keyDescription.trim() || "Floci Customer Managed Key",
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showNotification("KMS Key created successfully");
        setIsCreateOpen(false);
        setKeyDescription("");
        fetchKeys();
      } else {
        showNotification(data.error || "Failed to create KMS key", true);
      }
    } catch (e: any) {
      showNotification(e.message, true);
    }
  };

  const handleEncrypt = async () => {
    if (!selectedKeyId || !plainInput) return;
    setEncrypting(true);
    try {
      const res = await fetch(`/api/floci/kms?endpoint=${encodeURIComponent(endpoint)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "encrypt",
          keyId: selectedKeyId,
          plaintext: plainInput,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setCipherOutput(data.ciphertext);
        setDecryptInput(data.ciphertext); // Pre-fill decrypt test
        showNotification("Data encrypted successfully");
      } else {
        showNotification(data.error || "Encryption failed", true);
      }
    } catch (e: any) {
      showNotification(e.message, true);
    } finally {
      setEncrypting(false);
    }
  };

  const handleDecrypt = async () => {
    if (!decryptInput) return;
    setDecrypting(true);
    try {
      const res = await fetch(`/api/floci/kms?endpoint=${encodeURIComponent(endpoint)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "decrypt",
          ciphertextBlob: decryptInput,
          keyId: selectedKeyId || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setDecryptedOutput(data.plaintext);
        showNotification("Data decrypted successfully");
      } else {
        showNotification(data.error || "Decryption failed", true);
      }
    } catch (e: any) {
      showNotification(e.message, true);
    } finally {
      setDecrypting(false);
    }
  };

  const filteredKeys = keys.filter(
    (k) =>
      k.keyId.toLowerCase().includes(search.toLowerCase()) ||
      k.description.toLowerCase().includes(search.toLowerCase())
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
              {isAws ? "Key Management Service (KMS)" : "Cloud KMS"}
            </h1>
            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-primary/10 text-primary border border-primary/20">
              {keys.length} {keys.length === 1 ? "Key" : "Keys"}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            {isAws
              ? "Create and manage cryptographic keys to protect your data across cloud services."
              : "Cryptographic key management service for symmetric and asymmetric encryption."}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchKeys}
            disabled={loading}
            className="p-2 rounded-md border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            title="Refresh KMS keys"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-primary text-primary-foreground font-semibold text-xs hover:bg-primary/90 transition-colors shadow-sm cursor-pointer"
          >
            <Plus size={15} />
            <span>Create Key</span>
          </button>
        </div>
      </div>

      {/* Keys Table */}
      <div className="space-y-4">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search keys by ID or description..."
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
                  <th className="py-3 px-4">Key ID</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4">Spec</th>
                  <th className="py-3 px-4">Usage</th>
                  <th className="py-3 px-4">State</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-muted-foreground">
                      <RefreshCw size={20} className="animate-spin mx-auto mb-2" />
                      <span>Loading KMS keys...</span>
                    </td>
                  </tr>
                ) : filteredKeys.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-muted-foreground">
                      <ShieldCheck size={32} className="mx-auto mb-2 opacity-30" />
                      <p className="font-medium">No KMS keys found</p>
                      <p className="text-[11px] mt-0.5">Click "Create Key" to generate a cryptographic key.</p>
                    </td>
                  </tr>
                ) : (
                  filteredKeys.map((k) => (
                    <tr
                      key={k.keyId}
                      className="border-b border-border/50 hover:bg-muted/20 transition-colors"
                    >
                      <td className="py-3 px-4 font-semibold text-foreground">
                        <div className="flex items-center gap-2">
                          <Key size={15} className="text-primary flex-shrink-0" />
                          <span className="font-mono text-xs">{k.keyId}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground truncate max-w-xs">
                        {k.description || "—"}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px]">
                        {k.keySpec}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground text-[11px]">
                        {k.keyUsage}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          {k.keyState}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedKeyId(k.keyId)}
                            className={`px-2.5 py-1 rounded text-[11px] font-medium border transition-colors cursor-pointer ${
                              selectedKeyId === k.keyId
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-muted text-foreground border-border hover:bg-muted/80"
                            }`}
                          >
                            {selectedKeyId === k.keyId ? "Active in Workbench" : "Use in Workbench"}
                          </button>
                          <button
                            onClick={() => setInspectKey(k.raw || k)}
                            className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                            title="Inspect Key JSON"
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
      </div>

      {/* Interactive Cryptographic Workbench */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Lock size={18} className="text-primary" />
            <h2 className="font-bold text-foreground text-base">Cryptographic Test Workbench</h2>
          </div>
          {selectedKeyId && (
            <span className="text-xs font-mono text-muted-foreground">
              Selected Key: <strong className="text-primary">{selectedKeyId}</strong>
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Encrypt Card */}
          <div className="space-y-3 p-4 rounded-lg bg-muted/20 border border-border">
            <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
              <Lock size={14} className="text-amber-400" />
              <span>1. Test Encrypt Plaintext</span>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                Plaintext String
              </label>
              <textarea
                rows={3}
                value={plainInput}
                onChange={(e) => setPlainInput(e.target.value)}
                placeholder="Enter text to encrypt..."
                className="w-full px-3 py-2 rounded-md bg-zinc-950 border border-zinc-800 text-zinc-100 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-primary leading-relaxed"
              />
            </div>
            <button
              onClick={handleEncrypt}
              disabled={encrypting || !selectedKeyId}
              className="w-full py-2 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Lock size={13} className={encrypting ? "animate-spin" : ""} />
              <span>{encrypting ? "Encrypting..." : "Encrypt to Ciphertext"}</span>
            </button>

            {cipherOutput && (
              <div className="space-y-1 pt-2">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
                  Ciphertext Blob (Base64)
                </span>
                <div className="rounded bg-zinc-950 p-2.5 text-zinc-300 font-mono text-[10px] break-all border border-zinc-800 max-h-24 overflow-y-auto">
                  {cipherOutput}
                </div>
              </div>
            )}
          </div>

          {/* Decrypt Card */}
          <div className="space-y-3 p-4 rounded-lg bg-muted/20 border border-border">
            <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
              <Unlock size={14} className="text-emerald-400" />
              <span>2. Test Decrypt Ciphertext</span>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                Ciphertext Blob (Base64)
              </label>
              <textarea
                rows={3}
                value={decryptInput}
                onChange={(e) => setDecryptInput(e.target.value)}
                placeholder="Paste base64 ciphertext blob..."
                className="w-full px-3 py-2 rounded-md bg-zinc-950 border border-zinc-800 text-zinc-100 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-primary leading-relaxed"
              />
            </div>
            <button
              onClick={handleDecrypt}
              disabled={decrypting || !decryptInput}
              className="w-full py-2 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Unlock size={13} className={decrypting ? "animate-spin" : ""} />
              <span>{decrypting ? "Decrypting..." : "Decrypt to Plaintext"}</span>
            </button>

            {decryptedOutput && (
              <div className="space-y-1 pt-2">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
                  Decrypted Result
                </span>
                <div className="rounded bg-zinc-950 p-2.5 text-emerald-400 font-mono text-xs break-all border border-zinc-800">
                  {decryptedOutput}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Key Modal */}
      {isCreateOpen &&
        mounted &&
        createPortal(
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-xl w-full max-w-md p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="text-primary" size={18} />
                  <h3 className="font-bold text-foreground">Create KMS Key</h3>
                </div>
                <button
                  onClick={() => setIsCreateOpen(false)}
                  className="text-muted-foreground hover:text-foreground p-1"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCreateKey} className="space-y-4 text-xs">
                <div>
                  <label className="block font-medium text-foreground mb-1">Key Description</label>
                  <input
                    type="text"
                    required
                    placeholder="My application encryption key"
                    value={keyDescription}
                    onChange={(e) => setKeyDescription(e.target.value)}
                    className="w-full px-3 py-2 rounded-md bg-muted/40 border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/20 space-y-1 text-[11px] text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Key Type:</span>
                    <strong className="text-foreground">Symmetric (SYMMETRIC_DEFAULT)</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Key Usage:</span>
                    <strong className="text-foreground">ENCRYPT_DECRYPT</strong>
                  </div>
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
                    Create Key
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* Resource Inspection Drawer */}
      <ResourceDrawer
        isOpen={Boolean(inspectKey)}
        onClose={() => setInspectKey(null)}
        title={inspectKey?.keyId || "KMS Key"}
        subtitle={inspectKey?.arn}
        badge={inspectKey?.keySpec}
        data={inspectKey}
      />
    </div>
  );
}
