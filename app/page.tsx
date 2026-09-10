"use client";

export const dynamic = "force-dynamic";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Server,
  FolderLock,
  Users,
  Database,
  Activity,
  Search,
  CheckCircle2,
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
          fetch(`/api/floci/ec2?endpoint=${encodeURIComponent(endpoint)}`).then(
            (r) => r.json(),
          ),
          fetch(`/api/floci/s3?endpoint=${encodeURIComponent(endpoint)}`).then(
            (r) => r.json(),
          ),
          fetch(`/api/floci/iam?endpoint=${encodeURIComponent(endpoint)}`).then(
            (r) => r.json(),
          ),
          fetch(
            `/api/floci/dynamodb?endpoint=${encodeURIComponent(endpoint)}`,
          ).then((r) => r.json()),
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
          ec2:
            ec2Res.status === "fulfilled" && ec2Res.value?.success
              ? ec2Res.value.count
              : 0,
          s3:
            s3Res.status === "fulfilled" && s3Res.value?.success
              ? s3Res.value.count
              : 0,
          iamRoles: rolesCount,
          iamUsers: usersCount,
          iamPolicies: policiesCount,
          iamTotal: totalIdentities > 0 ? totalIdentities : policiesCount,
          dynamodb:
            ddbRes.status === "fulfilled" && ddbRes.value?.success
              ? ddbRes.value.count
              : 0,
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
  const serviceEntries = Object.entries(services).sort(([a], [b]) =>
    a.localeCompare(b),
  );

  const filteredServices = serviceEntries.filter(([name]) =>
    name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const resources = [
    {
      href: "/ec2",
      name: serviceLabels.ec2,
      label: isAws ? "Instances" : "VM instances",
      count: counts.ec2,
      icon: Server,
      category: "Compute",
    },
    {
      href: "/s3",
      name: serviceLabels.s3,
      label: "Buckets",
      count: counts.s3,
      icon: FolderLock,
      category: "Storage",
    },
    {
      href: "/iam",
      name: serviceLabels.iam,
      label: isAws ? "Identities" : "Principals & roles",
      count: counts.iamTotal,
      icon: Users,
      category: "Security",
    },
    {
      href: "/dynamodb",
      name: serviceLabels.dynamodb,
      label: isAws ? "Tables" : "Entities",
      count: counts.dynamodb,
      icon: Database,
      category: "Database",
    },
  ];
  const routes: Record<string, string> = {
    ec2: "/ec2",
    s3: "/s3",
    iam: "/iam",
    dynamodb: "/dynamodb",
  };
  const runningCount = serviceEntries.filter(
    ([, status]) => status === "running" || status === "available",
  ).length;

  return (
    <div className="dashboard">
      <div className="console-breadcrumb">
        {isAws ? "AWS" : "Google Cloud"}
        <span>›</span>
        {isAws ? "Console home" : "Welcome"}
      </div>
      <div className="page-title-row">
        <div>
          <h1>{isAws ? "Console home" : "Welcome to Google Cloud"}</h1>
          <p>
            {isAws
              ? "Your resources and services at a glance."
              : `You're working in ${branding.scopeValue}.`}
          </p>
        </div>
        <span className="environment-badge">Floci · Local environment</span>
      </div>
      <div className="overview-tabs">
        <span>{isAws ? "Overview" : "Dashboard"}</span>
      </div>
      <div className="overview-columns">
        <section className="console-panel resource-panel">
          <div className="panel-heading">
            <h2>{isAws ? "Resources" : "Project resources"}</h2>
            <span>{branding.scopeValue}</span>
          </div>
          <div className="resource-grid">
            {resources.map(
              ({ href, name, label, count, icon: Icon, category }) => (
                <Link key={href} href={href} className="resource-summary">
                  <div className={`resource-icon ${category.toLowerCase()}`}>
                    <Icon size={22} />
                  </div>
                  <span className="resource-name">{name}</span>
                  <strong>
                    {isLoadingCounts ? "…" : !isConnected ? "—" : count}
                  </strong>
                  <span className="resource-label">{label}</span>
                </Link>
              ),
            )}
          </div>
          <div className="panel-footer">
            Resources in the selected emulator environment
          </div>
        </section>
        <section className="console-panel environment-panel">
          <div className="panel-heading">
            <h2>{isAws ? "Environment health" : "Project info"}</h2>
            <Activity size={17} />
          </div>
          <dl>
            <div>
              <dt>Connection</dt>
              <dd className={isConnected ? "status-ok" : "status-offline"}>
                {isConnected ? (
                  <CheckCircle2 size={15} />
                ) : (
                  <Activity size={15} />
                )}
                {isConnected ? "Connected" : "Disconnected"}
              </dd>
            </div>
            <div>
              <dt>Services available</dt>
              <dd>
                {isConnected
                  ? `${runningCount} / ${serviceEntries.length}`
                  : "—"}
              </dd>
            </div>
            <div>
              <dt>Emulator version</dt>
              <dd>{health?.version ? `v${health.version}` : "—"}</dd>
            </div>
            <div className="endpoint-detail">
              <dt>Endpoint</dt>
              <dd>{endpoint}</dd>
            </div>
          </dl>
        </section>
      </div>
      <section className="console-panel">
        <div className="panel-heading">
          <h2>{isAws ? "Explore services" : "Quick access"}</h2>
          <span>Resource management</span>
        </div>
        <div className="quick-access">
          {resources.map(({ href, name, category, icon: Icon }) => (
            <Link key={href} href={href}>
              <Icon size={19} />
              <div>
                <strong>{name}</strong>
                <span>{category}</span>
              </div>
              <span className="quick-arrow">→</span>
            </Link>
          ))}
        </div>
      </section>
      <section className="console-panel services-panel">
        <div className="panel-heading">
          <div>
            <h2>
              Emulated services{" "}
              <span className="count-label">({serviceEntries.length})</span>
            </h2>
            <p>Service availability reported by your Floci endpoint.</p>
          </div>
          <span className={isConnected ? "status-ok" : "status-offline"}>
            {isConnected ? "Connected" : "Offline"}
          </span>
        </div>
        <div className="table-toolbar">
          <Search size={17} />
          <input
            aria-label="Filter emulated services"
            placeholder="Find services by name"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <span>{filteredServices.length} services</span>
        </div>
        <div className="service-table-scroll">
          <table className="service-table">
            <thead>
              <tr>
                <th>Service name</th>
                <th>Status</th>
                <th>Environment</th>
                <th>Console</th>
              </tr>
            </thead>
            <tbody>
              {filteredServices.map(([name, status]) => (
                <tr key={name}>
                  <td>{name}</td>
                  <td>
                    <span
                      className={
                        status === "running" || status === "available"
                          ? "status-ok"
                          : "status-offline"
                      }
                    >
                      <span className="status-dot" />
                      {status}
                    </span>
                  </td>
                  <td>Local emulator</td>
                  <td>
                    {routes[name] ? (
                      <Link href={routes[name]}>
                        Open console <span aria-hidden="true">↗</span>
                      </Link>
                    ) : (
                      <span className="muted">API only</span>
                    )}
                  </td>
                </tr>
              ))}
              {!filteredServices.length && (
                <tr>
                  <td colSpan={4} className="table-empty">
                    {!isConnected
                      ? "Connect to an emulator to view service availability."
                      : searchTerm
                        ? `No services match “${searchTerm}”.`
                        : "No services reported by this endpoint."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="panel-footer">
          {isConnected
            ? `${filteredServices.length} of ${serviceEntries.length} services`
            : "Waiting for a connection"}
        </div>
      </section>
    </div>
  );
}
