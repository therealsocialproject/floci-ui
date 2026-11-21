"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Workflow,
  RefreshCw,
  Plus,
  Trash2,
  Search,
  Send,
  Code,
  CheckCircle2,
  AlertCircle,
  X,
  Target,
} from "lucide-react";
import { useEndpoint } from "@/components/EndpointProvider";
import { useCloudTheme } from "@/components/CloudThemeContext";
import { ResourceDrawer } from "@/components/ResourceDrawer";

export default function EventBridgePage() {
  const { endpoint, isConnected } = useEndpoint();
  const { serviceLabels } = useCloudTheme();

  const [buses, setBuses] = useState<any[]>([]);
  const [selectedBus, setSelectedBus] = useState("default");
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [mounted, setMounted] = useState(false);
  const [inspectResource, setInspectResource] = useState<any>(null);
  const [notification, setNotification] = useState<{ msg: string; isError?: boolean } | null>(null);

  // Modals
  const [isCreateBusOpen, setIsCreateBusOpen] = useState(false);
  const [newBusName, setNewBusName] = useState("");

  const [isCreateRuleOpen, setIsCreateRuleOpen] = useState(false);
  const [ruleName, setRuleName] = useState("");
  const [ruleDesc, setRuleDesc] = useState("");
  const [rulePattern, setRulePattern] = useState('{\n  "source": ["floci.console"]\n}');
  const [ruleSchedule, setRuleSchedule] = useState("");

  const [isPutEventOpen, setIsPutEventOpen] = useState(false);
  const [evSource, setEvSource] = useState("floci.console");
  const [evDetailType, setEvDetailType] = useState("TestEvent");
  const [evDetail, setEvDetail] = useState('{\n  "message": "Hello from Floci UI"\n}');

  const [targetRule, setTargetRule] = useState<string | null>(null);
  const [targets, setTargets] = useState<any[]>([]);
  const [newTargetArn, setNewTargetArn] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  const notify = (msg: string, isError = false) => {
    setNotification({ msg, isError });
    setTimeout(() => setNotification(null), 4000);
  };

  const reloadData = async (bus = selectedBus) => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/floci/eventbridge?endpoint=${encodeURIComponent(endpoint)}&busName=${encodeURIComponent(bus)}`
      );
      const data = await res.json();
      if (res.ok) {
        setBuses(data.buses || []);
        setRules(data.rules || []);
      } else {
        notify(data.error || "Failed to load EventBridge", true);
      }
    } catch (e: any) {
      notify(e.message || "Failed to load EventBridge", true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isConnected) reloadData(selectedBus);
  }, [endpoint, isConnected, selectedBus]);

  const loadTargets = async (rName: string) => {
    setTargetRule(rName);
    try {
      const res = await fetch(
        `/api/floci/eventbridge?endpoint=${encodeURIComponent(endpoint)}&action=targets&busName=${encodeURIComponent(selectedBus)}&ruleName=${encodeURIComponent(rName)}`
      );
      const data = await res.json();
      setTargets(data.targets || []);
    } catch {
      setTargets([]);
    }
  };

  const postAction = async (payload: Record<string, any>, successMsg: string) => {
    try {
      const res = await fetch(`/api/floci/eventbridge?endpoint=${encodeURIComponent(endpoint)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        notify(successMsg);
        reloadData(selectedBus);
        return true;
      }
      notify(data.error || "Operation failed", true);
      return false;
    } catch (e: any) {
      notify(e.message || "Operation failed", true);
      return false;
    }
  };

  const filteredRules = rules.filter((r) =>
    (r.Name || "").toLowerCase().includes(search.toLowerCase())
  );

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
            <Workflow className="text-primary" size={24} />
            <span>{serviceLabels.eventbridge}</span>
          </h1>
          <p className="text-sm text-muted mt-1">
            Manage event buses, routing rules, targets, and dispatch custom events.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPutEventOpen(true)}
            className="px-3 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 cursor-pointer"
          >
            <Send size={14} /> Send Event
          </button>
          <button
            onClick={() => setIsCreateBusOpen(true)}
            className="px-3 py-2 rounded-lg text-xs font-semibold bg-surface border border-line hover:bg-surface-hover flex items-center gap-1.5 cursor-pointer"
          >
            <Plus size={14} /> Create Bus
          </button>
          <button
            onClick={() => setIsCreateRuleOpen(true)}
            className="px-3 py-2 rounded-lg text-xs font-semibold bg-primary hover:opacity-90 text-white flex items-center gap-1.5 cursor-pointer"
          >
            <Plus size={14} /> Create Rule
          </button>
          <button
            onClick={() => reloadData(selectedBus)}
            className="p-2 rounded-lg bg-surface border border-line hover:bg-surface-hover cursor-pointer"
            title="Refresh"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Event Buses */}
      <div className="bg-surface border border-line rounded-panel p-4 space-y-3">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted">
          Event Buses ({buses.length})
        </div>
        <div className="flex flex-wrap gap-2">
          {buses.length === 0 && (
            <span className="text-xs text-muted">No event buses found.</span>
          )}
          {buses.map((bus) => {
            const active = bus.Name === selectedBus;
            return (
              <div
                key={bus.Name}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium cursor-pointer transition-colors ${
                  active
                    ? "bg-primary/15 border-primary text-primary"
                    : "bg-background border-line hover:border-primary/50"
                }`}
                onClick={() => setSelectedBus(bus.Name)}
              >
                <span>{bus.Name}</span>
                {bus.Name !== "default" && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Delete event bus "${bus.Name}"?`)) {
                        postAction({ action: "delete_bus", name: bus.Name }, `Bus "${bus.Name}" deleted`).then(
                          (ok) => ok && setSelectedBus("default")
                        );
                      }
                    }}
                    className="text-muted hover:text-red-400"
                    title="Delete Bus"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Rules Table */}
      <div className="bg-surface border border-line rounded-panel overflow-hidden">
        <div className="p-4 border-b border-line flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm font-semibold">
            Rules on <span className="text-primary font-mono">{selectedBus}</span> ({filteredRules.length})
          </div>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter rules..."
              className="pl-8 pr-3 py-1.5 rounded-lg bg-background border border-line text-xs focus:outline-none focus:border-primary"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-background/50 border-b border-line text-muted uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Rule Name</th>
                <th className="px-4 py-3">State</th>
                <th className="px-4 py-3">Schedule / Pattern</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted">
                    Loading EventBridge rules...
                  </td>
                </tr>
              ) : filteredRules.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted">
                    No rules found on bus &quot;{selectedBus}&quot;.
                  </td>
                </tr>
              ) : (
                filteredRules.map((rule) => (
                  <tr key={rule.Name} className="hover:bg-background/40">
                    <td className="px-4 py-3 font-medium">
                      <div>{rule.Name}</div>
                      {rule.Description && (
                        <div className="text-[11px] text-muted mt-0.5">{rule.Description}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          rule.State === "ENABLED"
                            ? "bg-emerald-500/15 text-emerald-400"
                            : "bg-amber-500/15 text-amber-400"
                        }`}
                      >
                        {rule.State || "ENABLED"}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-muted max-w-md truncate">
                      {rule.ScheduleExpression || rule.EventPattern || "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => loadTargets(rule.Name)}
                          className="px-2 py-1 rounded bg-background border border-line hover:border-primary text-[11px] flex items-center gap-1 cursor-pointer"
                        >
                          <Target size={12} /> Targets
                        </button>
                        <button
                          onClick={() => setInspectResource(rule)}
                          className="p-1.5 rounded bg-background border border-line hover:border-primary cursor-pointer"
                          title="Inspect JSON"
                        >
                          <Code size={13} />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Delete rule "${rule.Name}"?`)) {
                              postAction(
                                { action: "delete_rule", name: rule.Name, busName: selectedBus },
                                `Rule "${rule.Name}" deleted`
                              );
                            }
                          }}
                          className="p-1.5 rounded bg-background border border-line hover:border-red-500 text-red-400 cursor-pointer"
                          title="Delete Rule"
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

      {/* Create Bus Modal */}
      {mounted && isCreateBusOpen &&
        createPortal(
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-surface border border-line rounded-panel w-full max-w-md p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold">Create Event Bus</h2>
                <button onClick={() => setIsCreateBusOpen(false)} className="text-muted hover:text-foreground">
                  <X size={18} />
                </button>
              </div>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!newBusName.trim()) return;
                  const ok = await postAction(
                    { action: "create_bus", name: newBusName.trim() },
                    `Event bus "${newBusName}" created`
                  );
                  if (ok) {
                    setSelectedBus(newBusName.trim());
                    setNewBusName("");
                    setIsCreateBusOpen(false);
                  }
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">Bus Name</label>
                  <input
                    required
                    value={newBusName}
                    onChange={(e) => setNewBusName(e.target.value)}
                    placeholder="orders-bus"
                    className="w-full px-3 py-2 rounded-lg bg-background border border-line text-sm"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setIsCreateBusOpen(false)} className="px-3 py-1.5 rounded-lg border border-line text-xs">
                    Cancel
                  </button>
                  <button type="submit" className="px-4 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold">
                    Create Bus
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* Create Rule Modal */}
      {mounted && isCreateRuleOpen &&
        createPortal(
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-surface border border-line rounded-panel w-full max-w-lg p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold">Create EventBridge Rule</h2>
                <button onClick={() => setIsCreateRuleOpen(false)} className="text-muted hover:text-foreground">
                  <X size={18} />
                </button>
              </div>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const ok = await postAction(
                    {
                      action: "put_rule",
                      name: ruleName.trim(),
                      busName: selectedBus,
                      description: ruleDesc.trim() || undefined,
                      eventPattern: ruleSchedule.trim() ? undefined : rulePattern.trim(),
                      scheduleExpression: ruleSchedule.trim() || undefined,
                    },
                    `Rule "${ruleName}" created`
                  );
                  if (ok) {
                    setRuleName("");
                    setRuleDesc("");
                    setRuleSchedule("");
                    setIsCreateRuleOpen(false);
                  }
                }}
                className="space-y-3"
              >
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">Rule Name</label>
                  <input
                    required
                    value={ruleName}
                    onChange={(e) => setRuleName(e.target.value)}
                    placeholder="on-order-created"
                    className="w-full px-3 py-2 rounded-lg bg-background border border-line text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">Description (optional)</label>
                  <input
                    value={ruleDesc}
                    onChange={(e) => setRuleDesc(e.target.value)}
                    placeholder="Routes order events"
                    className="w-full px-3 py-2 rounded-lg bg-background border border-line text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">Schedule Expression (optional, overrides pattern)</label>
                  <input
                    value={ruleSchedule}
                    onChange={(e) => setRuleSchedule(e.target.value)}
                    placeholder="rate(5 minutes)"
                    className="w-full px-3 py-2 rounded-lg bg-background border border-line text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">Event Pattern (JSON)</label>
                  <textarea
                    rows={4}
                    value={rulePattern}
                    onChange={(e) => setRulePattern(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-background border border-line text-xs font-mono"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setIsCreateRuleOpen(false)} className="px-3 py-1.5 rounded-lg border border-line text-xs">
                    Cancel
                  </button>
                  <button type="submit" className="px-4 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold">
                    Create Rule
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* Put Event Modal */}
      {mounted && isPutEventOpen &&
        createPortal(
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-surface border border-line rounded-panel w-full max-w-lg p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold">Send Event to {selectedBus}</h2>
                <button onClick={() => setIsPutEventOpen(false)} className="text-muted hover:text-foreground">
                  <X size={18} />
                </button>
              </div>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const ok = await postAction(
                    {
                      action: "put_events",
                      busName: selectedBus,
                      source: evSource,
                      detailType: evDetailType,
                      detail: evDetail,
                    },
                    `Event dispatched to "${selectedBus}"`
                  );
                  if (ok) setIsPutEventOpen(false);
                }}
                className="space-y-3"
              >
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-muted mb-1">Source</label>
                    <input
                      required
                      value={evSource}
                      onChange={(e) => setEvSource(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-background border border-line text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted mb-1">Detail Type</label>
                    <input
                      required
                      value={evDetailType}
                      onChange={(e) => setEvDetailType(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-background border border-line text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">Detail (JSON)</label>
                  <textarea
                    rows={5}
                    value={evDetail}
                    onChange={(e) => setEvDetail(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-background border border-line text-xs font-mono"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setIsPutEventOpen(false)} className="px-3 py-1.5 rounded-lg border border-line text-xs">
                    Cancel
                  </button>
                  <button type="submit" className="px-4 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold">
                    PutEvents
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* Targets Modal */}
      {mounted && targetRule &&
        createPortal(
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-surface border border-line rounded-panel w-full max-w-lg p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold">Targets for {targetRule}</h2>
                <button onClick={() => setTargetRule(null)} className="text-muted hover:text-foreground">
                  <X size={18} />
                </button>
              </div>
              <div className="space-y-2 max-h-52 overflow-y-auto">
                {targets.length === 0 ? (
                  <p className="text-xs text-muted">No targets attached.</p>
                ) : (
                  targets.map((t) => (
                    <div key={t.Id} className="flex items-center justify-between p-2 rounded bg-background border border-line text-xs">
                      <div className="truncate pr-2">
                        <div className="font-semibold">{t.Id}</div>
                        <div className="font-mono text-[11px] text-muted truncate">{t.Arn}</div>
                      </div>
                      <button
                        onClick={async () => {
                          const ok = await postAction(
                            { action: "remove_targets", ruleName: targetRule, busName: selectedBus, targetId: t.Id },
                            "Target removed"
                          );
                          if (ok) loadTargets(targetRule);
                        }}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))
                )}
              </div>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!newTargetArn.trim()) return;
                  const ok = await postAction(
                    { action: "put_targets", ruleName: targetRule, busName: selectedBus, targetArn: newTargetArn.trim() },
                    "Target added"
                  );
                  if (ok) {
                    setNewTargetArn("");
                    loadTargets(targetRule);
                  }
                }}
                className="flex gap-2 pt-2 border-t border-line"
              >
                <input
                  required
                  value={newTargetArn}
                  onChange={(e) => setNewTargetArn(e.target.value)}
                  placeholder="arn:aws:sqs:us-east-1:000000000000:my-queue"
                  className="flex-1 px-3 py-1.5 rounded-lg bg-background border border-line text-xs font-mono"
                />
                <button type="submit" className="px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold">
                  Add Target
                </button>
              </form>
            </div>
          </div>,
          document.body
        )}

      <ResourceDrawer
        isOpen={!!inspectResource}
        onClose={() => setInspectResource(null)}
        title={inspectResource?.Name || "EventBridge Resource"}
        subtitle={inspectResource?.Arn || ""}
        data={inspectResource}
      />
    </div>
  );
}
