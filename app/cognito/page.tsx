"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  UserCheck,
  RefreshCw,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  X,
  Key,
  Users,
} from "lucide-react";
import { useEndpoint } from "@/components/EndpointProvider";
import { useCloudTheme } from "@/components/CloudThemeContext";

export default function CognitoPage() {
  const { endpoint, isConnected } = useEndpoint();
  const { serviceLabels } = useCloudTheme();

  const [pools, setPools] = useState<any[]>([]);
  const [selectedPoolId, setSelectedPoolId] = useState<string | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [notification, setNotification] = useState<{ msg: string; isError?: boolean } | null>(null);

  // Modals
  const [isPoolOpen, setIsPoolOpen] = useState(false);
  const [poolName, setPoolName] = useState("");

  const [isUserOpen, setIsUserOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [tempPassword, setTempPassword] = useState("");

  const [isClientOpen, setIsClientOpen] = useState(false);
  const [clientName, setClientName] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  const notify = (msg: string, isError = false) => {
    setNotification({ msg, isError });
    setTimeout(() => setNotification(null), 4000);
  };

  const loadPools = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/floci/cognito?endpoint=${encodeURIComponent(endpoint)}`);
      const data = await res.json();
      if (res.ok) {
        const list = data.userPools || [];
        setPools(list);
        if (list.length > 0 && !selectedPoolId) setSelectedPoolId(list[0].Id);
      } else {
        notify(data.error || "Failed to load Cognito pools", true);
      }
    } catch (e: any) {
      notify(e.message || "Failed to load Cognito pools", true);
    } finally {
      setLoading(false);
    }
  };

  const loadPoolDetails = async (poolId: string) => {
    try {
      const res = await fetch(
        `/api/floci/cognito?endpoint=${encodeURIComponent(endpoint)}&action=details&userPoolId=${encodeURIComponent(poolId)}`
      );
      const data = await res.json();
      if (res.ok) {
        setUsers(data.users || []);
        setClients(data.clients || []);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (isConnected) loadPools();
  }, [endpoint, isConnected]);

  useEffect(() => {
    if (isConnected && selectedPoolId) loadPoolDetails(selectedPoolId);
  }, [endpoint, isConnected, selectedPoolId]);

  const postAction = async (payload: Record<string, any>, successMsg: string) => {
    try {
      const res = await fetch(`/api/floci/cognito?endpoint=${encodeURIComponent(endpoint)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        notify(successMsg);
        loadPools();
        if (selectedPoolId) loadPoolDetails(selectedPoolId);
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
            <UserCheck className="text-primary" size={24} />
            <span>{serviceLabels.cognito}</span>
          </h1>
          <p className="text-sm text-muted mt-1">
            Manage Cognito user pools, directory users, and OAuth/OIDC app clients.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedPoolId && (
            <>
              <button
                onClick={() => setIsUserOpen(true)}
                className="px-3 py-2 rounded-lg text-xs font-semibold bg-surface border border-line hover:bg-surface-hover flex items-center gap-1.5 cursor-pointer"
              >
                <Users size={14} /> Add User
              </button>
              <button
                onClick={() => setIsClientOpen(true)}
                className="px-3 py-2 rounded-lg text-xs font-semibold bg-surface border border-line hover:bg-surface-hover flex items-center gap-1.5 cursor-pointer"
              >
                <Key size={14} /> Add App Client
              </button>
            </>
          )}
          <button
            onClick={() => setIsPoolOpen(true)}
            className="px-3 py-2 rounded-lg text-xs font-semibold bg-primary hover:opacity-90 text-white flex items-center gap-1.5 cursor-pointer"
          >
            <Plus size={14} /> Create User Pool
          </button>
          <button
            onClick={loadPools}
            className="p-2 rounded-lg bg-surface border border-line hover:bg-surface-hover cursor-pointer"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pools */}
        <div className="bg-surface border border-line rounded-panel p-4 space-y-3">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted">
            User Pools ({pools.length})
          </div>
          {loading ? (
            <div className="text-xs text-muted py-6 text-center">Loading...</div>
          ) : pools.length === 0 ? (
            <div className="text-xs text-muted py-6 text-center">No user pools found.</div>
          ) : (
            <div className="space-y-2">
              {pools.map((p) => (
                <div
                  key={p.Id}
                  onClick={() => setSelectedPoolId(p.Id)}
                  className={`p-3 rounded-lg border cursor-pointer ${
                    selectedPoolId === p.Id
                      ? "bg-primary/10 border-primary"
                      : "bg-background border-line hover:border-primary/40"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs truncate">{p.Name}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Delete user pool "${p.Name}"?`)) {
                          postAction({ action: "delete_pool", userPoolId: p.Id }, `Pool "${p.Name}" deleted`).then(
                            (ok) => ok && selectedPoolId === p.Id && setSelectedPoolId(null)
                          );
                        }
                      }}
                      className="text-muted hover:text-red-400"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                  <div className="text-[10px] font-mono text-muted mt-1">{p.Id}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Users & Clients */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-surface border border-line rounded-panel overflow-hidden">
            <div className="p-4 border-b border-line text-sm font-semibold">
              Users ({users.length})
            </div>
            <table className="w-full text-left text-xs">
              <thead className="bg-background/50 border-b border-line text-muted uppercase">
                <tr>
                  <th className="px-4 py-2.5">Username</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5">Email</th>
                  <th className="px-4 py-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {users.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-6 text-center text-muted">No users in this pool.</td></tr>
                ) : (
                  users.map((u) => {
                    const emailAttr = (u.Attributes || []).find((a: any) => a.Name === "email")?.Value;
                    return (
                      <tr key={u.Username}>
                        <td className="px-4 py-2.5 font-medium">{u.Username}</td>
                        <td className="px-4 py-2.5">
                          <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/15 text-emerald-400">
                            {u.UserStatus || "CONFIRMED"}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-muted">{emailAttr || "—"}</td>
                        <td className="px-4 py-2.5 text-right">
                          <button
                            onClick={() =>
                              postAction(
                                { action: "delete_user", userPoolId: selectedPoolId, username: u.Username },
                                `User "${u.Username}" deleted`
                              )
                            }
                            className="text-red-400 hover:text-red-300"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="bg-surface border border-line rounded-panel overflow-hidden">
            <div className="p-4 border-b border-line text-sm font-semibold">
              App Clients ({clients.length})
            </div>
            <table className="w-full text-left text-xs">
              <thead className="bg-background/50 border-b border-line text-muted uppercase">
                <tr>
                  <th className="px-4 py-2.5">Client Name</th>
                  <th className="px-4 py-2.5">Client ID</th>
                  <th className="px-4 py-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {clients.length === 0 ? (
                  <tr><td colSpan={3} className="px-4 py-6 text-center text-muted">No app clients configured.</td></tr>
                ) : (
                  clients.map((c) => (
                    <tr key={c.ClientId}>
                      <td className="px-4 py-2.5 font-medium">{c.ClientName}</td>
                      <td className="px-4 py-2.5 font-mono text-muted">{c.ClientId}</td>
                      <td className="px-4 py-2.5 text-right">
                        <button
                          onClick={() =>
                            postAction(
                              { action: "delete_client", userPoolId: selectedPoolId, clientId: c.ClientId },
                              `Client "${c.ClientName}" deleted`
                            )
                          }
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
        </div>
      </div>

      {/* Create Pool Modal */}
      {mounted && isPoolOpen &&
        createPortal(
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-surface border border-line rounded-panel w-full max-w-md p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold">Create User Pool</h2>
                <button onClick={() => setIsPoolOpen(false)} className="text-muted"><X size={18} /></button>
              </div>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const ok = await postAction({ action: "create_pool", poolName: poolName.trim() }, `Pool "${poolName}" created`);
                  if (ok) { setPoolName(""); setIsPoolOpen(false); }
                }}
                className="space-y-4"
              >
                <input required value={poolName} onChange={(e) => setPoolName(e.target.value)} placeholder="my-app-users" className="w-full px-3 py-2 rounded-lg bg-background border border-line text-sm" />
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setIsPoolOpen(false)} className="px-3 py-1.5 rounded-lg border border-line text-xs">Cancel</button>
                  <button type="submit" className="px-4 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold">Create</button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* Create User Modal */}
      {mounted && isUserOpen && selectedPoolId &&
        createPortal(
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-surface border border-line rounded-panel w-full max-w-md p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold">Create Cognito User</h2>
                <button onClick={() => setIsUserOpen(false)} className="text-muted"><X size={18} /></button>
              </div>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const ok = await postAction(
                    { action: "create_user", userPoolId: selectedPoolId, username: username.trim(), email: email.trim() || undefined, temporaryPassword: tempPassword || undefined },
                    `User "${username}" created`
                  );
                  if (ok) { setUsername(""); setEmail(""); setTempPassword(""); setIsUserOpen(false); }
                }}
                className="space-y-3"
              >
                <input required value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" className="w-full px-3 py-2 rounded-lg bg-background border border-line text-sm" />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email (optional)" className="w-full px-3 py-2 rounded-lg bg-background border border-line text-sm" />
                <input type="password" value={tempPassword} onChange={(e) => setTempPassword(e.target.value)} placeholder="Temporary Password (optional)" className="w-full px-3 py-2 rounded-lg bg-background border border-line text-sm" />
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setIsUserOpen(false)} className="px-3 py-1.5 rounded-lg border border-line text-xs">Cancel</button>
                  <button type="submit" className="px-4 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold">Create User</button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* Create App Client Modal */}
      {mounted && isClientOpen && selectedPoolId &&
        createPortal(
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-surface border border-line rounded-panel w-full max-w-md p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold">Create App Client</h2>
                <button onClick={() => setIsClientOpen(false)} className="text-muted"><X size={18} /></button>
              </div>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const ok = await postAction(
                    { action: "create_client", userPoolId: selectedPoolId, clientName: clientName.trim() },
                    `App client "${clientName}" created`
                  );
                  if (ok) { setClientName(""); setIsClientOpen(false); }
                }}
                className="space-y-4"
              >
                <input required value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="web-frontend" className="w-full px-3 py-2 rounded-lg bg-background border border-line text-sm" />
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setIsClientOpen(false)} className="px-3 py-1.5 rounded-lg border border-line text-xs">Cancel</button>
                  <button type="submit" className="px-4 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold">Create Client</button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
