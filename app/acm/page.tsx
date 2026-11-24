"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  FileKey2,
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

export default function ACMPage() {
  const { endpoint, isConnected } = useEndpoint();
  const { serviceLabels } = useCloudTheme();

  const [certs, setCerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [inspectResource, setInspectResource] = useState<any>(null);
  const [notification, setNotification] = useState<{ msg: string; isError?: boolean } | null>(null);

  const [isReqOpen, setIsReqOpen] = useState(false);
  const [domainName, setDomainName] = useState("");
  const [sans, setSans] = useState("");
  const [validationMethod, setValidationMethod] = useState("DNS");

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
      const res = await fetch(`/api/floci/acm?endpoint=${encodeURIComponent(endpoint)}`);
      const data = await res.json();
      if (res.ok) setCerts(data.certificates || []);
      else notify(data.error || "Failed to load ACM certificates", true);
    } catch (e: any) {
      notify(e.message || "Failed to load ACM certificates", true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isConnected) reloadData();
  }, [endpoint, isConnected]);

  const postAction = async (payload: Record<string, any>, successMsg: string) => {
    try {
      const res = await fetch(`/api/floci/acm?endpoint=${encodeURIComponent(endpoint)}`, {
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
            <FileKey2 className="text-primary" size={24} />
            <span>{serviceLabels.acm}</span>
          </h1>
          <p className="text-sm text-muted mt-1">
            Request, inspect, and manage SSL/TLS certificates for local HTTPS testing.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsReqOpen(true)}
            className="px-3 py-2 rounded-lg text-xs font-semibold bg-primary hover:opacity-90 text-white flex items-center gap-1.5 cursor-pointer"
          >
            <Plus size={14} /> Request Certificate
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
          Certificates ({certs.length})
        </div>
        <table className="w-full text-left text-xs">
          <thead className="bg-background/50 border-b border-line text-muted uppercase">
            <tr>
              <th className="px-4 py-3">Domain Name</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">ARN</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {certs.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted">No certificates found.</td></tr>
            ) : (
              certs.map((c) => (
                <tr key={c.CertificateArn}>
                  <td className="px-4 py-3 font-medium font-mono">{c.DomainName}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-400">
                      {c.Status || "ISSUED"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted">{c.Type || "AMAZON_ISSUED"}</td>
                  <td className="px-4 py-3 font-mono text-[11px] text-muted max-w-xs truncate">{c.CertificateArn}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex gap-1.5">
                      <button onClick={() => setInspectResource(c)} className="p-1.5 rounded bg-background border border-line cursor-pointer">
                        <Code size={13} />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Delete certificate for "${c.DomainName}"?`)) {
                            postAction({ action: "delete_certificate", certificateArn: c.CertificateArn }, "Certificate deleted");
                          }
                        }}
                        className="p-1.5 rounded bg-background border border-line text-red-400 cursor-pointer"
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

      {mounted && isReqOpen &&
        createPortal(
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-surface border border-line rounded-panel w-full max-w-md p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold">Request ACM Certificate</h2>
                <button onClick={() => setIsReqOpen(false)} className="text-muted"><X size={18} /></button>
              </div>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const ok = await postAction(
                    {
                      action: "request_certificate",
                      domainName: domainName.trim(),
                      subjectAlternativeNames: sans.trim() || undefined,
                      validationMethod,
                    },
                    `Certificate requested for "${domainName}"`
                  );
                  if (ok) { setDomainName(""); setSans(""); setIsReqOpen(false); }
                }}
                className="space-y-3"
              >
                <input required value={domainName} onChange={(e) => setDomainName(e.target.value)} placeholder="app.example.local" className="w-full px-3 py-2 rounded-lg bg-background border border-line text-sm font-mono" />
                <input value={sans} onChange={(e) => setSans(e.target.value)} placeholder="SANs (comma-separated, optional)" className="w-full px-3 py-2 rounded-lg bg-background border border-line text-sm font-mono" />
                <select value={validationMethod} onChange={(e) => setValidationMethod(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-background border border-line text-sm">
                  <option value="DNS">DNS Validation</option>
                  <option value="EMAIL">Email Validation</option>
                </select>
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setIsReqOpen(false)} className="px-3 py-1.5 rounded-lg border border-line text-xs">Cancel</button>
                  <button type="submit" className="px-4 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold">Request</button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      <ResourceDrawer
        isOpen={!!inspectResource}
        onClose={() => setInspectResource(null)}
        title={inspectResource?.DomainName || "ACM Certificate"}
        subtitle={inspectResource?.CertificateArn || ""}
        data={inspectResource}
      />
    </div>
  );
}
