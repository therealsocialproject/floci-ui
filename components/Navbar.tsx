"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Server,
  Database,
  FolderLock,
  Users,
  KeyRound,
  RefreshCw,
  Layers,
  ChevronDown,
} from "lucide-react";
import { useEndpoint, ENDPOINT_PRESETS } from "./EndpointProvider";

const NAV_ITEMS = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "EC2 Instances", href: "/ec2", icon: Server },
  { name: "S3 Buckets", href: "/s3", icon: FolderLock },
  { name: "IAM & Roles", href: "/iam", icon: Users },
  { name: "DynamoDB", href: "/dynamodb", icon: Database },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-[#0d1322] border-r border-slate-800 flex flex-col justify-between h-screen sticky top-0">
      <div>
        {/* Brand Header */}
        <div className="h-16 flex items-center px-6 border-b border-slate-800 gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-100 leading-none">Floci Console</h1>
            <span className="text-[11px] font-mono text-emerald-400 tracking-wider">CLOUD EMULATOR</span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="p-4 space-y-1.5">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                    : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/50"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-emerald-400" : "text-slate-400"}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-800 text-xs text-slate-500">
        <p className="font-semibold text-slate-400">Floci Web UI v1.0.0</p>
        <p className="mt-0.5">Compatible with LocalStack v2+</p>
      </div>
    </aside>
  );
}

export function Header() {
  const { endpoint, setEndpoint, isConnected, isLoading, health, checkHealth } = useEndpoint();
  const [customInput, setCustomInput] = useState(endpoint);
  const [isEditing, setIsEditing] = useState(false);

  const handlePresetSelect = (url: string) => {
    setEndpoint(url);
    setCustomInput(url);
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setEndpoint(customInput);
    setIsEditing(false);
  };

  return (
    <header className="h-16 bg-[#0d1322]/90 backdrop-blur-md border-b border-slate-800 flex items-center justify-between px-8 sticky top-0 z-40">
      <div className="flex items-center gap-4">
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
            ? `Connected: ${health?.version || "2.0.1"} (${health?.original_edition || "floci"})`
            : "Offline / Disconnected"}
        </div>
      </div>

      {/* Endpoint Switcher */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg p-1 text-xs">
          {ENDPOINT_PRESETS.map((preset) => {
            const isSelected = endpoint === preset.url;
            return (
              <button
                key={preset.url}
                onClick={() => handlePresetSelect(preset.url)}
                className={`px-2.5 py-1 rounded transition-colors ${
                  isSelected
                    ? "bg-emerald-500 text-slate-950 font-bold"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {preset.name}
              </button>
            );
          })}
        </div>

        {/* Custom URL Input / Selector */}
        {isEditing ? (
          <form onSubmit={handleCustomSubmit} className="flex items-center gap-2">
            <input
              type="text"
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              placeholder="http://host:4566"
              className="bg-slate-900 border border-slate-700 text-xs px-3 py-1.5 rounded-lg text-slate-200 focus:outline-none focus:border-emerald-500 font-mono w-56"
              autoFocus
            />
            <button
              type="submit"
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-3 py-1.5 rounded-lg font-semibold"
            >
              Set
            </button>
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="text-slate-400 hover:text-slate-200 text-xs px-2"
            >
              Cancel
            </button>
          </form>
        ) : (
          <div
            onClick={() => setIsEditing(true)}
            className="cursor-pointer flex items-center gap-2 bg-slate-900/80 hover:bg-slate-800 border border-slate-800 px-3 py-1.5 rounded-lg text-xs font-mono text-slate-300"
            title="Click to edit custom endpoint"
          >
            <span>{endpoint}</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
          </div>
        )}

        {/* Refresh Button */}
        <button
          onClick={() => checkHealth()}
          className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 border border-slate-800 rounded-lg transition-colors"
          title="Refresh connection"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-emerald-400" : ""}`} />
        </button>
      </div>
    </header>
  );
}
