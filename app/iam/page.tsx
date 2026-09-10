"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Users,
  RefreshCw,
  KeyRound,
  Shield,
  UserCheck,
  Search,
  Plus,
  Trash2,
  X,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { useEndpoint } from "@/components/EndpointProvider";
import { useCloudTheme } from "@/components/CloudThemeContext";

type IAMTab = "roles" | "users" | "groups" | "policies";

export default function IAMPage() {
  const { endpoint, isConnected } = useEndpoint();
  const { cloudMode, serviceLabels } = useCloudTheme();
  const [activeTab, setActiveTab] = useState<IAMTab>("roles");
  const [iamData, setIamData] = useState<{
    roles: any[];
    users: any[];
    groups: any[];
    policies: any[];
  }>({ roles: [], users: [], groups: [], policies: [] });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [mounted, setMounted] = useState(false);

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [descriptionInput, setDescriptionInput] = useState("");
  const [documentInput, setDocumentInput] = useState("");

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
    } catch (e: any) {
      console.error(e);
      showNotification(e.message || "Failed to query IAM service", true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isConnected) {
      fetchIAM();
    }
  }, [endpoint, isConnected]);

  const openCreateModal = () => {
    setNameInput("");
    setDescriptionInput("");
    if (activeTab === "roles") {
      setDocumentInput(
        JSON.stringify(
          {
            Version: "2012-10-17",
            Statement: [
              {
                Effect: "Allow",
                Principal: { Service: "ec2.amazonaws.com" },
                Action: "sts:AssumeRole",
              },
            ],
          },
          null,
          2
        )
      );
    } else if (activeTab === "policies") {
      setDocumentInput(
        JSON.stringify(
          {
            Version: "2012-10-17",
            Statement: [
              {
                Effect: "Allow",
                Action: "*",
                Resource: "*",
              },
            ],
          },
          null,
          2
        )
      );
    } else {
      setDocumentInput("");
    }
    setIsCreateOpen(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) return;

    setActionLoading(true);
    try {
      let body: any = { endpoint };

      if (activeTab === "roles") {
        body.action = "create-role";
        body.roleName = nameInput.trim();
        body.description = descriptionInput.trim();
        body.assumeRolePolicyDocument = documentInput.trim();
      } else if (activeTab === "users") {
        body.action = "create-user";
        body.userName = nameInput.trim();
      } else if (activeTab === "groups") {
        body.action = "create-group";
        body.groupName = nameInput.trim();
      } else if (activeTab === "policies") {
        body.action = "create-policy";
        body.policyName = nameInput.trim();
        body.description = descriptionInput.trim();
        body.policyDocument = documentInput.trim();
      }

      const res = await fetch("/api/floci/iam", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const json = await res.json();
      if (json.success) {
        showNotification(json.message || `Created successfully`);
        setIsCreateOpen(false);
        await fetchIAM();
      } else {
        showNotification(json.error || `Failed to create`, true);
      }
    } catch (err: any) {
      showNotification(err.message || "Network error", true);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (item: any) => {
    const identifier = item.roleName || item.userName || item.groupName || item.policyName;
    if (!confirm(`Are you sure you want to delete '${identifier}'?`)) return;

    try {
      let body: any = { endpoint };
      if (activeTab === "roles") {
        body.action = "delete-role";
        body.roleName = item.roleName;
      } else if (activeTab === "users") {
        body.action = "delete-user";
        body.userName = item.userName;
      } else if (activeTab === "groups") {
        body.action = "delete-group";
        body.groupName = item.groupName;
      } else if (activeTab === "policies") {
        body.action = "delete-policy";
        body.policyArn = item.arn;
      }

      const res = await fetch("/api/floci/iam", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const json = await res.json();
      if (json.success) {
        showNotification(json.message || "Deleted successfully");
        await fetchIAM();
      } else {
        showNotification(json.error || "Failed to delete", true);
      }
    } catch (err: any) {
      showNotification(err.message || "Network error", true);
    }
  };

  const currentList = iamData[activeTab] || [];
  const filteredList = currentList.filter((item: any) => {
    const text = (item.roleName || item.userName || item.groupName || item.policyName || item.arn || "").toLowerCase();
    return text.includes(search.toLowerCase());
  });

  const tabActiveClass = isAws
    ? "bg-amber-500 text-slate-950 shadow-sm"
    : "bg-blue-600 text-white shadow-sm";

  const getCreateButtonLabel = () => {
    if (activeTab === "roles") return isAws ? "Create Role" : "Create Service Account";
    if (activeTab === "users") return isAws ? "Create User" : "Create Principal";
    if (activeTab === "groups") return "Create Group";
    return isAws ? "Create Policy" : "Create Permission";
  };

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
            <Users className={`w-6 h-6 ${isAws ? "text-amber-400" : "text-blue-400"}`} />
            {isAws ? "IAM Access & Permissions" : "IAM & Admin Console"}
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            {isAws
              ? "Create and manage simulated IAM Roles, Users, Groups, and Policies in Floci"
              : "Create and manage Service Accounts, Principals, Roles, and Permissions in Floci"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={openCreateModal}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white shadow-lg transition-all ${
              isAws
                ? "bg-amber-600 hover:bg-amber-500 shadow-amber-600/20"
                : "bg-blue-600 hover:bg-blue-500 shadow-blue-600/20"
            }`}
          >
            <Plus className="w-4 h-4" />
            {getCreateButtonLabel()}
          </button>

          <button
            onClick={fetchIAM}
            disabled={loading}
            className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 px-4 py-2 rounded-xl text-xs font-semibold transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-emerald-400" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Tabs and Search Bar */}
      <div className="bg-[#0d1322] border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 p-1 bg-slate-900 border border-slate-800 rounded-xl text-xs w-full sm:w-auto">
          <button
            onClick={() => setActiveTab("roles")}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 ${
              activeTab === "roles" ? tabActiveClass : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            {isAws ? "Roles" : "Roles / Service Accounts"} ({iamData.roles.length})
          </button>
          <button
            onClick={() => setActiveTab("users")}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 ${
              activeTab === "users" ? tabActiveClass : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            {isAws ? "Users" : "Principals"} ({iamData.users.length})
          </button>
          <button
            onClick={() => setActiveTab("groups")}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 ${
              activeTab === "groups" ? tabActiveClass : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Groups ({iamData.groups.length})
          </button>
          <button
            onClick={() => setActiveTab("policies")}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 ${
              activeTab === "policies" ? tabActiveClass : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            {isAws ? "Policies" : "Permissions"} ({iamData.policies.length})
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={`Search ${activeTab}...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 pl-9 pr-4 py-1.5 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-slate-600"
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
        <div className="bg-[#0d1322] border border-slate-800 rounded-2xl p-12 text-center text-slate-400 space-y-3">
          <p>No {activeTab} match your criteria.</p>
          <button
            onClick={openCreateModal}
            className="text-xs font-semibold text-emerald-400 hover:underline"
          >
            + {getCreateButtonLabel()}
          </button>
        </div>
      ) : (
        <div className="bg-[#0d1322] border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/80 border-b border-slate-800 text-slate-400 uppercase font-semibold">
              <tr>
                <th className="px-6 py-3.5">{isAws ? "Identity Name" : "Principal / Resource"}</th>
                <th className="px-6 py-3.5">ARN / Identifier</th>
                <th className="px-6 py-3.5">Created</th>
                {activeTab === "policies" && <th className="px-6 py-3.5">Attachments</th>}
                <th className="px-6 py-3.5 text-right">Actions</th>
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
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                            isAws
                              ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                              : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                          }`}
                        >
                          {item.attachmentCount} attached
                        </span>
                      </td>
                    )}
                    <td className="px-6 py-3.5 text-right font-sans">
                      <button
                        onClick={() => handleDelete(item)}
                        title={`Delete ${name}`}
                        className="p-1 text-slate-500 hover:text-rose-400 rounded transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Modal */}
      {isCreateOpen && mounted && createPortal(
        <div
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsCreateOpen(false);
          }}
        >
          <div className="bg-[#0f172a] border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Users className={`w-5 h-5 ${isAws ? "text-amber-400" : "text-blue-400"}`} />
                <h3 className="font-bold text-slate-100 text-base">
                  {getCreateButtonLabel()}
                </h3>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-slate-400 hover:text-slate-100 p-1 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  {activeTab === "roles"
                    ? "Role Name"
                    : activeTab === "users"
                    ? "User Name"
                    : activeTab === "groups"
                    ? "Group Name"
                    : "Policy Name"}
                </label>
                <input
                  type="text"
                  placeholder="e.g. app-admin, read-only-service, lambda-runner"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  required
                  className="w-full bg-slate-900 border border-slate-800 px-3.5 py-2 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              {(activeTab === "roles" || activeTab === "policies") && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Description
                  </label>
                  <input
                    type="text"
                    placeholder="Short description of purpose"
                    value={descriptionInput}
                    onChange={(e) => setDescriptionInput(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 px-3.5 py-2 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              )}

              {(activeTab === "roles" || activeTab === "policies") && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    {activeTab === "roles" ? "AssumeRole Trust Policy (JSON)" : "Policy Document (JSON)"}
                  </label>
                  <textarea
                    rows={8}
                    value={documentInput}
                    onChange={(e) => setDocumentInput(e.target.value)}
                    required
                    className="w-full bg-slate-900 border border-slate-800 p-3 rounded-xl text-xs text-emerald-400 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-slate-200 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className={`px-4 py-2 text-xs font-semibold text-white rounded-xl transition-colors flex items-center gap-1.5 ${
                    isAws
                      ? "bg-amber-600 hover:bg-amber-500"
                      : "bg-blue-600 hover:bg-blue-500"
                  }`}
                >
                  {actionLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  Create
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
