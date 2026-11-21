"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Globe2,
  RefreshCw,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  X,
} from "lucide-react";
import { useEndpoint } from "@/components/EndpointProvider";
import { useCloudTheme } from "@/components/CloudThemeContext";

export default function Route53Page() {
  const { endpoint, isConnected } = useEndpoint();
  const { serviceLabels } = useCloudTheme();

  const [zones, setZones] = useState<any[]>([]);
  const [selectedZone, setSelectedZone] = useState<any>(null);
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [notification, setNotification] = useState<{ msg: string; isError?: boolean } | null>(null);

  // Modals
  const [isZoneOpen, setIsZoneOpen] = useState(false);
  const [zoneName, setZoneName] = useState("");
  const [zoneComment, setZoneComment] = useState("");

  const [isRecordOpen, setIsRecordOpen] = useState(false);
  const [recName, setRecName] = useState("");
  const [recType, setRecType] = useState("A");
  const [recTtl, setRecTtl] = useState("300");
  const [recValue, setRecValue] = useState("127.0.0.1");

  useEffect(() => {
    setMounted(true);
  }, []);

  const notify = (msg: string, isError = false) => {
    setNotification({ msg, isError });
    setTimeout(() => setNotification(null), 4000);
  };

  const loadZones = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/floci/route53?endpoint=${encodeURIComponent(endpoint)}`);
      const data = await res.json();
      if (res.ok) {
        const list = data.hostedZones || [];
        setZones(list);
        if (list.length > 0 && !selectedZone) setSelectedZone(list[0]);
      } else {
        notify(data.error || "Failed to load Route 53 hosted zones", true);
      }
    } catch (e: any) {
      notify(e.message || "Failed to load Route 53 hosted zones", true);
    } finally {
      setLoading(false);
    }
  };

  const loadRecords = async (zoneId: string) => {
    try {
      const res = await fetch(
        `/api/floci/route53?endpoint=${encodeURIComponent(endpoint)}&action=records&hostedZoneId=${encodeURIComponent(zoneId)}`
      );
      const data = await res.json();
      if (res.ok) setRecords(data.records || []);
    } catch {
      setRecords([]);
    }
  };

  useEffect(() => {
    if (isConnected) loadZones();
  }, [endpoint, isConnected]);

  useEffect(() => {
    if (isConnected && selectedZone?.Id) loadRecords(selectedZone.Id);
  }, [endpoint, isConnected, selectedZone]);

  const postAction = async (payload: Record<string, any>, successMsg: string) => {
    try {
      const res = await fetch(`/api/floci/route53?endpoint=${encodeURIComponent(endpoint)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        notify(successMsg);
        loadZones();
        if (selectedZone?.Id) loadRecords(selectedZone.Id);
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
            <Globe2 className="text-primary" size={24} />
            <span>{serviceLabels.route53}</span>
          </h1>
          <p className="text-sm text-muted mt-1">
            Manage DNS hosted zones and resource record sets (A, AAAA, CNAME, TXT, MX).
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedZone && (
            <button
              onClick={() => {
                setRecName(`api.${selectedZone.Name}`);
                setIsRecordOpen(true);
              }}
              className="px-3 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 cursor-pointer"
            >
              <Plus size={14} /> Add Record
            </button>
          )}
          <button
            onClick={() => setIsZoneOpen(true)}
            className="px-3 py-2 rounded-lg text-xs font-semibold bg-primary hover:opacity-90 text-white flex items-center gap-1.5 cursor-pointer"
          >
            <Plus size={14} /> Create Hosted Zone
          </button>
          <button
            onClick={loadZones}
            className="p-2 rounded-lg bg-surface border border-line hover:bg-surface-hover cursor-pointer"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-surface border border-line rounded-panel p-4 space-y-3">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted">
            Hosted Zones ({zones.length})
          </div>
          {zones.length === 0 ? (
            <div className="text-xs text-muted py-6 text-center">No hosted zones found.</div>
          ) : (
            <div className="space-y-2">
              {zones.map((z) => (
                <div
                  key={z.Id}
                  onClick={() => setSelectedZone(z)}
                  className={`p-3 rounded-lg border cursor-pointer ${
                    selectedZone?.Id === z.Id
                      ? "bg-primary/10 border-primary"
                      : "bg-background border-line hover:border-primary/40"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs truncate">{z.Name}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Delete hosted zone "${z.Name}"?`)) {
                          postAction({ action: "delete_zone", hostedZoneId: z.Id }, "Hosted zone deleted").then(
                            (ok) => ok && selectedZone?.Id === z.Id && setSelectedZone(null)
                          );
                        }
                      }}
                      className="text-muted hover:text-red-400"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                  <div className="text-[10px] font-mono text-muted mt-1">
                    {z.Id} · {z.ResourceRecordSetCount || 0} records
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-2 bg-surface border border-line rounded-panel overflow-hidden">
          <div className="p-4 border-b border-line text-sm font-semibold">
            Record Sets {selectedZone ? `— ${selectedZone.Name}` : ""} ({records.length})
          </div>
          <table className="w-full text-left text-xs">
            <thead className="bg-background/50 border-b border-line text-muted uppercase">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">TTL</th>
                <th className="px-4 py-3">Values</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {records.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-muted">No record sets.</td></tr>
              ) : (
                records.map((r, i) => {
                  const vals = (r.ResourceRecords || []).map((rr: any) => rr.Value);
                  const isSystem = r.Type === "SOA" || r.Type === "NS";
                  return (
                    <tr key={`${r.Name}-${r.Type}-${i}`}>
                      <td className="px-4 py-3 font-mono font-medium">{r.Name}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded bg-primary/15 text-primary text-[10px] font-bold">{r.Type}</span>
                      </td>
                      <td className="px-4 py-3 text-muted">{r.TTL ?? "—"}</td>
                      <td className="px-4 py-3 font-mono text-[11px] text-muted max-w-xs truncate">
                        {vals.join(", ") || "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {!isSystem && (
                          <button
                            onClick={() =>
                              postAction(
                                {
                                  action: "delete_record",
                                  hostedZoneId: selectedZone.Id,
                                  recordName: r.Name,
                                  recordType: r.Type,
                                  ttl: r.TTL,
                                  values: vals,
                                },
                                `Record ${r.Name} deleted`
                              )
                            }
                            className="text-red-400 hover:text-red-300"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {mounted && isZoneOpen &&
        createPortal(
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-surface border border-line rounded-panel w-full max-w-md p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold">Create Hosted Zone</h2>
                <button onClick={() => setIsZoneOpen(false)} className="text-muted"><X size={18} /></button>
              </div>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const ok = await postAction(
                    { action: "create_zone", name: zoneName.trim(), comment: zoneComment.trim() || undefined },
                    `Zone "${zoneName}" created`
                  );
                  if (ok) { setZoneName(""); setZoneComment(""); setIsZoneOpen(false); }
                }}
                className="space-y-3"
              >
                <input required value={zoneName} onChange={(e) => setZoneName(e.target.value)} placeholder="example.local" className="w-full px-3 py-2 rounded-lg bg-background border border-line text-sm" />
                <input value={zoneComment} onChange={(e) => setZoneComment(e.target.value)} placeholder="Comment (optional)" className="w-full px-3 py-2 rounded-lg bg-background border border-line text-sm" />
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setIsZoneOpen(false)} className="px-3 py-1.5 rounded-lg border border-line text-xs">Cancel</button>
                  <button type="submit" className="px-4 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold">Create</button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {mounted && isRecordOpen && selectedZone &&
        createPortal(
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-surface border border-line rounded-panel w-full max-w-md p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold">Upsert DNS Record</h2>
                <button onClick={() => setIsRecordOpen(false)} className="text-muted"><X size={18} /></button>
              </div>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const ok = await postAction(
                    {
                      action: "upsert_record",
                      hostedZoneId: selectedZone.Id,
                      recordName: recName.trim(),
                      recordType: recType,
                      ttl: Number(recTtl),
                      value: recValue,
                    },
                    `Record "${recName}" saved`
                  );
                  if (ok) setIsRecordOpen(false);
                }}
                className="space-y-3"
              >
                <input required value={recName} onChange={(e) => setRecName(e.target.value)} placeholder="api.example.local" className="w-full px-3 py-2 rounded-lg bg-background border border-line text-sm font-mono" />
                <div className="grid grid-cols-2 gap-3">
                  <select value={recType} onChange={(e) => setRecType(e.target.value)} className="px-3 py-2 rounded-lg bg-background border border-line text-sm">
                    <option value="A">A</option>
                    <option value="AAAA">AAAA</option>
                    <option value="CNAME">CNAME</option>
                    <option value="TXT">TXT</option>
                    <option value="MX">MX</option>
                  </select>
                  <input type="number" value={recTtl} onChange={(e) => setRecTtl(e.target.value)} placeholder="300" className="px-3 py-2 rounded-lg bg-background border border-line text-sm" />
                </div>
                <textarea rows={3} required value={recValue} onChange={(e) => setRecValue(e.target.value)} placeholder="One value per line" className="w-full px-3 py-2 rounded-lg bg-background border border-line text-xs font-mono" />
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setIsRecordOpen(false)} className="px-3 py-1.5 rounded-lg border border-line text-xs">Cancel</button>
                  <button type="submit" className="px-4 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold">Save Record</button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
