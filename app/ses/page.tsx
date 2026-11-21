"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Mail,
  RefreshCw,
  Plus,
  Trash2,
  Send,
  CheckCircle2,
  AlertCircle,
  X,
} from "lucide-react";
import { useEndpoint } from "@/components/EndpointProvider";
import { useCloudTheme } from "@/components/CloudThemeContext";

export default function SESPage() {
  const { endpoint, isConnected } = useEndpoint();
  const { serviceLabels } = useCloudTheme();

  const [identities, setIdentities] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [notification, setNotification] = useState<{ msg: string; isError?: boolean } | null>(null);

  const [isVerifyOpen, setIsVerifyOpen] = useState(false);
  const [verifyType, setVerifyType] = useState<"email" | "domain">("email");
  const [verifyValue, setVerifyValue] = useState("");

  const [isSendOpen, setIsSendOpen] = useState(false);
  const [fromAddr, setFromAddr] = useState("noreply@example.com");
  const [toAddr, setToAddr] = useState("dev@example.com");
  const [subject, setSubject] = useState("Test Email from Floci Console");
  const [textBody, setTextBody] = useState("Hello from local Floci SES!");

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
      const res = await fetch(`/api/floci/ses?endpoint=${encodeURIComponent(endpoint)}`);
      const data = await res.json();
      if (res.ok) {
        setIdentities(data.identities || []);
        setTemplates(data.templates || []);
      } else {
        notify(data.error || "Failed to fetch SES resources", true);
      }
    } catch (e: any) {
      notify(e.message || "Failed to fetch SES resources", true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isConnected) reloadData();
  }, [endpoint, isConnected]);

  const postAction = async (payload: Record<string, any>, successMsg: string) => {
    try {
      const res = await fetch(`/api/floci/ses?endpoint=${encodeURIComponent(endpoint)}`, {
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
            <Mail className="text-primary" size={24} />
            <span>{serviceLabels.ses}</span>
          </h1>
          <p className="text-sm text-muted mt-1">
            Verify email/domain identities, browse templates, and send test emails.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsSendOpen(true)}
            className="px-3 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 cursor-pointer"
          >
            <Send size={14} /> Send Test Email
          </button>
          <button
            onClick={() => setIsVerifyOpen(true)}
            className="px-3 py-2 rounded-lg text-xs font-semibold bg-primary hover:opacity-90 text-white flex items-center gap-1.5 cursor-pointer"
          >
            <Plus size={14} /> Verify Identity
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
          Verified Identities ({identities.length})
        </div>
        <table className="w-full text-left text-xs">
          <thead className="bg-background/50 border-b border-line text-muted uppercase">
            <tr>
              <th className="px-4 py-3">Identity</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {identities.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-muted">No verified identities yet.</td></tr>
            ) : (
              identities.map((item) => (
                <tr key={item.identity}>
                  <td className="px-4 py-3 font-medium font-mono">{item.identity}</td>
                  <td className="px-4 py-3 text-muted">{item.type}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-400">
                      {item.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => postAction({ action: "delete_identity", identity: item.identity }, "Identity removed")}
                      className="text-red-400 hover:text-red-300"
                    >
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {templates.length > 0 && (
        <div className="bg-surface border border-line rounded-panel p-4 space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted">
            Email Templates ({templates.length})
          </div>
          <div className="flex flex-wrap gap-2">
            {templates.map((t: any) => (
              <span key={t.Name} className="px-2.5 py-1 rounded bg-background border border-line text-xs font-mono">
                {t.Name}
              </span>
            ))}
          </div>
        </div>
      )}

      {mounted && isVerifyOpen &&
        createPortal(
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-surface border border-line rounded-panel w-full max-w-md p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold">Verify SES Identity</h2>
                <button onClick={() => setIsVerifyOpen(false)} className="text-muted"><X size={18} /></button>
              </div>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const ok = await postAction(
                    verifyType === "email"
                      ? { action: "verify_email", email: verifyValue.trim() }
                      : { action: "verify_domain", domain: verifyValue.trim() },
                    `Identity "${verifyValue}" verified`
                  );
                  if (ok) { setVerifyValue(""); setIsVerifyOpen(false); }
                }}
                className="space-y-3"
              >
                <select value={verifyType} onChange={(e) => setVerifyType(e.target.value as any)} className="w-full px-3 py-2 rounded-lg bg-background border border-line text-sm">
                  <option value="email">Email Address</option>
                  <option value="domain">Domain</option>
                </select>
                <input
                  required
                  value={verifyValue}
                  onChange={(e) => setVerifyValue(e.target.value)}
                  placeholder={verifyType === "email" ? "noreply@example.com" : "example.com"}
                  className="w-full px-3 py-2 rounded-lg bg-background border border-line text-sm"
                />
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setIsVerifyOpen(false)} className="px-3 py-1.5 rounded-lg border border-line text-xs">Cancel</button>
                  <button type="submit" className="px-4 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold">Verify</button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {mounted && isSendOpen &&
        createPortal(
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-surface border border-line rounded-panel w-full max-w-lg p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold">Send Test Email</h2>
                <button onClick={() => setIsSendOpen(false)} className="text-muted"><X size={18} /></button>
              </div>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const ok = await postAction(
                    { action: "send_email", source: fromAddr, to: toAddr, subject, textBody },
                    "Email sent via SES"
                  );
                  if (ok) setIsSendOpen(false);
                }}
                className="space-y-3"
              >
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-muted mb-1">From</label>
                    <input required value={fromAddr} onChange={(e) => setFromAddr(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-background border border-line text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-muted mb-1">To (comma-separated)</label>
                    <input required value={toAddr} onChange={(e) => setToAddr(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-background border border-line text-sm" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-muted mb-1">Subject</label>
                  <input required value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-background border border-line text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-muted mb-1">Body</label>
                  <textarea rows={4} required value={textBody} onChange={(e) => setTextBody(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-background border border-line text-sm" />
                </div>
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setIsSendOpen(false)} className="px-3 py-1.5 rounded-lg border border-line text-xs">Cancel</button>
                  <button type="submit" className="px-4 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold">Send Email</button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
