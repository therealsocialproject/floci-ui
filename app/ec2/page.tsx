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
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Toast Notifications */}
      {errorMessage && (
        <div className="fixed top-20 right-6 z-50 flex items-center gap-2 bg-rose-950/90 border border-rose-500/50 text-rose-200 px-4 py-3 rounded-xl shadow-2xl backdrop-blur-md text-xs">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{errorMessage}</span>
          <button onClick={() => setErrorMessage(null)} className="ml-2 text-rose-400 hover:text-rose-100">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
      {successMessage && (
        <div className="fixed top-20 right-6 z-50 flex items-center gap-2 bg-emerald-950/90 border border-emerald-500/50 text-emerald-200 px-4 py-3 rounded-xl shadow-2xl backdrop-blur-md text-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successMessage}</span>
          <button onClick={() => setSuccessMessage(null)} className="ml-2 text-emerald-400 hover:text-emerald-100">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <Server className={`w-6 h-6 ${isAws ? "text-amber-400" : "text-blue-400"}`} />
            {isAws ? "EC2 Compute Instances" : "Compute Engine VM Instances"}
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            {isAws
              ? "Launch and manage virtual machines and containerized EC2 instances running in Floci"
              : "Launch and manage simulated GCE compute nodes, machine types, and attached service accounts"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsLaunchModalOpen(true)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white shadow-lg transition-all ${
              isAws
                ? "bg-amber-600 hover:bg-amber-500 shadow-amber-600/20"
                : "bg-blue-600 hover:bg-blue-500 shadow-blue-600/20"
            }`}
          >
            <Plus className="w-4 h-4" />
            {isAws ? "Launch Instance" : "Create VM Instance"}
          </button>

          <button
            onClick={fetchInstances}
            disabled={loading}
            className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 px-4 py-2 rounded-xl text-xs font-semibold transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-emerald-400" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Instances Table */}
      {loading ? (
        <div className="bg-[#0d1322] border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-400 mb-3" />
          Querying {serviceLabels.instances} from {endpoint}...
        </div>
      ) : instances.length === 0 ? (
        <div className="bg-[#0d1322] border border-slate-800 rounded-2xl p-12 text-center text-slate-400 space-y-3">
          <Server className="w-10 h-10 mx-auto text-slate-600" />
          <p className="font-semibold text-slate-300">No {serviceLabels.instances} found</p>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Click &apos;{isAws ? "Launch Instance" : "Create VM Instance"}&apos; to deploy your first simulated virtual machine.
          </p>
          <button
            onClick={() => setIsLaunchModalOpen(true)}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white transition-all ${
              isAws ? "bg-amber-600 hover:bg-amber-500" : "bg-blue-600 hover:bg-blue-500"
            }`}
          >
            <Plus className="w-3.5 h-3.5" /> Launch Now
          </button>
        </div>
      ) : (
        <div className="bg-[#0d1322] border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/80 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-6 py-3.5">{isAws ? "Instance ID / Name" : "VM Name / ID"}</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">{isAws ? "Instance Type" : "Machine Type"}</th>
                  <th className="px-6 py-3.5">Network Interfaces</th>
                  <th className="px-6 py-3.5">{isAws ? "Security / IAM" : "Firewall / Identity"}</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {instances.map((inst) => {
                  const isRunning = inst.state === "running";
                  const nameTag = inst.tags?.Name || inst.tags?.name || inst.instanceId;
                  const workloadTag = inst.tags?.Role || inst.tags?.Workload || inst.tags?.workload;

                  return (
                    <tr key={inst.instanceId} className="hover:bg-slate-900/40 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-200">{nameTag}</div>
                        <div className="font-mono text-[11px] text-slate-400 mt-0.5">{inst.instanceId}</div>
                        {workloadTag && (
                          <div
                            className={`mt-1 inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded border ${
                              isAws
                                ? "text-amber-400 bg-amber-500/10 border-amber-500/20"
                                : "text-blue-400 bg-blue-500/10 border-blue-500/20"
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
                              ? "bg-emerald-950/60 text-emerald-400 border-emerald-500/30"
                              : "bg-slate-900 text-slate-400 border-slate-800"
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
                      <td className="px-6 py-4 font-mono text-slate-300">
                        {inst.tags?.MachineType || inst.instanceType}
                      </td>
                      <td className="px-6 py-4 space-y-1">
                        <div className="flex items-center gap-1.5 text-slate-300 font-mono">
                          <Globe className="w-3 h-3 text-slate-500" />
                          <span>External: {inst.publicIp}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-400 font-mono">
                          <Lock className="w-3 h-3 text-slate-500" />
                          <span>Internal: {inst.privateIp}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 space-y-1.5">
                        {inst.securityGroups?.length > 0 && (
                          <div className="flex items-center gap-1.5 text-slate-300">
                            <Shield
                              className={`w-3.5 h-3.5 shrink-0 ${
                                isAws ? "text-amber-400" : "text-blue-400"
                              }`}
                            />
                            <span className="truncate max-w-[180px]">
                              {inst.securityGroups.map((s: any) => s.groupName).join(", ")}
                            </span>
                          </div>
                        )}
                        {(inst.iamInstanceProfile !== "-" || inst.tags?.ServiceAccount) && (
                          <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-mono truncate max-w-[200px]">
                            <Key className="w-3 h-3 text-emerald-400 shrink-0" />
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
                              className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-amber-400 border border-slate-800 transition-colors"
                            >
                              <Square className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleAction("start", inst.instanceId)}
                              disabled={actionLoading !== null}
                              title="Start VM"
                              className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-emerald-400 border border-slate-800 transition-colors"
                            >
                              <Play className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => handleAction("terminate", inst.instanceId)}
                            disabled={actionLoading !== null}
                            title="Delete / Terminate VM"
                            className="p-1.5 rounded-lg bg-slate-900 hover:bg-rose-950/40 text-rose-400 border border-slate-800 transition-colors"
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
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsLaunchModalOpen(false);
          }}
        >
          <div className="bg-[#0f172a] border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Server className={`w-5 h-5 ${isAws ? "text-amber-400" : "text-blue-400"}`} />
                <h3 className="font-bold text-slate-100 text-base">
                  {isAws ? "Launch EC2 Instance" : "Create Compute Instance"}
                </h3>
              </div>
              <button
                onClick={() => setIsLaunchModalOpen(false)}
                className="text-slate-400 hover:text-slate-100 p-1 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleLaunch} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Instance Name (Tag: Name)
                </label>
                <input
                  type="text"
                  placeholder="e.g. backend-api-01"
                  value={instanceName}
                  onChange={(e) => setInstanceName(e.target.value)}
                  required
                  className="w-full bg-slate-900 border border-slate-800 px-3.5 py-2 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  {isAws ? "Instance Type" : "Machine Type"}
                </label>
                <select
                  value={instanceType}
                  onChange={(e) => setInstanceType(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 px-3.5 py-2 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-emerald-500 font-mono cursor-pointer"
                >
                  {instanceTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Workload / Role Tag
                </label>
                <input
                  type="text"
                  placeholder="e.g. web, worker, api"
                  value={workloadTag}
                  onChange={(e) => setWorkloadTag(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 px-3.5 py-2 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Image ID / AMI
                </label>
                <input
                  type="text"
                  value={imageId}
                  onChange={(e) => setImageId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 px-3.5 py-2 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsLaunchModalOpen(false)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-slate-200 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading !== null}
                  className={`px-4 py-2 text-xs font-semibold text-white rounded-xl transition-colors flex items-center gap-1.5 ${
                    isAws
                      ? "bg-amber-600 hover:bg-amber-500"
                      : "bg-blue-600 hover:bg-blue-500"
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
