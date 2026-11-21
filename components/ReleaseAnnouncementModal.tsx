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
  Radio,
  SlidersHorizontal,
  Server,
} from "lucide-react";
import { useEndpoint } from "./EndpointProvider";

export const CURRENT_UI_VERSION = "1.6.0";
export const LATEST_FLOCI_BACKEND_VERSION = "2.5.0";

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
                    Added 9 new service consoles, full Floci v2.5.0 support, and native Floci Console Contract v1/v2 sidecar compatibility.
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
                {/* Floci v2.5.0 & Console Contract v1/v2 */}
                <div className="p-4 rounded-panel bg-subtle border border-line flex items-start gap-3.5">
                  <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-ink">Floci v2.5.0 &amp; Console Contract v1/v2</span>
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        New
                      </span>
                    </div>
                    <p className="text-xs text-muted leading-relaxed">
                      Drop-in sidecar support via <code>FLOCI_SERVICES_UI_IMAGE</code> with <code>GET /api/health</code>, <code>AWS_ENDPOINT_URL</code>, <code>/_floci/info</code> manifest probing, and <code>io.floci.console.*</code> Docker image labels.
                    </p>
                  </div>
                </div>

                {/* EventBridge, Step Functions & CloudWatch */}
                <div className="p-4 rounded-panel bg-subtle border border-line flex items-start gap-3.5">
                  <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 shrink-0">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-ink">EventBridge, Step Functions &amp; CloudWatch Metrics</span>
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        New Consoles
                      </span>
                    </div>
                    <p className="text-xs text-muted leading-relaxed">
                      Manage EventBridge buses, rules, targets, and PutEvents; orchestrate Step Functions ASL state machines and execution history; monitor CloudWatch metrics and toggle alarm actions.
                    </p>
                  </div>
                </div>

                {/* ECS, ECR, Cognito, Route 53, SES & Kinesis */}
                <div className="p-4 rounded-panel bg-subtle border border-line flex items-start gap-3.5">
                  <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 shrink-0">
                    <Server className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-ink">ECS, ECR, Cognito, Route 53, SES &amp; Kinesis</span>
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        New Consoles
                      </span>
                    </div>
                    <p className="text-xs text-muted leading-relaxed">
                      Full visual management for Docker-backed ECS clusters/tasks, ECR container registries, Cognito user pools &amp; app clients, Route 53 DNS zones/records, SES email identities/sending, and Kinesis data streams.
                    </p>
                  </div>
                </div>

                {/* EC2 Cloud Features & Web Console */}
                <div className="p-4 rounded-panel bg-subtle border border-line flex items-start gap-3.5">
                  <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 shrink-0">
                    <Server className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-ink">EC2 Cloud Console, Firewall & Resizing</span>
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        Enhanced
                      </span>
                    </div>
                    <p className="text-xs text-muted leading-relaxed">
                      Interactive web SSH console, live security group firewall rule editor with quick presets, instant VM instance type resizing, AMI snapshots, and EBS volumes.
                    </p>
                  </div>
                </div>

                {/* SSM Parameter Store */}
                <div className="p-4 rounded-panel bg-subtle border border-line flex items-start gap-3.5">
                  <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0">
                    <SlidersHorizontal className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-ink">Systems Manager (SSM) Parameter Store</span>
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        Included
                      </span>
                    </div>
                    <p className="text-xs text-muted leading-relaxed">
                      Hierarchical configuration management supporting <code>String</code>, <code>StringList</code>, and <code>SecureString</code> with version history and secret masking.
                    </p>
                  </div>
                </div>

                {/* RDS & API Gateway Console */}
                <div className="p-4 rounded-panel bg-subtle border border-line flex items-start gap-3.5">
                  <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 shrink-0">
                    <Database className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-ink">RDS Databases & API Gateway Explorer</span>
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        Included
                      </span>
                    </div>
                    <p className="text-xs text-muted leading-relaxed">
                      Multi-tab database management for DB instances, clusters, and snapshots, plus unified REST & HTTP API Explorer with live in-browser testing.
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
                  <span className="font-bold text-ink">CloudWatch OTLP Metrics &amp; Alarm Controls</span>
                  <p className="text-muted text-[11px]">
                    Added native CloudWatch OTLP metrics ingestion plus <code>EnableAlarmActions</code> / <code>DisableAlarmActions</code> controls for threshold alarms.
                  </p>
                </div>

                <div className="p-3 bg-subtle rounded-panel border border-line space-y-1">
                  <span className="font-bold text-ink">CloudFormation v2.5 Provisioning</span>
                  <p className="text-muted text-[11px]">
                    Expanded resource provisioning with <code>AWS::EFS::FileSystem</code>/MountTarget/AccessPoint, <code>AWS::CloudFormation::StackSet</code>, <code>AWS::EC2::KeyPair</code> (with SSM private keys), Cognito IdPs, and EventBridge V2 buses/subscribers.
                  </p>
                </div>

                <div className="p-3 bg-subtle rounded-panel border border-line space-y-1">
                  <span className="font-bold text-ink">Bedrock, AgentCore &amp; CloudFront KVS</span>
                  <p className="text-muted text-[11px]">
                    Added Bedrock foundation model &amp; inference profile listing, guardrail resource policies, Bedrock AgentCore harness control plane, and CloudFront KeyValueStore support.
                  </p>
                </div>

                <div className="p-3 bg-subtle rounded-panel border border-line space-y-1">
                  <span className="font-bold text-ink">API Gateway, AppSync &amp; Athena</span>
                  <p className="text-muted text-[11px]">
                    Added API Gateway v2 <code>SQS-SendMessage</code> integrations, REST documentation parts, AppSync HTTP/signed AWS data sources, and Athena Hive DDL &amp; named queries.
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
