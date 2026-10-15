"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Sparkles,
  X,
  Database,
  Network,
  KeyRound,
  Zap,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Info,
  Layers,
  ArrowUpCircle,
} from "lucide-react";
import { useEndpoint } from "./EndpointProvider";

export const CURRENT_UI_VERSION = "1.3.0";
export const LATEST_FLOCI_BACKEND_VERSION = "2.3.0";

export function openUiChangelog() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("open-floci-ui-changelog"));
  }
}

export function openBackendChangelog() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("open-floci-backend-changelog"));
  }
}

export function ReleaseAnnouncementModal() {
  const { health, isConnected, currentEnvironment } = useEndpoint();

  const [mounted, setMounted] = useState(false);
  const [showUiModal, setShowUiModal] = useState(false);
  const [showBackendBanner, setShowBackendBanner] = useState(false);
  const [showBackendModal, setShowBackendModal] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(true);

  // Check versions and storage on mount
  useEffect(() => {
    setMounted(true);

    // 1. Check if user already acknowledged current UI version
    const ackVer = localStorage.getItem("floci_ui_acknowledged_version");
    if (ackVer !== CURRENT_UI_VERSION) {
      setShowUiModal(true);
    }

    // Custom event listeners for manual triggers from Navbar
    const handleOpenUi = () => setShowUiModal(true);
    const handleOpenBackend = () => setShowBackendModal(true);

    window.addEventListener("open-floci-ui-changelog", handleOpenUi);
    window.addEventListener("open-floci-backend-changelog", handleOpenBackend);

    return () => {
      window.removeEventListener("open-floci-ui-changelog", handleOpenUi);
      window.removeEventListener("open-floci-backend-changelog", handleOpenBackend);
    };
  }, []);

  // 2. Check connected Floci backend version
  useEffect(() => {
    if (!isConnected || !health?.version) return;

    const currentBackendVer = health.version.replace(/^v/, "").trim();
    const latestBackendVer = LATEST_FLOCI_BACKEND_VERSION.replace(/^v/, "").trim();

    // Check if backend is older than latest known release
    const isOlder = isVersionOlder(currentBackendVer, latestBackendVer);
    const dismissedVer = localStorage.getItem("floci_backend_dismissed_version");

    if (isOlder && dismissedVer !== currentBackendVer) {
      setShowBackendBanner(true);
    } else {
      setShowBackendBanner(false);
    }
  }, [isConnected, health]);

  const handleCloseUiModal = () => {
    if (dontShowAgain) {
      localStorage.setItem("floci_ui_acknowledged_version", CURRENT_UI_VERSION);
    }
    setShowUiModal(false);
  };

  const handleDismissBackendBanner = () => {
    if (health?.version) {
      localStorage.setItem("floci_backend_dismissed_version", health.version.trim());
    }
    setShowBackendBanner(false);
  };

  if (!mounted) return null;

  return (
    <>
      {/* 1. What's New in Floci UI (v1.3.0) Modal */}
      {showUiModal &&
        createPortal(
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[99999] flex items-center justify-center p-4 animate-in fade-in duration-200"
            onClick={(e) => {
              if (e.target === e.currentTarget) handleCloseUiModal();
            }}
          >
            <div className="bg-surface border border-line rounded-panel w-full max-w-2xl p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
              {/* Modal Header */}
              <div className="flex items-start justify-between pb-4 border-b border-line">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      <Sparkles className="w-3 h-3" />
                      What's New in v{CURRENT_UI_VERSION}
                    </span>
                    <span className="text-[11px] text-muted font-mono">Release Changelog</span>
                  </div>
                  <h2 className="text-xl font-bold tracking-tight text-ink">
                    Floci Web UI Has Been Upgraded!
                  </h2>
                  <p className="text-xs text-muted">
                    We've added native database consoles, in-browser API testing tools, and expanded IAM credential security.
                  </p>
                </div>
                <button
                  onClick={handleCloseUiModal}
                  className="text-muted hover:text-ink p-1 hover:bg-subtle rounded-lg transition-colors cursor-pointer"
                  title="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Feature Highlights Grid */}
              <div className="space-y-3.5">
                {/* RDS Console */}
                <div className="p-4 rounded-panel bg-subtle border border-line flex items-start gap-3.5">
                  <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 shrink-0">
                    <Database className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-ink">RDS & DocumentDB Console</span>
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        New Service
                      </span>
                    </div>
                    <p className="text-xs text-muted leading-relaxed">
                      Multi-tab database management for <strong>DB Instances</strong>, <strong>Aurora & DocDB Clusters</strong>, and <strong>Snapshots</strong>. Create PostgreSQL, MySQL, and MariaDB instances, trigger reboots, capture snapshots, and delete instances directly from the console.
                    </p>
                  </div>
                </div>

                {/* API Gateway Explorer */}
                <div className="p-4 rounded-panel bg-subtle border border-line flex items-start gap-3.5">
                  <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0">
                    <Network className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-ink">API Gateway & Request Tester</span>
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        New Explorer
                      </span>
                    </div>
                    <p className="text-xs text-muted leading-relaxed">
                      Unified support for <strong>REST APIs (v1)</strong> and <strong>HTTP APIs (v2)</strong>. Includes an integrated in-browser tester with method selectors (GET, POST, PUT, DELETE), custom stages, headers, JSON body payloads, and live response telemetry.
                    </p>
                  </div>
                </div>

                {/* IAM Credentials Management */}
                <div className="p-4 rounded-panel bg-subtle border border-line flex items-start gap-3.5">
                  <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 shrink-0">
                    <KeyRound className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-ink">IAM Security Credentials Management</span>
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        Enhanced
                      </span>
                    </div>
                    <p className="text-xs text-muted leading-relaxed">
                      Full support for Floci v2.3.0's <code>ChangePassword</code> and <code>CreateLoginProfile</code> APIs. Set, update, or remove console passwords, and generate programmatic Access Keys with 1-click clipboard copying.
                    </p>
                  </div>
                </div>

                {/* Earlier Additions */}
                <div className="p-3.5 rounded-panel bg-subtle/50 border border-line/60 flex items-start gap-3">
                  <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400 shrink-0">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-ink">
                      SQS, Lambda, CloudWatch Logs, Secrets & KMS
                    </span>
                    <p className="text-[11px] text-muted">
                      Full coverage for queue messaging, serverless function invocation, live log viewing, secret rotation, KMS keys, and the slide-out ResourceDrawer.
                    </p>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-line">
                <label className="flex items-center gap-2 text-xs text-muted hover:text-ink cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={dontShowAgain}
                    onChange={(e) => setDontShowAgain(e.target.checked)}
                    className="rounded border-line text-amber-500 focus:ring-0"
                  />
                  <span>Don't show this announcement again for v{CURRENT_UI_VERSION}</span>
                </label>

                <button
                  type="button"
                  onClick={handleCloseUiModal}
                  className="w-full sm:w-auto px-5 py-2 text-xs font-semibold bg-action text-white hover:opacity-90 rounded-control transition-opacity flex items-center justify-center gap-1.5"
                >
                  <span>Explore Features</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* 2. Floci Backend Update Floating Banner */}
      {showBackendBanner &&
        createPortal(
          <div className="fixed bottom-6 right-6 z-[9990] max-w-md w-full animate-in slide-in-from-bottom duration-300">
            <div className="bg-surface border border-amber-500/40 rounded-panel p-4 shadow-2xl backdrop-blur-lg space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
                    <ArrowUpCircle className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-ink">Floci Backend Update Available</h4>
                    <p className="text-[11px] text-muted">
                      Target: <span className="font-mono text-ink">{currentEnvironment?.name || "Connected Box"}</span>
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleDismissBackendBanner}
                  className="text-muted hover:text-ink p-1 rounded"
                  title="Dismiss notification"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="bg-subtle p-2.5 rounded border border-line text-xs space-y-1">
                <div className="flex items-center justify-between font-mono text-[11px]">
                  <span className="text-muted">Current Version:</span>
                  <span className="text-rose-400 font-bold">v{health?.version || "unknown"}</span>
                </div>
                <div className="flex items-center justify-between font-mono text-[11px]">
                  <span className="text-muted">Latest Release:</span>
                  <span className="text-emerald-400 font-bold">v{LATEST_FLOCI_BACKEND_VERSION}</span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleDismissBackendBanner}
                  className="px-3 py-1.5 text-[11px] text-muted hover:text-ink rounded-control"
                >
                  Dismiss
                </button>
                <button
                  type="button"
                  onClick={() => setShowBackendModal(true)}
                  className="px-3 py-1.5 text-[11px] font-semibold bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/30 rounded-control flex items-center gap-1"
                >
                  View Changelog
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* 3. Upstream Floci Backend Changelog Modal */}
      {showBackendModal &&
        createPortal(
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[99999] flex items-center justify-center p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowBackendModal(false);
            }}
          >
            <div className="bg-surface border border-line rounded-panel w-full max-w-lg p-6 shadow-2xl space-y-5 max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-line">
                <div className="flex items-center gap-2">
                  <Layers className="w-5 h-5 text-amber-400" />
                  <div>
                    <h3 className="font-bold text-ink text-base">
                      Floci Backend v{LATEST_FLOCI_BACKEND_VERSION} Changelog
                    </h3>
                    <p className="text-[11px] text-muted">Upstream Cloud Emulator Release</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowBackendModal(false)}
                  className="text-muted hover:text-ink p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3 bg-subtle rounded-panel border border-line space-y-1">
                  <span className="font-bold text-ink">IAM Enhancements</span>
                  <p className="text-muted text-[11px]">
                    Added <code>ChangePassword</code> API emulation for console users, account properties & aliases, and request context condition variable resolution.
                  </p>
                </div>

                <div className="p-3 bg-subtle rounded-panel border border-line space-y-1">
                  <span className="font-bold text-ink">API Gateway (v1 & v2)</span>
                  <p className="text-muted text-[11px]">
                    Stricter model validation, standardized payload transformations, stage variable forwarding to Lambda, and multi-value header normalization.
                  </p>
                </div>

                <div className="p-3 bg-subtle rounded-panel border border-line space-y-1">
                  <span className="font-bold text-ink">RDS & Database Emulation</span>
                  <p className="text-muted text-[11px]">
                    Added IAM role associations (<code>AddRoleToDBInstance</code>), engine version verification, Redshift Spectrum queries, and snapshot scheduling.
                  </p>
                </div>

                <div className="p-3 bg-subtle rounded-panel border border-line space-y-1">
                  <span className="font-bold text-ink">S3 & Lambda Parity</span>
                  <p className="text-muted text-[11px]">
                    Added <code>partNumber</code> parameter support for multipart object retrieval, durable function invokes, and async queue reliability.
                  </p>
                </div>
              </div>

              <div className="flex justify-end pt-2 border-t border-line">
                <button
                  type="button"
                  onClick={() => setShowBackendModal(false)}
                  className="px-4 py-2 text-xs font-semibold bg-action text-white hover:opacity-90 rounded-control"
                >
                  Close
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

function isVersionOlder(current: string, target: string): boolean {
  if (!current || !target) return false;
  const cParts = current.split(".").map((n) => parseInt(n, 10) || 0);
  const tParts = target.split(".").map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(cParts.length, tParts.length); i++) {
    const c = cParts[i] || 0;
    const t = tParts[i] || 0;
    if (c < t) return true;
    if (c > t) return false;
  }
  return false;
}
