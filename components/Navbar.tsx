"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Server,
  Database,
  FolderLock,
  Users,
  RefreshCw,
  Layers,
  ChevronDown,
  Plus,
  Trash2,
  Globe,
  Settings2,
  X,
  Boxes,
} from "lucide-react";
import { useEndpoint } from "./EndpointProvider";
import { useCloudTheme } from "./CloudThemeContext";

export function Sidebar() {
  const pathname = usePathname();
  const { cloudMode, serviceLabels } = useCloudTheme();

  const isAws = cloudMode === "aws";

  const navItems = [
    { name: serviceLabels.dashboard, href: "/", icon: LayoutDashboard },
    { name: serviceLabels.ec2, href: "/ec2", icon: Server },
    { name: serviceLabels.s3, href: "/s3", icon: FolderLock },
    { name: serviceLabels.iam, href: "/iam", icon: Users },
    { name: serviceLabels.dynamodb, href: "/dynamodb", icon: Database },
  ];

  return (
    <aside
      className={`w-64 flex flex-col justify-between h-screen sticky top-0 transition-colors border-r ${
        isAws
          ? "bg-[#0f172a] border-slate-800"
          : "bg-[#111827] border-slate-800"
      }`}
    >
      <div>
        {/* Brand Header */}
        <div
          className={`h-16 flex items-center px-6 border-b transition-colors gap-3 ${
            isAws ? "border-slate-800" : "border-slate-800"
          }`}
        >
          <div
            className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm transition-colors ${
              isAws
                ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                : "bg-blue-500/10 text-blue-400 border border-blue-500/30"
            }`}
          >
            {isAws ? "aws" : "gcp"}
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-100 leading-tight">
              {isAws ? "AWS Console" : "Google Cloud"}
            </h1>
            <span
              className={`text-[10px] font-mono tracking-wider font-semibold ${
                isAws ? "text-amber-400" : "text-blue-400"
              }`}
            >
              FLOCI EMULATOR
            </span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="p-4 space-y-1.5">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            const activeClass = isAws
              ? "bg-amber-500/10 text-amber-400 border border-amber-500/30 font-semibold"
              : "bg-blue-500/10 text-blue-400 border border-blue-500/30 font-semibold";

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                  isActive
                    ? activeClass
                    : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/50"
                }`}
              >
                <Icon
                  className={`w-4 h-4 ${
                    isActive
                      ? isAws
                        ? "text-amber-400"
                        : "text-blue-400"
                      : "text-slate-400"
                  }`}
                />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-800 text-[11px] text-slate-500">
        <p className="font-semibold text-slate-400">Floci Web UI v1.1.0</p>
        <p className="mt-0.5">Compatible with AWS & GCP APIs</p>
      </div>
    </aside>
  );
}

