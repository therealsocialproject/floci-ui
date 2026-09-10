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
} from "lucide-react";
import { useEndpoint } from "./EndpointProvider";
import { useCloudTheme } from "./CloudThemeContext";

export function Sidebar() {
  const pathname = usePathname();
  const { cloudMode, serviceLabels, toggleCloudMode } = useCloudTheme();

  const isAws = cloudMode === "aws";

  const navItems = [
    { name: serviceLabels.dashboard, href: "/", icon: LayoutDashboard },
    { name: serviceLabels.ec2, href: "/ec2", icon: Server },
    { name: serviceLabels.s3, href: "/s3", icon: FolderLock },
    { name: serviceLabels.iam, href: "/iam", icon: Users },
    { name: serviceLabels.dynamodb, href: "/dynamodb", icon: Database },
  ];

  return (
    <aside className="console-sidebar" aria-label="Service navigation">
      <div className="sidebar-heading flex items-center justify-between">
        <span>{isAws ? "Services" : "Products"}</span>
        <button
          type="button"
          onClick={toggleCloudMode}
          className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border cursor-pointer transition-colors ${
            isAws
              ? "bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20"
              : "bg-blue-500/10 text-blue-400 border-blue-500/30 hover:bg-blue-500/20"
          }`}
          title={`Click to switch to ${isAws ? "Google Cloud" : "AWS"}`}
        >
          {isAws ? "AWS" : "GCP"}
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
        {isAws ? "RESOURCE MANAGEMENT" : "YOUR WORKSPACE"}
      </div>
      <div className="sidebar-note">
        <Layers size={17} />
        <div>
          Local cloud environment<small>Powered by Floci</small>
        </div>
      </div>
      <div className="sidebar-footer">
        <span className="emulator-dot" /> Floci emulator<span>v1.1.0</span>
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
  } = useEndpoint();

  const { cloudMode, branding, setCloudMode, serviceLabels } = useCloudTheme();

  const [isEnvModalOpen, setIsEnvModalOpen] = useState(false);
  const [newEnvName, setNewEnvName] = useState("");
  const [newEnvUrl, setNewEnvUrl] = useState("");
  const [newEnvProvider, setNewEnvProvider] = useState<"aws" | "gcp">("aws");
  const [mounted, setMounted] = useState(false);
  const [serviceSearch, setServiceSearch] = useState("");

  const searchLinks = [
    { href: "/", name: serviceLabels.dashboard },
    { href: "/ec2", name: serviceLabels.ec2 },
    { href: "/s3", name: serviceLabels.s3 },
    { href: "/iam", name: serviceLabels.iam },
    { href: "/dynamodb", name: serviceLabels.dynamodb },
  ].filter((item) =>
    item.name.toLowerCase().includes(serviceSearch.toLowerCase()),
  );

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
    if (
      name.toLowerCase().includes("gcp") ||
      name.toLowerCase().includes("google")
    ) {
      setNewEnvProvider("gcp");
    } else if (
      name.toLowerCase().includes("aws") ||
      name.toLowerCase().includes("amazon")
    ) {
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
        {isAws ? (
          <span className="aws-wordmark">
            aws
            <span />
          </span>
        ) : (
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
      </Link>

      {/* 1-Click Cloud Provider Switcher */}
      <div className="flex items-center bg-slate-900/90 border border-slate-700/60 p-0.5 rounded-lg text-xs shrink-0 mx-1">
        <button
          type="button"
          onClick={() => setCloudMode("aws")}
          className={`px-2 py-0.5 rounded font-bold text-[10px] tracking-wider uppercase transition-colors ${
            isAws
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
            !isAws
              ? "bg-blue-600 text-white shadow-sm"
              : "text-slate-400 hover:text-slate-200"
          }`}
          title="Switch to Google Cloud View"
        >
          GCP
        </button>
      </div>

      <span className="header-divider" />
      <span className="header-scope">
        {isAws ? "Services" : branding.scopeValue}
        {isAws ? <Boxes size={16} /> : <Layers size={16} />}
      </span>

      <div className="console-search">
        <Search size={17} />
        <input
          aria-label="Search services"
          placeholder={
            isAws ? "Search services" : "Search products and resources"
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

      {isAws && <span className="header-region">{branding.scopeValue}</span>}

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
                            onClick={() =>
                              updateEnvironmentProvider(
                                env.id,
                                env.provider === "aws" ? "gcp" : "aws",
                              )
                            }
                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border cursor-pointer transition-colors ${
                              env.provider === "gcp"
                                ? "bg-blue-500/20 text-blue-400 border-blue-500/30 hover:bg-blue-500/30"
                                : "bg-amber-500/20 text-amber-400 border-amber-500/30 hover:bg-amber-500/30"
                            }`}
                            title="Click to switch between AWS and GCP"
                          >
                            {env.provider || "AWS"} ⟲
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
                    <button
                      type="button"
                      onClick={() => setNewEnvProvider("aws")}
                      className={`px-2.5 py-0.5 rounded-md font-semibold transition-colors ${
                        newEnvProvider === "aws"
                          ? "bg-action text-slate-950 font-bold"
                          : "text-muted hover:text-ink"
                      }`}
                    >
                      AWS
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewEnvProvider("gcp")}
                      className={`px-2.5 py-0.5 rounded-md font-semibold transition-colors ${
                        newEnvProvider === "gcp"
                          ? "bg-action text-white font-bold"
                          : "text-muted hover:text-ink"
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
                    className="bg-subtle border border-line px-3 py-1.5 rounded-control text-xs text-ink focus:outline-none focus:border-emerald-500"
                  />
                  <input
                    type="text"
                    placeholder="URL (e.g. http://192.168.1.50:4566)"
                    value={newEnvUrl}
                    onChange={(e) => handleUrlChange(e.target.value)}
                    className="bg-subtle border border-line px-3 py-1.5 rounded-control text-xs text-ink focus:outline-none focus:border-emerald-500 font-mono"
                    required
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsEnvModalOpen(false)}
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
