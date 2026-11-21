"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Activity,
  RefreshCw,
  Plus,
  Trash2,
  Bell,
  BellOff,
  CheckCircle2,
  AlertCircle,
  X,
  Code,
  Send,
} from "lucide-react";
import { useEndpoint } from "@/components/EndpointProvider";
import { useCloudTheme } from "@/components/CloudThemeContext";
import { ResourceDrawer } from "@/components/ResourceDrawer";

export default function CloudWatchPage() {
  const { endpoint, isConnected } = useEndpoint();
  const { serviceLabels } = useCloudTheme();

  const [activeTab, setActiveTab] = useState<"alarms" | "metrics">("alarms");
  const [alarms, setAlarms] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [inspectResource, setInspectResource] = useState<any>(null);
  const [notification, setNotification] = useState<{ msg: string; isError?: boolean } | null>(null);

  // Create Alarm Modal
  const [isAlarmOpen, setIsAlarmOpen] = useState(false);
  const [alarmName, setAlarmName] = useState("");
  const [alarmNamespace, setAlarmNamespace] = useState("Floci/Custom");
  const [alarmMetric, setAlarmMetric] = useState("CPUUtilization");
  const [alarmThreshold, setAlarmThreshold] = useState("80");

  // Put Metric Modal
  const [isMetricOpen, setIsMetricOpen] = useState(false);
  const [mNamespace, setMNamespace] = useState("Floci/Custom");
  const [mName, setMName] = useState("RequestCount");
  const [mValue, setMValue] = useState("1");

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
      const res = await fetch(`/api/floci/cloudwatch?endpoint=${encodeURIComponent(endpoint)}`);
      const data = await res.json();
      if (res.ok) {
        setAlarms(data.alarms || []);
        setMetrics(data.metrics || []);
      } else {
        notify(data.error || "Failed to fetch CloudWatch data", true);
      }
    } catch (e: any) {
      notify(e.message || "Failed to fetch CloudWatch data", true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isConnected) reloadData();
  }, [endpoint, isConnected]);

  const postAction = async (payload: Record<string, any>, successMsg: string) => {
    try {
      const res = await fetch(`/api/floci/cloudwatch?endpoint=${encodeURIComponent(endpoint)}`, {
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
            <Activity className="text-primary" size={24} />
            <span>{serviceLabels.cloudwatch}</span>
          </h1>
          <p className="text-sm text-muted mt-1">
            Monitor custom & OTLP metrics, create threshold alarms, and toggle alarm actions (Floci v2.5.0).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMetricOpen(true)}
            className="px-3 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 cursor-pointer"
          >
            <Send size={14} /> Put Metric
          </button>
          <button
            onClick={() => setIsAlarmOpen(true)}
            className="px-3 py-2 rounded-lg text-xs font-semibold bg-primary hover:opacity-90 text-white flex items-center gap-1.5 cursor-pointer"
          >
            <Plus size={14} /> Create Alarm
          </button>
          <button
            onClick={reloadData}
            className="p-2 rounded-lg bg-surface border border-line hover:bg-surface-hover cursor-pointer"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-line pb-2">
        <button
          onClick={() => setActiveTab("alarms")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
            activeTab === "alarms" ? "bg-primary/15 text-primary" : "text-muted hover:text-foreground"
          }`}
        >
          Alarms ({alarms.length})
        </button>
        <button
          onClick={() => setActiveTab("metrics")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
            activeTab === "metrics" ? "bg-primary/15 text-primary" : "text-muted hover:text-foreground"
          }`}
        >
          Metrics ({metrics.length})
        </button>
      </div>

      {activeTab === "alarms" ? (
        <div className="bg-surface border border-line rounded-panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-background/50 border-b border-line text-muted uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Alarm Name</th>
                  <th className="px-4 py-3">State</th>
                  <th className="px-4 py-3">Metric</th>
                  <th className="px-4 py-3">Actions Enabled</th>
                  <th className="px-4 py-3 text-right">Controls</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted">Loading alarms...</td>
                  </tr>
                ) : alarms.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted">No CloudWatch alarms configured.</td>
                  </tr>
                ) : (
                  alarms.map((a) => (
                    <tr key={a.AlarmName} className="hover:bg-background/40">
                      <td className="px-4 py-3 font-medium">{a.AlarmName}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            a.StateValue === "OK"
                              ? "bg-emerald-500/15 text-emerald-400"
                              : a.StateValue === "ALARM"
                                ? "bg-red-500/15 text-red-400"
                                : "bg-amber-500/15 text-amber-400"
                          }`}
                        >
                          {a.StateValue || "INSUFFICIENT_DATA"}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-muted">
                        {a.Namespace} / {a.MetricName} ({a.Threshold})
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() =>
                            postAction(
                              {
                                action: a.ActionsEnabled ? "disable_actions" : "enable_actions",
                                alarmName: a.AlarmName,
                              },
                              `Alarm actions ${a.ActionsEnabled ? "disabled" : "enabled"}`
                            )
                          }
                          className="inline-flex items-center gap-1 px-2 py-1 rounded bg-background border border-line text-[11px] cursor-pointer"
                        >
                          {a.ActionsEnabled ? <Bell size={12} className="text-emerald-400" /> : <BellOff size={12} className="text-muted" />}
                          <span>{a.ActionsEnabled ? "Enabled" : "Disabled"}</span>
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() =>
                              postAction(
                                {
                                  action: "set_alarm_state",
                                  alarmName: a.AlarmName,
                                  stateValue: a.StateValue === "ALARM" ? "OK" : "ALARM",
                                },
                                `Alarm state toggled`
                              )
                            }
                            className="px-2 py-1 rounded bg-background border border-line hover:border-primary text-[11px] cursor-pointer"
                          >
                            Set {a.StateValue === "ALARM" ? "OK" : "ALARM"}
                          </button>
                          <button
                            onClick={() => setInspectResource(a)}
                            className="p-1.5 rounded bg-background border border-line cursor-pointer"
                          >
                            <Code size={13} />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Delete alarm "${a.AlarmName}"?`)) {
                                postAction({ action: "delete_alarm", alarmName: a.AlarmName }, "Alarm deleted");
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
        </div>
      ) : (
        <div className="bg-surface border border-line rounded-panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-background/50 border-b border-line text-muted uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Namespace</th>
                  <th className="px-4 py-3">Metric Name</th>
                  <th className="px-4 py-3">Dimensions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {metrics.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-muted">
                      No metrics published yet. Use &quot;Put Metric&quot; or OTLP ingestion.
                    </td>
                  </tr>
                ) : (
                  metrics.map((m, i) => (
                    <tr key={`${m.Namespace}-${m.MetricName}-${i}`} className="hover:bg-background/40">
                      <td className="px-4 py-3 font-mono text-primary">{m.Namespace}</td>
                      <td className="px-4 py-3 font-medium">{m.MetricName}</td>
                      <td className="px-4 py-3 font-mono text-[11px] text-muted">
                        {(m.Dimensions || []).map((d: any) => `${d.Name}=${d.Value}`).join(", ") || "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Alarm Modal */}
      {mounted && isAlarmOpen &&
        createPortal(
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-surface border border-line rounded-panel w-full max-w-md p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold">Create Metric Alarm</h2>
                <button onClick={() => setIsAlarmOpen(false)} className="text-muted"><X size={18} /></button>
              </div>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const ok = await postAction(
                    {
                      action: "put_alarm",
                      alarmName: alarmName.trim(),
                      namespace: alarmNamespace.trim(),
                      metricName: alarmMetric.trim(),
                      threshold: Number(alarmThreshold),
                    },
                    `Alarm "${alarmName}" created`
                  );
                  if (ok) {
                    setAlarmName("");
                    setIsAlarmOpen(false);
                  }
                }}
                className="space-y-3"
              >
                <div>
                  <label className="block text-xs text-muted mb-1">Alarm Name</label>
                  <input required value={alarmName} onChange={(e) => setAlarmName(e.target.value)} placeholder="high-cpu-alarm" className="w-full px-3 py-2 rounded-lg bg-background border border-line text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-muted mb-1">Namespace</label>
                    <input required value={alarmNamespace} onChange={(e) => setAlarmNamespace(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-background border border-line text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-muted mb-1">Metric Name</label>
                    <input required value={alarmMetric} onChange={(e) => setAlarmMetric(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-background border border-line text-sm" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-muted mb-1">Threshold (&gt;)</label>
                  <input type="number" required value={alarmThreshold} onChange={(e) => setAlarmThreshold(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-background border border-line text-sm" />
                </div>
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setIsAlarmOpen(false)} className="px-3 py-1.5 rounded-lg border border-line text-xs">Cancel</button>
                  <button type="submit" className="px-4 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold">Create</button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* Put Metric Modal */}
      {mounted && isMetricOpen &&
        createPortal(
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-surface border border-line rounded-panel w-full max-w-md p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold">Publish Metric Data Point</h2>
                <button onClick={() => setIsMetricOpen(false)} className="text-muted"><X size={18} /></button>
              </div>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const ok = await postAction(
                    { action: "put_metric", namespace: mNamespace.trim(), metricName: mName.trim(), value: Number(mValue) },
                    `Metric "${mName}" published`
                  );
                  if (ok) setIsMetricOpen(false);
                }}
                className="space-y-3"
              >
                <div>
                  <label className="block text-xs text-muted mb-1">Namespace</label>
                  <input required value={mNamespace} onChange={(e) => setMNamespace(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-background border border-line text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-muted mb-1">Metric Name</label>
                    <input required value={mName} onChange={(e) => setMName(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-background border border-line text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-muted mb-1">Value</label>
                    <input type="number" step="any" required value={mValue} onChange={(e) => setMValue(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-background border border-line text-sm" />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setIsMetricOpen(false)} className="px-3 py-1.5 rounded-lg border border-line text-xs">Cancel</button>
                  <button type="submit" className="px-4 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold">Publish</button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      <ResourceDrawer
        isOpen={!!inspectResource}
        onClose={() => setInspectResource(null)}
        title={inspectResource?.AlarmName || "CloudWatch Resource"}
        subtitle={inspectResource?.AlarmArn || ""}
        data={inspectResource}
      />
    </div>
  );
}
