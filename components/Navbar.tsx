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
  Plus,
  Trash2,
  Globe,
  Settings2,
  X,
  Boxes,
  Menu,
  Search,
  ChevronRight,
  MessageSquare,
  Zap,
  FileText,
  KeyRound,
  ShieldCheck,
  Network,
  Radio,
  SlidersHorizontal,
  Sparkles,
  Workflow,
  GitBranch,
  Activity,
  UserCheck,
  Container,
  Package,
  Globe2,
  Mail,
  Waves,
} from "lucide-react";
import { useEndpoint, CloudProvider, detectCloudProvider } from "./EndpointProvider";
import { useCloudTheme } from "./CloudThemeContext";
import { normalizeEndpointUrl } from "@/lib/endpoint-utils";
import { openUiChangelog } from "./ReleaseAnnouncementModal";

export function Sidebar() {
  const pathname = usePathname();
  const { cloudMode, serviceLabels, toggleCloudMode } = useCloudTheme();

  const isAws = cloudMode === "aws";

  const navItems = [
    { name: serviceLabels.dashboard, href: "/", icon: LayoutDashboard },
    { name: serviceLabels.ec2, href: "/ec2", icon: Server },
    { name: serviceLabels.ecs, href: "/ecs", icon: Container },
    { name: serviceLabels.ecr, href: "/ecr", icon: Package },
    { name: serviceLabels.lambda, href: "/lambda", icon: Zap },
    { name: serviceLabels.apigateway, href: "/apigateway", icon: Network },
    { name: serviceLabels.route53, href: "/route53", icon: Globe2 },
    { name: serviceLabels.s3, href: "/s3", icon: FolderLock },
    { name: serviceLabels.dynamodb, href: "/dynamodb", icon: Database },
    { name: serviceLabels.rds, href: "/rds", icon: Database },
    { name: serviceLabels.eventbridge, href: "/eventbridge", icon: Workflow },
    { name: serviceLabels.stepfunctions, href: "/stepfunctions", icon: GitBranch },
    { name: serviceLabels.sns, href: "/sns", icon: Radio },
    { name: serviceLabels.sqs, href: "/sqs", icon: MessageSquare },
    { name: serviceLabels.kinesis, href: "/kinesis", icon: Waves },
    { name: serviceLabels.ses, href: "/ses", icon: Mail },
    { name: serviceLabels.ssm, href: "/ssm", icon: SlidersHorizontal },
    { name: serviceLabels.cloudwatch, href: "/cloudwatch", icon: Activity },
    { name: serviceLabels.logs, href: "/logs", icon: FileText },
    { name: serviceLabels.iam, href: "/iam", icon: Users },
    { name: serviceLabels.cognito, href: "/cognito", icon: UserCheck },
    { name: serviceLabels.secrets, href: "/secrets", icon: KeyRound },
    { name: serviceLabels.kms, href: "/kms", icon: ShieldCheck },
    { name: serviceLabels.cloudformation, href: "/cloudformation", icon: Boxes },
  ];

  return (
    <aside className="console-sidebar" aria-label="Service navigation">
      <div className="sidebar-heading flex items-center justify-between">
        <span>
          {cloudMode === "aws"
            ? "Services"
            : cloudMode === "gcp"
              ? "Products"
              : cloudMode === "azure"
                ? "Navigate"
                : "Core Services"}
        </span>
        <button
          type="button"
          onClick={toggleCloudMode}
          className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border cursor-pointer transition-colors ${
            cloudMode === "aws"
              ? "bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20"
              : cloudMode === "gcp"
                ? "bg-blue-500/10 text-blue-400 border-blue-500/30 hover:bg-blue-500/20"
                : cloudMode === "azure"
                  ? "bg-sky-500/10 text-sky-400 border-sky-500/30 hover:bg-sky-500/20"
                  : "bg-rose-500/10 text-rose-400 border-rose-500/30 hover:bg-rose-500/20"
          }`}
          title="Click to cycle cloud provider: AWS → GCP → Azure → OCI"
        >
          {cloudMode.toUpperCase()} ⟲
        </button>
      </div>
      <nav>
        {navItems.map(({ name, href, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            aria-current={pathname === href ? "page" : undefined}
            className={`service-nav-link ${pathname === href ? "active" : ""}`}
          >
            <Icon size={18} />
            <span>{name}</span>
          </Link>
        ))}
      </nav>
      <div className="sidebar-section-label">
        {cloudMode === "aws"
          ? "RESOURCE MANAGEMENT"
          : cloudMode === "gcp"
            ? "YOUR WORKSPACE"
            : cloudMode === "azure"
              ? "FAVORITES & RESOURCES"
              : "COMPARTMENT SCOPE"}
      </div>
      <div className="sidebar-note">
        <Layers size={17} />
        <div>
          Local cloud environment<small>Powered by Floci</small>
        </div>
      </div>
      <div className="sidebar-footer flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="emulator-dot" /> Floci emulator
        </div>
        <button
          type="button"
          onClick={openUiChangelog}
          className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors flex items-center gap-1 cursor-pointer"
          title="What's New in v1.6.0 (Click to view changelog)"
        >
          <Sparkles size={10} />
          <span>v1.6.0</span>
        </button>
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
    updateEnvironmentProvider,
    isConnected,
    isLoading,
    health,
    checkHealth,
    probeEndpoint,
  } = useEndpoint();

  const { cloudMode, branding, setCloudMode, serviceLabels } = useCloudTheme();

  const [isEnvModalOpen, setIsEnvModalOpen] = useState(false);
  const [newEnvName, setNewEnvName] = useState("");
  const [newEnvUrl, setNewEnvUrl] = useState("");
  const [newEnvProvider, setNewEnvProvider] = useState<CloudProvider>("aws");
  const [probeStatus, setProbeStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [probeMessage, setProbeMessage] = useState("");
  const [mounted, setMounted] = useState(false);
  const [serviceSearch, setServiceSearch] = useState("");

  const searchLinks = [
    { href: "/", name: serviceLabels.dashboard },
    { href: "/ec2", name: serviceLabels.ec2 },
    { href: "/ecs", name: serviceLabels.ecs },
    { href: "/ecr", name: serviceLabels.ecr },
    { href: "/lambda", name: serviceLabels.lambda },
    { href: "/apigateway", name: serviceLabels.apigateway },
    { href: "/route53", name: serviceLabels.route53 },
    { href: "/s3", name: serviceLabels.s3 },
    { href: "/dynamodb", name: serviceLabels.dynamodb },
    { href: "/rds", name: serviceLabels.rds },
    { href: "/eventbridge", name: serviceLabels.eventbridge },
    { href: "/stepfunctions", name: serviceLabels.stepfunctions },
    { href: "/sns", name: serviceLabels.sns },
    { href: "/sqs", name: serviceLabels.sqs },
    { href: "/kinesis", name: serviceLabels.kinesis },
    { href: "/ses", name: serviceLabels.ses },
    { href: "/ssm", name: serviceLabels.ssm },
    { href: "/cloudwatch", name: serviceLabels.cloudwatch },
    { href: "/logs", name: serviceLabels.logs },
    { href: "/iam", name: serviceLabels.iam },
    { href: "/cognito", name: serviceLabels.cognito },
    { href: "/secrets", name: serviceLabels.secrets },
    { href: "/kms", name: serviceLabels.kms },
    { href: "/cloudformation", name: serviceLabels.cloudformation },
  ].filter((item) =>
    item.name.toLowerCase().includes(serviceSearch.toLowerCase()),
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  const isAws = cloudMode === "aws";

  const runProbe = async (urlToTest: string) => {
    if (!urlToTest.trim()) {
      setProbeStatus("idle");
      setProbeMessage("");
      return;
    }
    const clean = normalizeEndpointUrl(urlToTest);
    setProbeStatus("loading");
    setProbeMessage(`Testing connection to ${clean}...`);
    const res = await probeEndpoint(clean);
    if (res.success && res.data) {
      setProbeStatus("success");
      const numServices = res.data.services ? Object.keys(res.data.services).length : 0;
      setProbeMessage(`Floci v${res.data.version || "2.1.0"} active · ${numServices} services online`);
      setNewEnvProvider(detectCloudProvider(newEnvName, clean));
    } else {
      setProbeStatus("error");
      setProbeMessage(res.error || "Cannot reach endpoint. Check address and port.");
    }
  };

  const handleUrlChange = (url: string) => {
    setNewEnvUrl(url);
    setNewEnvProvider(detectCloudProvider(newEnvName, url));
  };

  const handleNameChange = (name: string) => {
    setNewEnvName(name);
    setNewEnvProvider(detectCloudProvider(name, newEnvUrl));
  };

  const handleAddEnv = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEnvUrl.trim()) return;
    const cleanUrl = normalizeEndpointUrl(newEnvUrl);
    addEnvironment(newEnvName || cleanUrl, cleanUrl, newEnvProvider);
    setNewEnvName("");
    setNewEnvUrl("");
    setProbeStatus("idle");
    setProbeMessage("");
    setNewEnvProvider("aws");
    setIsEnvModalOpen(false);
  };

  return (
    <header className="console-header">
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <button
        className="header-icon"
        aria-label="Toggle service navigation"
        onClick={() => document.body.classList.toggle("nav-collapsed")}
      >
        <Menu size={21} />
      </button>

      <Link href="/" className="cloud-wordmark" aria-label={branding.title}>
        {cloudMode === "aws" && (
          <span className="aws-wordmark">
            aws
            <span />
          </span>
        )}
        {cloudMode === "gcp" && (
          <>
            <span className="google-wordmark">
              <b>G</b>
              <b>o</b>
              <b>o</b>
              <b>g</b>
              <b>l</b>
              <b>e</b>
            </span>
            <span>Cloud</span>
          </>
        )}
        {cloudMode === "azure" && (
          <span className="azure-wordmark flex items-center gap-2">
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none">
              <rect x="2" y="2" width="9" height="9" fill="#f25022" />
              <rect x="13" y="2" width="9" height="9" fill="#7fba00" />
              <rect x="2" y="13" width="9" height="9" fill="#00a4ef" />
              <rect x="13" y="13" width="9" height="9" fill="#ffb900" />
            </svg>
            <span className="font-semibold text-white tracking-tight text-lg">Microsoft Azure</span>
          </span>
        )}
        {cloudMode === "oci" && (
          <span className="oci-wordmark flex items-center gap-2">
            <span className="font-black text-[#c74634] tracking-wider text-xs px-1.5 py-0.5 rounded bg-white/10 border border-[#c74634]/40 font-mono">
              ORACLE
            </span>
            <span className="font-semibold text-white tracking-tight text-lg">Cloud</span>
          </span>
        )}
      </Link>

      {/* 1-Click Multi-Cloud Provider Switcher */}
      <div className="provider-switch flex items-center bg-slate-900/90 border border-slate-700/60 p-0.5 rounded-lg text-xs shrink-0 mx-1 gap-0.5">
        <button
          type="button"
          onClick={() => setCloudMode("aws")}
          className={`px-2 py-0.5 rounded font-bold text-[10px] tracking-wider uppercase transition-colors ${
            cloudMode === "aws"
              ? "bg-amber-500 text-slate-950 shadow-sm"
              : "text-slate-400 hover:text-slate-200"
          }`}
          title="Switch to AWS Console View"
        >
          AWS
        </button>
        <button
          type="button"
          onClick={() => setCloudMode("gcp")}
          className={`px-2 py-0.5 rounded font-bold text-[10px] tracking-wider uppercase transition-colors ${
            cloudMode === "gcp"
              ? "bg-blue-600 text-white shadow-sm"
              : "text-slate-400 hover:text-slate-200"
          }`}
          title="Switch to Google Cloud View"
        >
          GCP
        </button>
        <button
          type="button"
          onClick={() => setCloudMode("azure")}
          className={`px-2 py-0.5 rounded font-bold text-[10px] tracking-wider uppercase transition-colors ${
            cloudMode === "azure"
              ? "bg-[#0078d4] text-white shadow-sm"
              : "text-slate-400 hover:text-slate-200"
          }`}
          title="Switch to Microsoft Azure View"
        >
          Azure
        </button>
        <button
          type="button"
          onClick={() => setCloudMode("oci")}
          className={`px-2 py-0.5 rounded font-bold text-[10px] tracking-wider uppercase transition-colors ${
            cloudMode === "oci"
              ? "bg-[#c74634] text-white shadow-sm"
              : "text-slate-400 hover:text-slate-200"
          }`}
          title="Switch to Oracle Cloud View"
        >
          OCI
        </button>
      </div>

      <span className="header-divider" />
      <span className="header-scope">
        {cloudMode === "aws" ? "Services" : branding.scopeValue}
        {cloudMode === "aws" ? <Boxes size={16} /> : <Layers size={16} />}
      </span>

      <div className="console-search">
        <Search size={17} />
        <input
          aria-label="Search services"
          placeholder={
            cloudMode === "aws"
              ? "Search services"
              : cloudMode === "gcp"
                ? "Search products and resources"
                : cloudMode === "azure"
                  ? "Search resources, services, and docs"
                  : "Search resources, services, documentation"
          }
          value={serviceSearch}
          onChange={(e) => setServiceSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setServiceSearch("");
          }}
        />
        {serviceSearch && (
          <div className="search-results">
            {searchLinks.length ? (
              searchLinks.map((item) => (
                <Link
                  href={item.href}
                  key={item.href}
                  onClick={() => setServiceSearch("")}
                >
                  {item.name}
                  <ChevronRight size={15} />
                </Link>
              ))
            ) : (
              <p>No matching services</p>
            )}
          </div>
        )}
      </div>

      <div className="header-environment">
        <span
          className={`connection-dot ${isConnected ? "connected" : ""}`}
          title={
            isLoading
              ? "Connecting"
              : isConnected
                ? "Connected"
                : "Disconnected"
          }
        />
        <select
          aria-label="Active environment"
          value={currentEnvironment?.id || "custom"}
          onChange={(e) =>
            e.target.value === "manage"
              ? setIsEnvModalOpen(true)
              : selectEnvironment(e.target.value)
          }
        >
          {!environments.some((env) => env.id === currentEnvironment.id) && (
            <option value="custom">Custom Host</option>
          )}
          {environments.map((env) => (
            <option key={env.id} value={env.id}>
              {env.name} · {env.provider.toUpperCase()}
            </option>
          ))}
          <option value="manage">+ Manage environments</option>
        </select>
      </div>

      <span className="header-region">
        {branding.scopeValue}
      </span>

      <button
        onClick={() => checkHealth()}
        className="header-icon"
        title="Refresh connection"
        aria-label="Refresh connection"
      >
        <RefreshCw size={17} className={isLoading ? "animate-spin" : ""} />
      </button>

      <button
        onClick={() => setIsEnvModalOpen(true)}
        className="header-icon"
        title="Manage environments"
        aria-label="Manage environments"
      >
        <Settings2 size={18} />
      </button>
      <span className="emulator-label">EMULATOR</span>

      {/* Environments Management Modal */}
      {isEnvModalOpen &&
        mounted &&
        createPortal(
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
            onClick={(e) => {
              if (e.target === e.currentTarget) setIsEnvModalOpen(false);
            }}
          >
            <div className="bg-surface border border-line rounded-panel w-full max-w-lg p-6 shadow-2xl space-y-6 my-auto">
              <div className="flex items-center justify-between pb-3 border-b border-line">
                <div className="flex items-center gap-2">
                  <Globe className="w-5 h-5 text-success" />
                  <h3 className="font-bold text-ink text-base">
                    Manage Cloud Environments
                  </h3>
                </div>
                <button
                  onClick={() => setIsEnvModalOpen(false)}
                  className="text-muted hover:text-ink p-1 hover:bg-subtle rounded-lg transition-colors"
                  title="Close modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* List of current environments */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-muted uppercase tracking-wider">
                  Configured Endpoints
                </span>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {environments.map((env) => (
                    <div
                      key={env.id}
                      className="flex items-center justify-between bg-subtle border border-line px-3 py-2 rounded-control text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              const order: CloudProvider[] = ["aws", "gcp", "azure", "oci"];
                              const curr = order.indexOf(env.provider || "aws");
                              const next = order[(curr + 1) % order.length];
                              updateEnvironmentProvider(env.id, next);
                            }}
                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border cursor-pointer transition-colors ${
                              env.provider === "azure"
                                ? "bg-sky-500/20 text-sky-400 border-sky-500/30 hover:bg-sky-500/30"
                                : env.provider === "oci"
                                  ? "bg-rose-500/20 text-rose-400 border-rose-500/30 hover:bg-rose-500/30"
                                  : env.provider === "gcp"
                                    ? "bg-blue-500/20 text-blue-400 border-blue-500/30 hover:bg-blue-500/30"
                                    : "bg-amber-500/20 text-amber-400 border-amber-500/30 hover:bg-amber-500/30"
                            }`}
                            title="Click to cycle provider: AWS → GCP → Azure → OCI"
                          >
                            {(env.provider || "AWS").toUpperCase()} ⟲
                          </button>
                          <span className="font-semibold text-ink">
                            {env.name}
                          </span>
                        </div>
                        <span className="font-mono text-[11px] text-muted block mt-0.5">
                          {env.url}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {endpoint === env.url && (
                          <span className="px-2 py-0.5 rounded text-[10px] bg-success-soft text-success font-semibold border border-emerald-500/20">
                            Active
                          </span>
                        )}
                        {environments.length > 1 && (
                          <button
                            onClick={() => removeEnvironment(env.id)}
                            className="p-1 text-muted hover:text-danger transition-colors"
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
              <form
                onSubmit={handleAddEnv}
                className="space-y-3 pt-3 border-t border-line"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted uppercase tracking-wider">
                    Add New Endpoint
                  </span>
                  <div className="flex items-center gap-1 bg-subtle p-0.5 rounded-lg border border-line text-[11px]">
                    {(["aws", "gcp", "azure", "oci"] as const).map((prov) => (
                      <button
                        key={prov}
                        type="button"
                        onClick={() => setNewEnvProvider(prov)}
                        className={`px-2 py-0.5 rounded-md font-semibold transition-colors uppercase ${
                          newEnvProvider === prov
                            ? prov === "aws"
                              ? "bg-amber-500 text-slate-950 font-bold"
                              : prov === "gcp"
                                ? "bg-blue-600 text-white font-bold"
                                : prov === "azure"
                                  ? "bg-[#0078d4] text-white font-bold"
                                  : "bg-[#c74634] text-white font-bold"
                            : "text-muted hover:text-ink"
                        }`}
                      >
                        {prov}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Name (e.g. TSP AWS)"
                    value={newEnvName}
                    onChange={(e) => handleNameChange(e.target.value)}
                    className="bg-subtle border border-line px-3 py-1.5 rounded-control text-xs text-ink focus:outline-none focus:border-emerald-500"
                  />
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      placeholder="IP or URL (e.g. 10.75.75.50)"
                      value={newEnvUrl}
                      onChange={(e) => handleUrlChange(e.target.value)}
                      onBlur={() => {
                        if (newEnvUrl.trim()) runProbe(newEnvUrl);
                      }}
                      className="bg-subtle border border-line px-3 py-1.5 rounded-control text-xs text-ink focus:outline-none focus:border-emerald-500 font-mono flex-1"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => runProbe(newEnvUrl)}
                      disabled={!newEnvUrl.trim() || probeStatus === "loading"}
                      className="px-2.5 py-1 text-[11px] font-semibold bg-subtle hover:bg-line border border-line text-ink rounded-control transition-colors disabled:opacity-50 shrink-0"
                      title="Probe and detect endpoint health"
                    >
                      {probeStatus === "loading" ? "Probing..." : "Test"}
                    </button>
                  </div>
                </div>

                {probeStatus !== "idle" && (
                  <div
                    className={`text-[11px] px-2.5 py-1.5 rounded-md flex items-center gap-1.5 ${
                      probeStatus === "loading"
                        ? "text-muted bg-subtle"
                        : probeStatus === "success"
                          ? "text-emerald-400 bg-emerald-950/40 border border-emerald-500/30"
                          : "text-rose-400 bg-rose-950/40 border border-rose-500/30"
                    }`}
                  >
                    {probeStatus === "loading" && <RefreshCw className="animate-spin w-3 h-3 shrink-0" />}
                    {probeStatus === "success" && <span className="font-bold shrink-0">✓</span>}
                    {probeStatus === "error" && <span className="font-bold shrink-0">⚠</span>}
                    <span className="truncate">{probeMessage}</span>
                  </div>
                )}

                <p className="text-[10px] text-muted">
                  Tip: Bare IPs automatically default to port 4566 (e.g. <code>10.75.75.50</code> → <code>http://10.75.75.50:4566</code>).
                </p>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setProbeStatus("idle");
                      setProbeMessage("");
                      setIsEnvModalOpen(false);
                    }}
                    className="px-4 py-1.5 text-xs text-muted hover:text-ink rounded-control"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-control transition-colors flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Environment
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body,
        )}
    </header>
  );
}
