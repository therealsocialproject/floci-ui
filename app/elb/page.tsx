"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Scale,
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

export default function ELBPage() {
  const { endpoint, isConnected } = useEndpoint();
  const { serviceLabels } = useCloudTheme();

  const [lbs, setLbs] = useState<any[]>([]);
  const [tgs, setTgs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [inspectResource, setInspectResource] = useState<any>(null);
  const [notification, setNotification] = useState<{ msg: string; isError?: boolean } | null>(null);

  const [isLbOpen, setIsLbOpen] = useState(false);
  const [lbName, setLbName] = useState("");
  const [lbType, setLbType] = useState("application");

  const [isTgOpen, setIsTgOpen] = useState(false);
  const [tgName, setTgName] = useState("");
  const [tgPort, setTgPort] = useState("80");

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
      const res = await fetch(`/api/floci/elb?endpoint=${encodeURIComponent(endpoint)}`);
      const data = await res.json();
      if (res.ok) {
        setLbs(data.loadBalancers || []);
        setTgs(data.targetGroups || []);
      } else {
        notify(data.error || "Failed to fetch ELB v2 resources", true);
      }
    } catch (e: any) {
      notify(e.message || "Failed to fetch ELB v2 resources", true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isConnected) reloadData();
  }, [endpoint, isConnected]);

  const postAction = async (payload: Record<string, any>, successMsg: string) => {
    try {
      const res = await fetch(`/api/floci/elb?endpoint=${encodeURIComponent(endpoint)}`, {
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
            <Scale className="text-primary" size={24} />
            <span>{serviceLabels.elb}</span>
          </h1>
          <p className="text-sm text-muted mt-1">
            Manage Application &amp; Network Load Balancers (ALB/NLB) and Target Groups.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsTgOpen(true)}
            className="px-3 py-2 rounded-lg text-xs font-semibold bg-surface border border-line hover:bg-surface-hover flex items-center gap-1.5 cursor-pointer"
          >
            <Plus size={14} /> Create Target Group
          </button>
          <button
            onClick={() => setIsLbOpen(true)}
            className="px-3 py-2 rounded-lg text-xs font-semibold bg-primary hover:opacity-90 text-white flex items-center gap-1.5 cursor-pointer"
          >
            <Plus size={14} /> Create Load Balancer
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
          Load Balancers ({lbs.length})
        </div>
        <table className="w-full text-left text-xs">
          <thead className="bg-background/50 border-b border-line text-muted uppercase">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">DNS Name</th>
              <th className="px-4 py-3">State</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {lbs.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted">No load balancers found.</td></tr>
            ) : (
              lbs.map((lb) => (
                <tr key={lb.LoadBalancerArn}>
                  <td className="px-4 py-3 font-medium">{lb.LoadBalancerName}</td>
                  <td className="px-4 py-3 uppercase text-[11px]">{lb.Type}</td>
                  <td className="px-4 py-3 font-mono text-[11px] text-primary">{lb.DNSName}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/15 text-emerald-400">
                      {lb.State?.Code || "active"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex gap-1.5">
                      <button onClick={() => setInspectResource(lb)} className="p-1.5 rounded bg-background border border-line cursor-pointer">
                        <Code size={13} />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Delete load balancer "${lb.LoadBalancerName}"?`)) {
                            postAction({ action: "delete_lb", loadBalancerArn: lb.LoadBalancerArn }, "Load balancer deleted");
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

      <div className="bg-surface border border-line rounded-panel overflow-hidden">
        <div className="p-4 border-b border-line text-sm font-semibold">
          Target Groups ({tgs.length})
        </div>
        <table className="w-full text-left text-xs">
          <thead className="bg-background/50 border-b border-line text-muted uppercase">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Protocol / Port</th>
              <th className="px-4 py-3">Target Type</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {tgs.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-muted">No target groups configured.</td></tr>
            ) : (
              tgs.map((tg) => (
                <tr key={tg.TargetGroupArn}>
                  <td className="px-4 py-3 font-medium">{tg.TargetGroupName}</td>
                  <td className="px-4 py-3 font-mono">{tg.Protocol}:{tg.Port}</td>
                  <td className="px-4 py-3 text-muted">{tg.TargetType}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex gap-1.5">
                      <button onClick={() => setInspectResource(tg)} className="p-1.5 rounded bg-background border border-line cursor-pointer">
                        <Code size={13} />
                      </button>
                      <button
                        onClick={() => postAction({ action: "delete_tg", targetGroupArn: tg.TargetGroupArn }, "Target group deleted")}
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

      {mounted && isLbOpen &&
        createPortal(
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-surface border border-line rounded-panel w-full max-w-md p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold">Create Load Balancer</h2>
                <button onClick={() => setIsLbOpen(false)} className="text-muted"><X size={18} /></button>
              </div>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const ok = await postAction({ action: "create_lb", name: lbName.trim(), type: lbType }, `Load balancer "${lbName}" created`);
                  if (ok) { setLbName(""); setIsLbOpen(false); }
                }}
                className="space-y-3"
              >
                <input required value={lbName} onChange={(e) => setLbName(e.target.value)} placeholder="app-alb" className="w-full px-3 py-2 rounded-lg bg-background border border-line text-sm" />
                <select value={lbType} onChange={(e) => setLbType(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-background border border-line text-sm">
                  <option value="application">Application (ALB)</option>
                  <option value="network">Network (NLB)</option>
                </select>
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setIsLbOpen(false)} className="px-3 py-1.5 rounded-lg border border-line text-xs">Cancel</button>
                  <button type="submit" className="px-4 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold">Create</button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {mounted && isTgOpen &&
        createPortal(
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-surface border border-line rounded-panel w-full max-w-md p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold">Create Target Group</h2>
                <button onClick={() => setIsTgOpen(false)} className="text-muted"><X size={18} /></button>
              </div>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const ok = await postAction({ action: "create_tg", name: tgName.trim(), port: Number(tgPort) }, `Target group "${tgName}" created`);
                  if (ok) { setTgName(""); setIsTgOpen(false); }
                }}
                className="space-y-3"
              >
                <input required value={tgName} onChange={(e) => setTgName(e.target.value)} placeholder="web-targets" className="w-full px-3 py-2 rounded-lg bg-background border border-line text-sm" />
                <input type="number" required value={tgPort} onChange={(e) => setTgPort(e.target.value)} placeholder="80" className="w-full px-3 py-2 rounded-lg bg-background border border-line text-sm" />
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setIsTgOpen(false)} className="px-3 py-1.5 rounded-lg border border-line text-xs">Cancel</button>
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
        title={inspectResource?.LoadBalancerName || inspectResource?.TargetGroupName || "ELB Resource"}
        subtitle={inspectResource?.LoadBalancerArn || inspectResource?.TargetGroupArn || ""}
        data={inspectResource}
      />
    </div>
  );
}
