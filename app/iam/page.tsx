"use client";

import React, { useState, useEffect } from "react";
import {
  Users,
  RefreshCw,
  KeyRound,
  Shield,
  UserCheck,
  Layers,
  Search,
} from "lucide-react";
import { useEndpoint } from "@/components/EndpointProvider";

type IAMTab = "roles" | "users" | "groups" | "policies";

export default function IAMPage() {
  const { endpoint, isConnected } = useEndpoint();
  const [activeTab, setActiveTab] = useState<IAMTab>("roles");
  const [iamData, setIamData] = useState<{
    roles: any[];
    users: any[];
    groups: any[];
    policies: any[];
  }>({ roles: [], users: [], groups: [], policies: [] });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchIAM = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/floci/iam?endpoint=${encodeURIComponent(endpoint)}&resource=all`);
      const json = await res.json();
      if (json.success) {
        setIamData({
          roles: json.data?.roles || [],
          users: json.data?.users || [],
          groups: json.data?.groups || [],
          policies: json.data?.policies || [],
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isConnected) {
      fetchIAM();
    }
  }, [endpoint, isConnected]);

  const currentList = iamData[activeTab] || [];
  const filteredList = currentList.filter((item: any) => {
    const text = (item.roleName || item.userName || item.groupName || item.policyName || item.arn || "").toLowerCase();
    return text.includes(search.toLowerCase());
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <Users className="w-6 h-6 text-emerald-400" />
            IAM Access & Permissions
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Manage simulated IAM Roles, Users, Groups, and Managed Policies in Floci
          </p>
        </div>

        <button
          onClick={fetchIAM}
          disabled={loading}
          className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 px-4 py-2 rounded-xl text-xs font-semibold transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-emerald-400" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Tabs and Search Bar */}
      <div className="bg-[#0d1322] border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 p-1 bg-slate-900 border border-slate-800 rounded-xl text-xs w-full sm:w-auto">
          <button
            onClick={() => setActiveTab("roles")}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 ${
              activeTab === "roles"
                ? "bg-emerald-500 text-slate-950 shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            Roles ({iamData.roles.length})
          </button>
          <button
            onClick={() => setActiveTab("users")}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 ${
              activeTab === "users"
                ? "bg-emerald-500 text-slate-950 shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            Users ({iamData.users.length})
          </button>
          <button
            onClick={() => setActiveTab("groups")}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 ${
              activeTab === "groups"
                ? "bg-emerald-500 text-slate-950 shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Groups ({iamData.groups.length})
          </button>
          <button
            onClick={() => setActiveTab("policies")}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 ${
              activeTab === "policies"
                ? "bg-emerald-500 text-slate-950 shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            Policies ({iamData.policies.length})
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={`Search ${activeTab}...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 pl-9 pr-4 py-1.5 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Main Table */}
      {loading ? (
        <div className="bg-[#0d1322] border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-400 mb-3" />
          Loading IAM {activeTab}...
        </div>
      ) : filteredList.length === 0 ? (
        <div className="bg-[#0d1322] border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
          No {activeTab} match your criteria.
        </div>
      ) : (
        <div className="bg-[#0d1322] border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/80 border-b border-slate-800 text-slate-400 uppercase font-semibold">
              <tr>
                <th className="px-6 py-3.5">Name</th>
                <th className="px-6 py-3.5">ARN</th>
                <th className="px-6 py-3.5">Created</th>
                {activeTab === "policies" && <th className="px-6 py-3.5">Attachments</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {filteredList.map((item: any, idx: number) => {
                const name = item.roleName || item.userName || item.groupName || item.policyName;
                return (
                  <tr key={item.arn || idx} className="hover:bg-slate-900/40 transition-colors">
                    <td className="px-6 py-3.5 font-semibold text-slate-200">{name}</td>
                    <td className="px-6 py-3.5 text-slate-400 text-[11px] truncate max-w-md">
                      {item.arn}
                    </td>
                    <td className="px-6 py-3.5 text-slate-500 text-[11px] font-sans">
                      {item.createDate ? new Date(item.createDate).toLocaleDateString() : "-"}
                    </td>
                    {activeTab === "policies" && (
                      <td className="px-6 py-3.5 text-slate-300 font-sans">
                        <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold">
                          {item.attachmentCount} attached
                        </span>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