export function Header() {
  const {
    endpoint,
    environments,
    currentEnvironment,
    selectEnvironment,
    addEnvironment,
    removeEnvironment,
    isConnected,
    isLoading,
    health,
    checkHealth,
  } = useEndpoint();

  const { cloudMode, branding } = useCloudTheme();

  const [isEnvModalOpen, setIsEnvModalOpen] = useState(false);
  const [newEnvName, setNewEnvName] = useState("");
  const [newEnvUrl, setNewEnvUrl] = useState("");
  const [newEnvProvider, setNewEnvProvider] = useState<"aws" | "gcp">("aws");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isAws = cloudMode === "aws";

  const handleUrlChange = (url: string) => {
    setNewEnvUrl(url);
    if (url.toLowerCase().includes("gcp") || url.includes("159")) {
      setNewEnvProvider("gcp");
    } else if (url.toLowerCase().includes("aws") || url.includes("151")) {
      setNewEnvProvider("aws");
    }
  };

  const handleNameChange = (name: string) => {
    setNewEnvName(name);
    if (name.toLowerCase().includes("gcp") || name.toLowerCase().includes("google")) {
      setNewEnvProvider("gcp");
    } else if (name.toLowerCase().includes("aws") || name.toLowerCase().includes("amazon")) {
      setNewEnvProvider("aws");
    }
  };

  const handleAddEnv = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEnvUrl.trim()) return;
    addEnvironment(newEnvName, newEnvUrl, newEnvProvider);
    setNewEnvName("");
    setNewEnvUrl("");
    setNewEnvProvider("aws");
    setIsEnvModalOpen(false);
  };

  return (
    <header
      className={`h-16 border-b flex items-center justify-between px-6 sticky top-0 z-40 transition-colors ${
        isAws
          ? "bg-[#161e2e]/95 backdrop-blur-md border-slate-800"
          : "bg-[#1f2937]/95 backdrop-blur-md border-slate-800"
      }`}
    >
      {/* Left: Provider branding & Scope */}
      <div className="flex items-center gap-4">
        {/* Active Cloud Provider Badge (Locked to Environment) */}
        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border ${
            isAws
              ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
              : "bg-blue-500/10 text-blue-400 border-blue-500/30"
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              isAws ? "bg-amber-400" : "bg-blue-400"
            }`}
          />
          <span className="font-bold tracking-wide">
            {isAws ? "AWS Management Console" : "Google Cloud Console"}
          </span>
        </div>

        {/* Scope Pill (Region in AWS / Project in GCP) */}
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1 bg-slate-900/60 border border-slate-800 rounded-lg text-xs font-mono">
          <span className="text-slate-400 font-sans font-medium">{branding.scopeLabel}:</span>
          <span className={isAws ? "text-amber-400 font-bold" : "text-blue-400 font-bold"}>
            {branding.scopeValue}
          </span>
        </div>
      </div>

      {/* Right: Environment Selector & Health Status */}
      <div className="flex items-center gap-3">
        {/* Connection Status Pill */}
        <div
          className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border ${
            isConnected
              ? "bg-emerald-950/60 border-emerald-500/40 text-emerald-400"
              : "bg-rose-950/60 border-rose-500/40 text-rose-400"
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              isConnected ? "bg-emerald-400 animate-pulse" : "bg-rose-400"
            }`}
          />
          {isLoading
            ? "Connecting..."
            : isConnected
            ? `Connected (v${health?.version || "2.0.1"})`
            : "Disconnected"}
        </div>

        {/* Environment Selector Dropdown */}
        <div className="relative flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1 text-xs">
          <select
            value={currentEnvironment?.id || "custom"}
            onChange={(e) => {
              if (e.target.value === "manage") {
                setIsEnvModalOpen(true);
              } else {
                selectEnvironment(e.target.value);
              }
            }}
            className="bg-transparent text-slate-200 text-xs px-2.5 py-1 rounded-lg focus:outline-none font-medium cursor-pointer max-w-[260px] truncate"
          >
            {environments.map((env) => {
              const displayLabel =
                env.name && env.name !== env.url ? `${env.name} (${env.url})` : env.url;
              const providerTag = env.provider ? `[${env.provider.toUpperCase()}] ` : "";
              return (
                <option key={env.id} value={env.id} className="bg-slate-900 text-slate-200">
                  {providerTag}{displayLabel}
                </option>
              );
            })}
            <option value="manage" className="bg-slate-800 text-emerald-400 font-semibold">
              + Manage Environments...
            </option>
          </select>

          <button
            onClick={() => setIsEnvModalOpen(true)}
            className="p-1 text-slate-400 hover:text-slate-100 rounded-md transition-colors"
            title="Manage Environments"
          >
            <Settings2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Refresh Button */}
        <button
          onClick={() => checkHealth()}
          className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 border border-slate-800 rounded-xl transition-colors"
          title="Refresh connection"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-emerald-400" : ""}`} />
        </button>
      </div>

      {/* Environments Management Modal */}
      {isEnvModalOpen && mounted && createPortal(
        <div
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsEnvModalOpen(false);
          }}
        >
          <div className="bg-[#0f172a] border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-6 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-slate-100 text-base">Manage Cloud Environments</h3>
              </div>
              <button
                onClick={() => setIsEnvModalOpen(false)}
                className="text-slate-400 hover:text-slate-100 p-1 hover:bg-slate-800 rounded-lg transition-colors"
                title="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* List of current environments */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Configured Endpoints
              </span>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {environments.map((env) => (
                  <div
                    key={env.id}
                    className="flex items-center justify-between bg-slate-900 border border-slate-800/80 px-3 py-2 rounded-xl text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                            env.provider === "gcp"
                              ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                              : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                          }`}
                        >
                          {env.provider || "AWS"}
                        </span>
                        <span className="font-semibold text-slate-200">{env.name}</span>
                      </div>
                      <span className="font-mono text-[11px] text-slate-500 block mt-0.5">{env.url}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {endpoint === env.url && (
                        <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20">
                          Active
                        </span>
                      )}
                      {environments.length > 1 && (
                        <button
                          onClick={() => removeEnvironment(env.id)}
                          className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                          title="Remove environment"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Add New Environment Form */}
            <form onSubmit={handleAddEnv} className="space-y-3 pt-3 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Add New Endpoint
                </span>
                <div className="flex items-center gap-1 bg-slate-950/80 p-0.5 rounded-lg border border-slate-800 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setNewEnvProvider("aws")}
                    className={`px-2.5 py-0.5 rounded-md font-semibold transition-colors ${
                      newEnvProvider === "aws"
                        ? "bg-amber-500 text-slate-950 font-bold"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    AWS
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewEnvProvider("gcp")}
                    className={`px-2.5 py-0.5 rounded-md font-semibold transition-colors ${
                      newEnvProvider === "gcp"
                        ? "bg-blue-600 text-white font-bold"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    GCP
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Name (e.g. Staging VM)"
                  value={newEnvName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                />
                <input
                  type="text"
                  placeholder="URL (e.g. http://192.168.1.50:4566)"
                  value={newEnvUrl}
                  onChange={(e) => handleUrlChange(e.target.value)}
                  className="bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEnvModalOpen(false)}
                  className="px-4 py-1.5 text-xs text-slate-400 hover:text-slate-200 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-colors flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Environment
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </header>
  );
}
