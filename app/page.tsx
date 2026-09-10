"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Server,
  FolderLock,
  Users,
  Database,
  Layers,
  Activity,
  Search,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";
import { useEndpoint } from "@/components/EndpointProvider";
import { useCloudTheme } from "@/components/CloudThemeContext";

export default function DashboardPage() {
  const { endpoint, isConnected, health } = useEndpoint();
  const { cloudMode, serviceLabels, branding } = useCloudTheme();
  const [searchTerm, setSearchTerm] = useState("");
  const [counts, setCounts] = useState({
    ec2: 0,
    s3: 0,
    iamRoles: 0,
    iamUsers: 0,
    iamPolicies: 0,
    iamTotal: 0,
    dynamodb: 0,
  });
  const [isLoadingCounts, setIsLoadingCounts] = useState(true);

  const isAws = cloudMode === "aws";

  useEffect(() => {
    if (!isConnected) {
      setIsLoadingCounts(false);
      return;
    }

    const fetchCounts = async () => {
      setIsLoadingCounts(true);
      try {
        const [ec2Res, s3Res, iamRes, ddbRes] = await Promise.allSettled([
          fetch(`/api/floci/ec2?endpoint=${encodeURIComponent(endpoint)}`).then((r) => r.json()),
          fetch(`/api/floci/s3?endpoint=${encodeURIComponent(endpoint)}`).then((r) => r.json()),
          fetch(`/api/floci/iam?endpoint=${encodeURIComponent(endpoint)}`).then((r) => r.json()),
          fetch(`/api/floci/dynamodb?endpoint=${encodeURIComponent(endpoint)}`).then((r) => r.json()),
        ]);

        const rolesCount =
          iamRes.status === "fulfilled" && iamRes.value?.success
            ? iamRes.value.data?.roles?.length || 0
            : 0;
        const usersCount =
          iamRes.status === "fulfilled" && iamRes.value?.success
            ? iamRes.value.data?.users?.length || 0
            : 0;
        const policiesCount =
          iamRes.status === "fulfilled" && iamRes.value?.success
            ? iamRes.value.data?.policies?.length || 0
            : 0;
        const totalIdentities = rolesCount + usersCount;

        setCounts({
          ec2: ec2Res.status === "fulfilled" && ec2Res.value?.success ? ec2Res.value.count : 0,
          s3: s3Res.status === "fulfilled" && s3Res.value?.success ? s3Res.value.count : 0,
          iamRoles: rolesCount,
          iamUsers: usersCount,
          iamPolicies: policiesCount,
          iamTotal: totalIdentities > 0 ? totalIdentities : policiesCount,
          dynamodb: ddbRes.status === "fulfilled" && ddbRes.value?.success ? ddbRes.value.count : 0,
        });
      } catch (e) {
        console.error("Failed to load counts", e);
      } finally {
        setIsLoadingCounts(false);
      }
    };

    fetchCounts();
  }, [endpoint, isConnected]);

  const services: Record<string, string> = health?.services || {};
  const serviceEntries = Object.entries(services).sort(([a], [b]) => a.localeCompare(b));

  const filteredServices = serviceEntries.filter(([name]) =>
    name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeBadgeColor = isAws
    ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
    : "bg-blue-500/10 text-blue-400 border-blue-500/30";

  const cardHoverBorder = isAws
    ? "hover:border-amber-500/50 hover:shadow-amber-500/5"
    : "hover:border-blue-500/50 hover:shadow-blue-500/5";

  const iconBg = isAws
    ? "bg-amber-500/10 text-amber-400 group-hover:bg-amber-500 group-hover:text-slate-950"
    : "bg-blue-500/10 text-blue-400 group-hover:bg-blue-500 group-hover:text-white";

  const linkColor = isAws ? "text-amber-400" : "text-blue-400";

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-[#0f172a] border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div
          className={`absolute right-0 top-0 w-96 h-96 rounded-full blur-3xl pointer-events-none ${
            isAws ? "bg-amber-500/5" : "bg-blue-500/5"
          }`}
        />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold tracking-tight text-white">{branding.title}</h2>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${activeBadgeColor}`}>
                {isAws ? "AWS Compatible" : "GCP Compatible"} v{health?.version || "2.0.1"}
              </span>
            </div>
            <p className="text-slate-400 text-sm mt-1">
              Active Endpoint: <span className="font-mono text-slate-200">{endpoint}</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-slate-950/60 border border-slate-800 px-4 py-2 rounded-xl text-center">
              <span className="text-xs text-slate-500 block">Total Services</span>
              <span className="text-xl font-bold text-slate-200">{serviceEntries.length}</span>
            </div>
            <div className="bg-slate-950/60 border border-slate-800 px-4 py-2 rounded-xl text-center">
              <span className="text-xs text-slate-500 block">Status</span>
              <span className="text-sm font-bold text-emerald-400 flex items-center gap-1.5 mt-0.5">
                <CheckCircle2 className="w-4 h-4" /> {isConnected ? "Healthy" : "Offline"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Resource Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          href="/ec2"
          className={`group bg-[#0d1322] border border-slate-800 rounded-xl p-5 transition-all shadow-md ${cardHoverBorder}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              {isAws ? "EC2 Compute" : "Compute Engine"}
            </span>
            <div className={`p-2 rounded-lg transition-colors ${iconBg}`}>
              <Server className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            {isLoadingCounts ? (
              <div className="h-8 w-14 bg-slate-800 animate-pulse rounded-lg mt-1" />
            ) : (
              <span className="text-3xl font-bold text-white">{counts.ec2}</span>
            )}
            <span className={`text-xs flex items-center gap-1 font-medium ${linkColor}`}>
              {serviceLabels.instances} <ExternalLink className="w-3 h-3" />
            </span>
          </div>
          <p className="mt-1.5 text-[11px] text-slate-500 truncate">
            {counts.ec2 > 0 ? `${counts.ec2} active instance${counts.ec2 > 1 ? "s" : ""}` : "No instances deployed"}
          </p>
        </Link>

        <Link
          href="/s3"
          className={`group bg-[#0d1322] border border-slate-800 rounded-xl p-5 transition-all shadow-md ${cardHoverBorder}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              {isAws ? "S3 Storage" : "Cloud Storage"}
            </span>
            <div className={`p-2 rounded-lg transition-colors ${iconBg}`}>
              <FolderLock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            {isLoadingCounts ? (
              <div className="h-8 w-14 bg-slate-800 animate-pulse rounded-lg mt-1" />
            ) : (
              <span className="text-3xl font-bold text-white">{counts.s3}</span>
            )}
            <span className={`text-xs flex items-center gap-1 font-medium ${linkColor}`}>
              {serviceLabels.buckets} <ExternalLink className="w-3 h-3" />
            </span>
          </div>
          <p className="mt-1.5 text-[11px] text-slate-500 truncate">
            {counts.s3 > 0 ? `${counts.s3} bucket${counts.s3 > 1 ? "s" : ""} available` : "No buckets created"}
          </p>
        </Link>

        <Link
          href="/iam"
          className={`group bg-[#0d1322] border border-slate-800 rounded-xl p-5 transition-all shadow-md ${cardHoverBorder}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              {isAws ? "IAM Identities" : "IAM & Admin"}
            </span>
            <div className={`p-2 rounded-lg transition-colors ${iconBg}`}>
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            {isLoadingCounts ? (
              <div className="h-8 w-14 bg-slate-800 animate-pulse rounded-lg mt-1" />
            ) : (
              <span className="text-3xl font-bold text-white">{counts.iamTotal}</span>
            )}
            <span className={`text-xs flex items-center gap-1 font-medium ${linkColor}`}>
              {serviceLabels.roles} <ExternalLink className="w-3 h-3" />
            </span>
          </div>
          <p className="mt-1.5 text-[11px] text-slate-500 truncate">
            {counts.iamRoles > 0 || counts.iamUsers > 0
              ? `${counts.iamRoles} Roles · ${counts.iamUsers} Users`
              : counts.iamPolicies > 0
              ? `${counts.iamPolicies} Managed Policies`
              : "No identities configured"}
          </p>
        </Link>

        <Link
          href="/dynamodb"
          className={`group bg-[#0d1322] border border-slate-800 rounded-xl p-5 transition-all shadow-md ${cardHoverBorder}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              {isAws ? "DynamoDB NoSQL" : "Datastore / NoSQL"}
            </span>
            <div className={`p-2 rounded-lg transition-colors ${iconBg}`}>
              <Database className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            {isLoadingCounts ? (
              <div className="h-8 w-14 bg-slate-800 animate-pulse rounded-lg mt-1" />
            ) : (
              <span className="text-3xl font-bold text-white">{counts.dynamodb}</span>
            )}
            <span className={`text-xs flex items-center gap-1 font-medium ${linkColor}`}>
              {serviceLabels.tables} <ExternalLink className="w-3 h-3" />
            </span>
          </div>
          <p className="mt-1.5 text-[11px] text-slate-500 truncate">
            {counts.dynamodb > 0 ? `${counts.dynamodb} active table${counts.dynamodb > 1 ? "s" : ""}` : "No tables created"}
          </p>
        </Link>
      </div>

      {/* Services Grid Section */}
      <div className="bg-[#0d1322] border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
          <div>
            <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <Activity className={`w-5 h-5 ${isAws ? "text-amber-400" : "text-blue-400"}`} />
              Active Emulated Cloud Services
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Real-time operational status of all services running in this emulator instance
            </p>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter services (e.g. s3, ec2, compute, iam)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-slate-900 border border-slate-800 pl-9 pr-4 py-1.5 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-slate-600 w-64"
            />
          </div>
        </div>

        {/* Services List */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {filteredServices.map(([name, status]) => {
            const isRunning = status === "running" || status === "available";
            return (
              <div
                key={name}
                className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3 flex flex-col justify-between hover:border-slate-700 transition-colors"
              >
                <span className="font-mono text-xs font-semibold text-slate-200 truncate capitalize">
                  {name}
                </span>
                <div className="mt-2 flex items-center justify-between">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-semibold tracking-wide ${
                      isRunning
                        ? "bg-emerald-950/50 text-emerald-400 border border-emerald-500/20"
                        : "bg-amber-950/50 text-amber-400 border border-amber-500/20"
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isRunning ? "bg-emerald-400" : "bg-amber-400"
                      }`}
                    />
                    {status}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
