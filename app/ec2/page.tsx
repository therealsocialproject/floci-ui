"use client";

import React, { useState, useEffect } from "react";
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
} from "lucide-react";
import { useEndpoint } from "@/components/EndpointProvider";
import { useCloudTheme } from "@/components/CloudThemeContext";

export default function EC2Page() {
  const { endpoint, isConnected } = useEndpoint();
  const { cloudMode, serviceLabels } = useCloudTheme();
  const [instances, setInstances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const isAws = cloudMode === "aws";

  const fetchInstances = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/floci/ec2?endpoint=${encodeURIComponent(endpoint)}`);
      const json = await res.json();
      if (json.success) {
        setInstances(json.data || []);
      }
    } catch (e) {
      console.error(e);
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
    setActionLoading(`${action}-${instanceId}`);
    try {
      const res = await fetch("/api/floci/ec2", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, instanceId, endpoint }),
      });
      const json = await res.json();
      if (json.success) {
        await fetchInstances();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <Server className={`w-6 h-6 ${isAws ? "text-amber-400" : "text-blue-400"}`} />
            {isAws ? "EC2 Compute Instances" : "Compute Engine VM Instances"}
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            {isAws
              ? "Manage virtual machines and containerized EC2 instances running in Floci"
              : "Manage simulated GCE compute nodes, machine types, and attached service accounts"}
          </p>
        </div>

        <button
          onClick={fetchInstances}
          disabled={loading}
          className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 px-4 py-2 rounded-xl text-xs font-semibold transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-emerald-400" : ""}`} />
          Refresh
        </button>
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
            Run an instance launch command or trigger your synthetic workload generator script to populate this list.
          </p>
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
    </div>
  );
}
