"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Server,
  RefreshCw,
  Play,
  Square,
  Trash2,
  Shield,
  Tag,
  Key,
  Globe,
  Lock,
  Plus,
  X,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { useEndpoint } from "@/components/EndpointProvider";
import { useCloudTheme } from "@/components/CloudThemeContext";

export default function EC2Page() {
  const { endpoint, isConnected } = useEndpoint();
  const { cloudMode, serviceLabels } = useCloudTheme();
  const [instances, setInstances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // Launch modal state
  const [isLaunchModalOpen, setIsLaunchModalOpen] = useState(false);
  const [instanceName, setInstanceName] = useState("");
  const [instanceType, setInstanceType] = useState(cloudMode === "gcp" ? "e2-micro" : "t3.micro");
  const [workloadTag, setWorkloadTag] = useState("web-server");
  const [imageId, setImageId] = useState("ami-12345678");

  // Notifications
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const isAws = cloudMode === "aws";

  useEffect(() => {
    setMounted(true);
  }, []);

  const showNotification = (msg: string, isError = false) => {
    if (isError) {
      setErrorMessage(msg);
      setTimeout(() => setErrorMessage(null), 5000);
    } else {
      setSuccessMessage(msg);
      setTimeout(() => setSuccessMessage(null), 4000);
    }
  };

  const fetchInstances = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/floci/ec2?endpoint=${encodeURIComponent(endpoint)}`);
      const json = await res.json();
      if (json.success) {
        setInstances(json.data || []);
      }
    } catch (e: any) {
      console.error(e);
      showNotification(e.message || "Failed to fetch instances", true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isConnected) {
      fetchInstances();
    }
  }, [endpoint, isConnected]);

  const handleAction = async (action: string, instanceId: string) => {
    if (action === "terminate") {
      if (!confirm(`Are you sure you want to terminate instance ${instanceId}? This will permanently delete the instance.`)) {
        return;
      }
    }

    setActionLoading(`${action}-${instanceId}`);
    try {
      const res = await fetch("/api/floci/ec2", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, instanceId, endpoint }),
      });
      const json = await res.json();
      if (json.success) {
        showNotification(`Instance ${action}ed successfully`);
        await fetchInstances();
      } else {
        showNotification(json.error || `Failed to ${action} instance`, true);
      }
    } catch (e: any) {
      console.error(e);
      showNotification(e.message || "Network error", true);
    } finally {
      setActionLoading(null);
    }
  };

  const handleLaunch = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading("launch");

    try {
      const res = await fetch("/api/floci/ec2", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "launch",
          name: instanceName.trim(),
          instanceType,
          workload: workloadTag.trim(),
          imageId: imageId.trim(),
          endpoint,
        }),
      });
      const json = await res.json();
      if (json.success) {
        showNotification("Instance launched successfully!");
        setInstanceName("");
        setIsLaunchModalOpen(false);
        await fetchInstances();
      } else {
        showNotification(json.error || "Failed to launch instance", true);
      }
    } catch (err: any) {
      showNotification(err.message || "Network error", true);
    } finally {
      setActionLoading(null);
    }
  };

  const instanceTypes = isAws
    ? ["t3.nano", "t3.micro", "t3.small", "t3.medium", "t3.large", "c5.large", "m5.large"]
    : ["e2-micro", "e2-small", "e2-medium", "n1-standard-1", "n1-standard-2", "c2-standard-4"];

  return (
    <div className="space-y-6 resource-page">
      {/* Toast Notifications */}
      {errorMessage && (
        <div className="fixed top-20 right-6 z-50 flex items-center gap-2 bg-danger-soft border border-rose-500/50 text-danger px-4 py-3 rounded-control shadow-2xl backdrop-blur-md text-xs">
          <AlertCircle className="w-4 h-4 text-danger shrink-0" />
          <span>{errorMessage}</span>
          <button onClick={() => setErrorMessage(null)} className="ml-2 text-danger hover:text-danger">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
      {successMessage && (
        <div className="fixed top-20 right-6 z-50 flex items-center gap-2 bg-success-soft border border-emerald-500/50 text-success px-4 py-3 rounded-control shadow-2xl backdrop-blur-md text-xs">
          <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
          <span>{successMessage}</span>
          <button onClick={() => setSuccessMessage(null)} className="ml-2 text-success hover:text-emerald-100">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-ink flex items-center gap-3">
            <Server className={`w-6 h-6 ${isAws ? "text-accent" : "text-accent"}`} />
            {isAws ? "EC2 Compute Instances" : "Compute Engine VM Instances"}
          </h2>
          <p className="text-sm text-muted mt-1">
            {isAws
              ? "Launch and manage virtual machines and containerized EC2 instances running in Floci"
              : "Launch and manage simulated GCE compute nodes, machine types, and attached service accounts"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsLaunchModalOpen(true)}
            className={`flex items-center gap-2 px-4 py-2 rounded-control text-xs font-semibold text-white transition-all ${
              isAws
                ? "bg-action hover:bg-action shadow-amber-600/20"
                : "bg-action hover:bg-action shadow-blue-600/20"
            }`}
          >
            <Plus className="w-4 h-4" />
            {isAws ? "Launch Instance" : "Create VM Instance"}
          </button>

          <button
            onClick={fetchInstances}
            disabled={loading}
            className="flex items-center gap-2 bg-subtle hover:bg-subtle text-ink border border-line px-4 py-2 rounded-control text-xs font-semibold transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-success" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Instances Table */}
      {loading ? (
        <div className="bg-surface border border-line rounded-panel p-12 text-center text-muted">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-success mb-3" />
          Querying {serviceLabels.instances} from {endpoint}...
        </div>
      ) : instances.length === 0 ? (
        <div className="bg-surface border border-line rounded-panel p-12 text-center text-muted space-y-3">
          <Server className="w-10 h-10 mx-auto text-muted" />
          <p className="font-semibold text-ink">No {serviceLabels.instances} found</p>
          <p className="text-xs text-muted max-w-sm mx-auto">
            Click &apos;{isAws ? "Launch Instance" : "Create VM Instance"}&apos; to deploy your first simulated virtual machine.
          </p>
          <button
            onClick={() => setIsLaunchModalOpen(true)}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-control text-xs font-semibold text-white transition-all ${
              isAws ? "bg-action hover:bg-action" : "bg-action hover:bg-action"
            }`}
          >
            <Plus className="w-3.5 h-3.5" /> Launch Now
          </button>
        </div>
      ) : (
        <div className="bg-surface border border-line rounded-panel overflow-hidden ">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-subtle border-b border-line text-muted uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-6 py-3.5">{isAws ? "Instance ID / Name" : "VM Name / ID"}</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">{isAws ? "Instance Type" : "Machine Type"}</th>
                  <th className="px-6 py-3.5">Network Interfaces</th>
                  <th className="px-6 py-3.5">{isAws ? "Security / IAM" : "Firewall / Identity"}</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {instances.map((inst) => {
                  const isRunning = inst.state === "running";
                  const nameTag = inst.tags?.Name || inst.tags?.name || inst.instanceId;
                  const workloadTag = inst.tags?.Role || inst.tags?.Workload || inst.tags?.workload;

                  return (
                    <tr key={inst.instanceId} className="hover:bg-subtle transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-ink">{nameTag}</div>
                        <div className="font-mono text-[11px] text-muted mt-0.5">{inst.instanceId}</div>
                        {workloadTag && (
                          <div
                            className={`mt-1 inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded border ${
                              isAws
                                ? "text-accent bg-selected border-line"
                                : "text-accent bg-selected border-line"
                            }`}
                          >
                            <Tag className="w-2.5 h-2.5" />
                            {workloadTag}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                            isRunning
                              ? "bg-success-soft text-success border-emerald-500/30"
                              : "bg-subtle text-muted border-line"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isRunning ? "bg-emerald-400 animate-pulse" : "bg-slate-500"
                            }`}
                          />
                          {inst.state}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono text-ink">
                        {inst.tags?.MachineType || inst.instanceType}
                      </td>
                      <td className="px-6 py-4 space-y-1">
                        <div className="flex items-center gap-1.5 text-ink font-mono">
                          <Globe className="w-3 h-3 text-muted" />
                          <span>External: {inst.publicIp}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-muted font-mono">
                          <Lock className="w-3 h-3 text-muted" />
                          <span>Internal: {inst.privateIp}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 space-y-1.5">
                        {inst.securityGroups?.length > 0 && (
                          <div className="flex items-center gap-1.5 text-ink">
                            <Shield
                              className={`w-3.5 h-3.5 shrink-0 ${
                                isAws ? "text-accent" : "text-accent"
                              }`}
                            />
                            <span className="truncate max-w-[180px]">
                              {inst.securityGroups.map((s: any) => s.groupName).join(", ")}
                            </span>
                          </div>
                        )}
                        {(inst.iamInstanceProfile !== "-" || inst.tags?.ServiceAccount) && (
                          <div className="flex items-center gap-1.5 text-muted text-[11px] font-mono truncate max-w-[200px]">
                            <Key className="w-3 h-3 text-success shrink-0" />
                            <span className="truncate">
                              {inst.tags?.ServiceAccount || inst.iamInstanceProfile.split("/").pop()}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {isRunning ? (
                            <button
                              onClick={() => handleAction("stop", inst.instanceId)}
                              disabled={actionLoading !== null}
                              title="Stop VM"
                              className="p-1.5 rounded-lg bg-subtle hover:bg-subtle text-accent border border-line transition-colors"
                            >
                              <Square className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleAction("start", inst.instanceId)}
                              disabled={actionLoading !== null}
                              title="Start VM"
                              className="p-1.5 rounded-lg bg-subtle hover:bg-subtle text-success border border-line transition-colors"
                            >
                              <Play className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => handleAction("terminate", inst.instanceId)}
                            disabled={actionLoading !== null}
                            title="Delete / Terminate VM"
                            className="p-1.5 rounded-lg bg-subtle hover:bg-danger-soft text-danger border border-line transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Launch Instance Modal */}
      {isLaunchModalOpen && mounted && createPortal(
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsLaunchModalOpen(false);
          }}
        >
          <div className="bg-surface border border-line rounded-panel w-full max-w-md p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div className="flex items-center gap-2">
                <Server className={`w-5 h-5 ${isAws ? "text-accent" : "text-accent"}`} />
                <h3 className="font-bold text-ink text-base">
                  {isAws ? "Launch EC2 Instance" : "Create Compute Instance"}
                </h3>
              </div>
              <button
                onClick={() => setIsLaunchModalOpen(false)}
                className="text-muted hover:text-ink p-1 hover:bg-subtle rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleLaunch} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-ink mb-1.5">
                  Instance Name (Tag: Name)
                </label>
                <input
                  type="text"
                  placeholder="e.g. backend-api-01"
                  value={instanceName}
                  onChange={(e) => setInstanceName(e.target.value)}
                  required
                  className="w-full bg-subtle border border-line px-3.5 py-2 rounded-control text-xs text-ink focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink mb-1.5">
                  {isAws ? "Instance Type" : "Machine Type"}
                </label>
                <select
                  value={instanceType}
                  onChange={(e) => setInstanceType(e.target.value)}
                  className="w-full bg-subtle border border-line px-3.5 py-2 rounded-control text-xs text-ink focus:outline-none focus:border-emerald-500 font-mono cursor-pointer"
                >
                  {instanceTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink mb-1.5">
                  Workload / Role Tag
                </label>
                <input
                  type="text"
                  placeholder="e.g. web, worker, api"
                  value={workloadTag}
                  onChange={(e) => setWorkloadTag(e.target.value)}
                  className="w-full bg-subtle border border-line px-3.5 py-2 rounded-control text-xs text-ink focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink mb-1.5">
                  Image ID / AMI
                </label>
                <input
                  type="text"
                  value={imageId}
                  onChange={(e) => setImageId(e.target.value)}
                  className="w-full bg-subtle border border-line px-3.5 py-2 rounded-control text-xs text-ink focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsLaunchModalOpen(false)}
                  className="px-4 py-2 text-xs text-muted hover:text-ink rounded-control"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading !== null}
                  className={`px-4 py-2 text-xs font-semibold text-white rounded-control transition-colors flex items-center gap-1.5 ${
                    isAws
                      ? "bg-action hover:bg-action"
                      : "bg-action hover:bg-action"
                  }`}
                >
                  {actionLoading === "launch" ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  Launch Instance
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
