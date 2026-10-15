"use client";

import React, { useState, useEffect } from "react";
import { X, Copy, Check, Code, ListFilter, AlignLeft } from "lucide-react";

export interface ResourceDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  badge?: string;
  data: any;
}

export function ResourceDrawer({
  isOpen,
  onClose,
  title,
  subtitle,
  badge,
  data,
}: ResourceDrawerProps) {
  const [activeTab, setActiveTab] = useState<"json" | "table" | "raw">("json");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen || !data) return null;

  const jsonString = JSON.stringify(data, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const renderTableRows = (obj: any, prefix = ""): React.ReactElement[] => {
    if (!obj || typeof obj !== "object") return [];
    const rows: React.ReactElement[] = [];
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      if (value !== null && typeof value === "object" && !Array.isArray(value)) {
        rows.push(...renderTableRows(value, fullKey));
      } else {
        rows.push(
          <tr key={fullKey} className="border-b border-border/40 hover:bg-muted/30 transition-colors">
            <td className="py-2.5 px-3 font-mono text-xs text-muted-foreground whitespace-nowrap align-top">
              {fullKey}
            </td>
            <td className="py-2.5 px-3 font-mono text-xs break-all text-foreground">
              {Array.isArray(value) ? (
                <span className="text-amber-400">[{value.length} items]</span>
              ) : typeof value === "boolean" ? (
                <span className={value ? "text-emerald-400 font-semibold" : "text-rose-400 font-semibold"}>
                  {String(value)}
                </span>
              ) : value === null || value === undefined ? (
                <span className="text-muted-foreground italic">null</span>
              ) : (
                String(value)
              )}
            </td>
          </tr>
        );
      }
    }
    return rows;
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Slide-out Drawer */}
      <div className="relative z-10 w-full max-w-2xl bg-card border-l border-border h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="p-4 sm:p-5 border-b border-border flex items-start justify-between bg-muted/20">
          <div className="space-y-1 pr-6">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground truncate max-w-md">
                {title}
              </h2>
              {badge && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold tracking-wide uppercase bg-primary/10 text-primary border border-primary/20">
                  {badge}
                </span>
              )}
            </div>
            {subtitle && (
              <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            title="Close drawer (Esc)"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Controls & Copy Button */}
        <div className="px-4 py-2 border-b border-border flex items-center justify-between bg-card text-xs">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab("json")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded font-medium transition-colors ${
                activeTab === "json"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <Code size={14} />
              <span>JSON</span>
            </button>
            <button
              onClick={() => setActiveTab("table")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded font-medium transition-colors ${
                activeTab === "table"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <ListFilter size={14} />
              <span>Properties</span>
            </button>
            <button
              onClick={() => setActiveTab("raw")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded font-medium transition-colors ${
                activeTab === "raw"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <AlignLeft size={14} />
              <span>Raw</span>
            </button>
          </div>

          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-all cursor-pointer font-medium"
            title="Copy formatted JSON to clipboard"
          >
            {copied ? (
              <>
                <Check size={14} className="text-emerald-400" />
                <span className="text-emerald-400">Copied!</span>
              </>
            ) : (
              <>
                <Copy size={14} />
                <span>Copy JSON</span>
              </>
            )}
          </button>
        </div>

        {/* Drawer Content */}
        <div className="flex-1 overflow-auto p-4 sm:p-5">
          {activeTab === "json" && (
            <div className="relative rounded-lg bg-zinc-950 p-4 border border-zinc-800 text-zinc-100 font-mono text-xs overflow-x-auto leading-relaxed">
              <pre>{jsonString}</pre>
            </div>
          )}

          {activeTab === "table" && (
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-muted/40 border-b border-border text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    <th className="py-2 px-3">Property</th>
                    <th className="py-2 px-3">Value</th>
                  </tr>
                </thead>
                <tbody>{renderTableRows(data)}</tbody>
              </table>
            </div>
          )}

          {activeTab === "raw" && (
            <div className="rounded-lg bg-muted/20 p-4 border border-border font-mono text-xs text-foreground whitespace-pre-wrap leading-relaxed">
              {Object.entries(data).map(([k, v]) => (
                <div key={k} className="mb-2">
                  <span className="font-semibold text-primary">{k}: </span>
                  <span>{typeof v === "object" ? JSON.stringify(v) : String(v)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Drawer Footer */}
        <div className="p-3 border-t border-border bg-muted/20 flex items-center justify-between text-[11px] text-muted-foreground">
          <span>Press ESC or click outside to dismiss</span>
          <span>Inspection Drawer • Floci UI</span>
        </div>
      </div>
    </div>
  );
}
