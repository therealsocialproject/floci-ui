"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  GitBranch,
  RefreshCw,
  Plus,
  Trash2,
  Play,
  Square,
  Code,
  CheckCircle2,
  AlertCircle,
  X,
  Clock,
} from "lucide-react";
import { useEndpoint } from "@/components/EndpointProvider";
import { useCloudTheme } from "@/components/CloudThemeContext";
import { ResourceDrawer } from "@/components/ResourceDrawer";

const SAMPLE_ASL = JSON.stringify(
  {
    Comment: "Sample Hello World State Machine",
    StartAt: "HelloWorld",
    States: {
      HelloWorld: {
        Type: "Pass",
        Result: { greeting: "Hello from Floci Step Functions!" },
        End: true,
      },
    },
  },
  null,
  2
);

export default function StepFunctionsPage() {
  const { endpoint, isConnected } = useEndpoint();
  const { serviceLabels } = useCloudTheme();

  const [machines, setMachines] = useState<any[]>([]);
  const [selectedArn, setSelectedArn] = useState<string | null>(null);
  const [selectedMachine, setSelectedMachine] = useState<any>(null);
  const [executions, setExecutions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [inspectResource, setInspectResource] = useState<any>(null);
  const [notification, setNotification] = useState<{ msg: string; isError?: boolean } | null>(null);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [smName, setSmName] = useState("");
  const [smType, setSmType] = useState("STANDARD");
  const [smDef, setSmDef] = useState(SAMPLE_ASL);

  const [isStartOpen, setIsStartOpen] = useState(false);
  const [execName, setExecName] = useState("");
  const [execInput, setExecInput] = useState('{\n  "key": "value"\n}');

  useEffect(() => {
    setMounted(true);
  }, []);

  const notify = (msg: string, isError = false) => {
    setNotification({ msg, isError });
    setTimeout(() => setNotification(null), 4000);
  };

  const loadMachines = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/floci/stepfunctions?endpoint=${encodeURIComponent(endpoint)}`);
      const data = await res.json();
      if (res.ok) {
        const list = data.stateMachines || [];
        setMachines(list);
        if (list.length > 0 && !selectedArn) {
          setSelectedArn(list[0].stateMachineArn);
        }
      } else {
        notify(data.error || "Failed to load state machines", true);
      }
    } catch (e: any) {
      notify(e.message || "Failed to load state machines", true);
    } finally {
      setLoading(false);
    }
  };

  const loadMachineDetails = async (arn: string) => {
    try {
      const res = await fetch(
        `/api/floci/stepfunctions?endpoint=${encodeURIComponent(endpoint)}&action=describe_machine&stateMachineArn=${encodeURIComponent(arn)}`
      );
      const data = await res.json();
      if (res.ok) {
        setSelectedMachine(data.machine);
        setExecutions(data.executions || []);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (isConnected) loadMachines();
  }, [endpoint, isConnected]);

  useEffect(() => {
    if (isConnected && selectedArn) loadMachineDetails(selectedArn);
  }, [endpoint, isConnected, selectedArn]);

  const postAction = async (payload: Record<string, any>, successMsg: string) => {
    try {
      const res = await fetch(`/api/floci/stepfunctions?endpoint=${encodeURIComponent(endpoint)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        notify(successMsg);
        loadMachines();
        if (selectedArn) loadMachineDetails(selectedArn);
        return true;
      }
      notify(data.error || "Operation failed", true);
      return false;
    } catch (e: any) {
      notify(e.message || "Operation failed", true);
      return false;
    }
  };

  const inspectExecution = async (executionArn: string) => {
    const res = await fetch(
      `/api/floci/stepfunctions?endpoint=${encodeURIComponent(endpoint)}&action=describe_execution&executionArn=${encodeURIComponent(executionArn)}`
    );
    const data = await res.json();
    if (res.ok) setInspectResource(data);
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
            <GitBranch className="text-primary" size={24} />
            <span>{serviceLabels.stepfunctions}</span>
          </h1>
          <p className="text-sm text-muted mt-1">
            Orchestrate ASL state machines, start executions, and inspect execution history.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedArn && (
            <button
              onClick={() => setIsStartOpen(true)}
              className="px-3 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 cursor-pointer"
            >
              <Play size={14} /> Start Execution
            </button>
          )}
          <button
            onClick={() => setIsCreateOpen(true)}
            className="px-3 py-2 rounded-lg text-xs font-semibold bg-primary hover:opacity-90 text-white flex items-center gap-1.5 cursor-pointer"
          >
            <Plus size={14} /> Create State Machine
          </button>
          <button
            onClick={loadMachines}
            className="p-2 rounded-lg bg-surface border border-line hover:bg-surface-hover cursor-pointer"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* State Machines List */}
        <div className="bg-surface border border-line rounded-panel p-4 space-y-3">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted">
            State Machines ({machines.length})
          </div>
          {loading ? (
            <div className="text-xs text-muted py-6 text-center">Loading...</div>
          ) : machines.length === 0 ? (
            <div className="text-xs text-muted py-6 text-center">No state machines found.</div>
          ) : (
            <div className="space-y-2">
              {machines.map((sm) => (
                <div
                  key={sm.stateMachineArn}
                  onClick={() => setSelectedArn(sm.stateMachineArn)}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedArn === sm.stateMachineArn
                      ? "bg-primary/10 border-primary"
                      : "bg-background border-line hover:border-primary/40"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-xs truncate">{sm.name}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Delete state machine "${sm.name}"?`)) {
                          postAction(
                            { action: "delete_state_machine", stateMachineArn: sm.stateMachineArn },
                            `State machine "${sm.name}" deleted`
                          ).then((ok) => {
                            if (ok && selectedArn === sm.stateMachineArn) {
                              setSelectedArn(null);
                              setSelectedMachine(null);
                              setExecutions([]);
                            }
                          });
                        }
                      }}
                      className="text-muted hover:text-red-400"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                  <div className="text-[10px] text-muted font-mono mt-1">{sm.type || "STANDARD"}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Executions & Definition */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-surface border border-line rounded-panel overflow-hidden">
            <div className="p-4 border-b border-line flex items-center justify-between">
              <div className="text-sm font-semibold">
                Executions {selectedMachine?.name ? `— ${selectedMachine.name}` : ""} ({executions.length})
              </div>
              {selectedMachine && (
                <button
                  onClick={() => setInspectResource(selectedMachine)}
                  className="px-2.5 py-1 rounded bg-background border border-line text-xs flex items-center gap-1 cursor-pointer"
                >
                  <Code size={13} /> ASL Definition
                </button>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-background/50 border-b border-line text-muted uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Execution</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Started</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {executions.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-muted">
                        No executions recorded yet.
                      </td>
                    </tr>
                  ) : (
                    executions.map((ex) => (
                      <tr key={ex.executionArn} className="hover:bg-background/40">
                        <td className="px-4 py-3 font-mono font-medium">{ex.name}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              ex.status === "SUCCEEDED"
                                ? "bg-emerald-500/15 text-emerald-400"
                                : ex.status === "RUNNING"
                                  ? "bg-blue-500/15 text-blue-400"
                                  : "bg-red-500/15 text-red-400"
                            }`}
                          >
                            {ex.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted">
                          <span className="inline-flex items-center gap-1">
                            <Clock size={12} />
                            {ex.startDate ? new Date(ex.startDate).toLocaleString() : "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              onClick={() => inspectExecution(ex.executionArn)}
                              className="px-2 py-1 rounded bg-background border border-line hover:border-primary text-[11px] cursor-pointer"
                            >
                              History
                            </button>
                            {ex.status === "RUNNING" && (
                              <button
                                onClick={() =>
                                  postAction(
                                    { action: "stop_execution", executionArn: ex.executionArn },
                                    "Execution stopped"
                                  )
                                }
                                className="p-1.5 rounded bg-background border border-line text-red-400 cursor-pointer"
                                title="Stop Execution"
                              >
                                <Square size={12} />
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
          </div>
        </div>
      </div>

      {/* Create State Machine Modal */}
      {mounted && isCreateOpen &&
        createPortal(
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-surface border border-line rounded-panel w-full max-w-xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold">Create State Machine</h2>
                <button onClick={() => setIsCreateOpen(false)} className="text-muted hover:text-foreground">
                  <X size={18} />
                </button>
              </div>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const ok = await postAction(
                    { action: "create_state_machine", name: smName.trim(), type: smType, definition: smDef },
                    `State machine "${smName}" created`
                  );
                  if (ok) {
                    setSmName("");
                    setIsCreateOpen(false);
                  }
                }}
                className="space-y-3"
              >
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-muted mb-1">Name</label>
                    <input
                      required
                      value={smName}
                      onChange={(e) => setSmName(e.target.value)}
                      placeholder="order-workflow"
                      className="w-full px-3 py-2 rounded-lg bg-background border border-line text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted mb-1">Type</label>
                    <select
                      value={smType}
                      onChange={(e) => setSmType(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-background border border-line text-sm"
                    >
                      <option value="STANDARD">STANDARD</option>
                      <option value="EXPRESS">EXPRESS</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">ASL Definition (JSON)</label>
                  <textarea
                    rows={10}
                    required
                    value={smDef}
                    onChange={(e) => setSmDef(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-background border border-line text-xs font-mono"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setIsCreateOpen(false)} className="px-3 py-1.5 rounded-lg border border-line text-xs">
                    Cancel
                  </button>
                  <button type="submit" className="px-4 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold">
                    Create
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* Start Execution Modal */}
      {mounted && isStartOpen && selectedArn &&
        createPortal(
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-surface border border-line rounded-panel w-full max-w-lg p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold">Start Execution</h2>
                <button onClick={() => setIsStartOpen(false)} className="text-muted hover:text-foreground">
                  <X size={18} />
                </button>
              </div>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const ok = await postAction(
                    {
                      action: "start_execution",
                      stateMachineArn: selectedArn,
                      name: execName.trim() || undefined,
                      input: execInput,
                    },
                    "Execution started"
                  );
                  if (ok) {
                    setExecName("");
                    setIsStartOpen(false);
                  }
                }}
                className="space-y-3"
              >
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">Execution Name (optional)</label>
                  <input
                    value={execName}
                    onChange={(e) => setExecName(e.target.value)}
                    placeholder="exec-001"
                    className="w-full px-3 py-2 rounded-lg bg-background border border-line text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">Input Payload (JSON)</label>
                  <textarea
                    rows={5}
                    value={execInput}
                    onChange={(e) => setExecInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-background border border-line text-xs font-mono"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setIsStartOpen(false)} className="px-3 py-1.5 rounded-lg border border-line text-xs">
                    Cancel
                  </button>
                  <button type="submit" className="px-4 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold">
                    Start Execution
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      <ResourceDrawer
        isOpen={!!inspectResource}
        onClose={() => setInspectResource(null)}
        title={inspectResource?.name || inspectResource?.execution?.name || "Step Functions Detail"}
        subtitle={inspectResource?.stateMachineArn || inspectResource?.execution?.executionArn || ""}
        data={inspectResource}
      />
    </div>
  );
}
