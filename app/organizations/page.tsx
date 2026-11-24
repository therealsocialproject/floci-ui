"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Building2,
  RefreshCw,
  Plus,
  XCircle,
  Code,
  CheckCircle2,
  AlertCircle,
  X,
} from "lucide-react";
import { useEndpoint } from "@/components/EndpointProvider";
import { useCloudTheme } from "@/components/CloudThemeContext";
import { ResourceDrawer } from "@/components/ResourceDrawer";

export default function OrganizationsPage() {
  const { endpoint, isConnected } = useEndpoint();
  const { serviceLabels } = useCloudTheme();

  const [org, setOrg] = useState<any>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [roots, setRoots] = useState<any[]>([]);
  const [ous, setOus] = useState<any[]>([]);
  const [policies, setPolicies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [inspectResource, setInspectResource] = useState<any>(null);
  const [notification, setNotification] = useState<{ msg: string; isError?: boolean } | null>(null);

  const [isAccOpen, setIsAccOpen] = useState(false);
  const [accName, setAccName] = useState("");
  const [accEmail, setAccEmail] = useState("");

  const [isOuOpen, setIsOuOpen] = useState(false);
  const [ouName, setOuName] = useState("");

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
      const res = await fetch(`/api/floci/organizations?endpoint=${encodeURIComponent(endpoint)}`);
      const data = await res.json();
      if (res.ok) {
        setOrg(data.organization);
        setAccounts(data.accounts || []);
        setRoots(data.roots || []);
        setOus(data.organizationalUnits || []);
        setPolicies(data.policies || []);
      } else {
        notify(data.error || "Failed to load Organizations data", true);
      }
    } catch (e: any) {
      notify(e.message || "Failed to load Organizations data", true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isConnected) reloadData();
  }, [endpoint, isConnected]);

  const postAction = async (payload: Record<string, any>, successMsg: string) => {
    try {
      const res = await fetch(`/api/floci/organizations?endpoint=${encodeURIComponent(endpoint)}`, {
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
            <Building2 className="text-primary" size={24} />
            <span>{serviceLabels.organizations}</span>
          </h1>
          <p className="text-sm text-muted mt-1">
            Manage multi-account organizations, organizational units (OUs), SCPs, and account lifecycle (create/close).
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!org ? (
            <button
              onClick={() => postAction({ action: "create_org" }, "Organization created")}
              className="px-3 py-2 rounded-lg text-xs font-semibold bg-primary hover:opacity-90 text-white flex items-center gap-1.5 cursor-pointer"
            >
              <Plus size={14} /> Create Organization
            </button>
          ) : (
            <>
              <button
                onClick={() => setIsOuOpen(true)}
                className="px-3 py-2 rounded-lg text-xs font-semibold bg-surface border border-line hover:bg-surface-hover flex items-center gap-1.5 cursor-pointer"
              >
                <Plus size={14} /> Create OU
              </button>
              <button
                onClick={() => setIsAccOpen(true)}
                className="px-3 py-2 rounded-lg text-xs font-semibold bg-primary hover:opacity-90 text-white flex items-center gap-1.5 cursor-pointer"
              >
                <Plus size={14} /> Create Account
              </button>
            </>
          )}
          <button
            onClick={reloadData}
            className="p-2 rounded-lg bg-surface border border-line hover:bg-surface-hover cursor-pointer"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {org && (
        <div className="bg-surface border border-line rounded-panel p-4 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="space-y-1">
            <div className="font-semibold text-sm">Organization <span className="font-mono text-primary">{org.Id}</span></div>
            <div className="text-muted">Management Account: <span className="font-mono">{org.MasterAccountId}</span> ({org.MasterAccountEmail})</div>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 font-semibold">
            FeatureSet: {org.FeatureSet || "ALL"}
          </span>
        </div>
      )}

      <div className="bg-surface border border-line rounded-panel overflow-hidden">
        <div className="p-4 border-b border-line text-sm font-semibold">
          Member Accounts ({accounts.length})
        </div>
        <table className="w-full text-left text-xs">
          <thead className="bg-background/50 border-b border-line text-muted uppercase">
            <tr>
              <th className="px-4 py-3">Account ID</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {accounts.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted">{org ? "No member accounts." : "Create an organization to manage accounts."}</td></tr>
            ) : (
              accounts.map((a) => (
                <tr key={a.Id}>
                  <td className="px-4 py-3 font-mono font-medium">{a.Id}</td>
                  <td className="px-4 py-3">{a.Name}</td>
                  <td className="px-4 py-3 text-muted">{a.Email}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        a.Status === "ACTIVE"
                          ? "bg-emerald-500/15 text-emerald-400"
                          : "bg-red-500/15 text-red-400"
                      }`}
                    >
                      {a.Status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex gap-1.5">
                      <button onClick={() => setInspectResource(a)} className="p-1.5 rounded bg-background border border-line cursor-pointer">
                        <Code size={13} />
                      </button>
                      {a.Id !== org?.MasterAccountId && a.Status === "ACTIVE" && (
                        <button
                          onClick={() => {
                            if (confirm(`Close member account "${a.Name}" (${a.Id})?`)) {
                              postAction({ action: "close_account", accountId: a.Id }, `Account "${a.Id}" closed`);
                            }
                          }}
                          className="px-2 py-1 rounded bg-background border border-line text-red-400 text-[11px] flex items-center gap-1 cursor-pointer"
                          title="Close Account"
                        >
                          <XCircle size={12} /> Close
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-surface border border-line rounded-panel p-4 space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted">
            Organizational Units ({ous.length})
          </div>
          {ous.length === 0 ? (
            <p className="text-xs text-muted">No OUs under root.</p>
          ) : (
            ous.map((ou) => (
              <div key={ou.Id} className="p-2 rounded bg-background border border-line text-xs flex justify-between">
                <span className="font-medium">{ou.Name}</span>
                <span className="font-mono text-muted">{ou.Id}</span>
              </div>
            ))
          )}
        </div>
        <div className="bg-surface border border-line rounded-panel p-4 space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted">
            Service Control Policies ({policies.length})
          </div>
          {policies.length === 0 ? (
            <p className="text-xs text-muted">No SCPs found.</p>
          ) : (
            policies.map((p) => (
              <div key={p.Id} className="p-2 rounded bg-background border border-line text-xs flex justify-between">
                <span className="font-medium">{p.Name}</span>
                <span className="font-mono text-muted">{p.Id}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {mounted && isAccOpen &&
        createPortal(
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-surface border border-line rounded-panel w-full max-w-md p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold">Create Member Account</h2>
                <button onClick={() => setIsAccOpen(false)} className="text-muted"><X size={18} /></button>
              </div>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const ok = await postAction(
                    { action: "create_account", accountName: accName.trim(), email: accEmail.trim() },
                    `Account "${accName}" created`
                  );
                  if (ok) { setAccName(""); setAccEmail(""); setIsAccOpen(false); }
                }}
                className="space-y-3"
              >
                <input required value={accName} onChange={(e) => setAccName(e.target.value)} placeholder="staging-account" className="w-full px-3 py-2 rounded-lg bg-background border border-line text-sm" />
                <input type="email" required value={accEmail} onChange={(e) => setAccEmail(e.target.value)} placeholder="staging@example.com" className="w-full px-3 py-2 rounded-lg bg-background border border-line text-sm" />
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setIsAccOpen(false)} className="px-3 py-1.5 rounded-lg border border-line text-xs">Cancel</button>
                  <button type="submit" className="px-4 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold">Create</button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {mounted && isOuOpen && roots[0]?.Id &&
        createPortal(
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-surface border border-line rounded-panel w-full max-w-md p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold">Create Organizational Unit</h2>
                <button onClick={() => setIsOuOpen(false)} className="text-muted"><X size={18} /></button>
              </div>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const ok = await postAction(
                    { action: "create_ou", parentId: roots[0].Id, name: ouName.trim() },
                    `OU "${ouName}" created`
                  );
                  if (ok) { setOuName(""); setIsOuOpen(false); }
                }}
                className="space-y-4"
              >
                <input required value={ouName} onChange={(e) => setOuName(e.target.value)} placeholder="Workloads" className="w-full px-3 py-2 rounded-lg bg-background border border-line text-sm" />
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setIsOuOpen(false)} className="px-3 py-1.5 rounded-lg border border-line text-xs">Cancel</button>
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
        title={inspectResource?.Name || "Organization Account"}
        subtitle={inspectResource?.Arn || ""}
        data={inspectResource}
      />
    </div>
  );
}
