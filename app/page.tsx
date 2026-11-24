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
  MessageSquare,
  Zap,
  FileText,
  KeyRound,
  ShieldCheck,
  Network,
  Radio,
  SlidersHorizontal,
  Boxes,
  Workflow,
  GitBranch,
  UserCheck,
  Container,
  Package,
  Globe2,
  Mail,
  Waves,
  Cloud,
  Cpu,
  Scale,
  FileKey2,
  Building2,
  ScrollText,
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
    sqs: 0,
    lambda: 0,
    logs: 0,
    secrets: 0,
    kms: 0,
    rds: 0,
    apigateway: 0,
    sns: 0,
    ssm: 0,
    cloudformation: 0,
    eventbridge: 0,
    stepfunctions: 0,
    cloudwatch: 0,
    cognito: 0,
    ecs: 0,
    ecr: 0,
    route53: 0,
    ses: 0,
    kinesis: 0,
    cloudfront: 0,
    eks: 0,
    elasticache: 0,
    elb: 0,
    acm: 0,
    organizations: 0,
    cloudtrail: 0,
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
        const [
          ec2Res,
          s3Res,
          iamRes,
          ddbRes,
          sqsRes,
          lambdaRes,
          logsRes,
          secRes,
          kmsRes,
          rdsRes,
          apigwRes,
          snsRes,
          ssmRes,
          cfnRes,
          ebRes,
          sfnRes,
          cwRes,
          cogRes,
          ecsRes,
          ecrRes,
          r53Res,
          sesRes,
          kinRes,
          cfRes,
          eksRes,
          ecRes,
          elbRes,
          acmRes,
          orgRes,
          ctRes,
        ] = await Promise.allSettled([
          fetch(`/api/floci/ec2?endpoint=${encodeURIComponent(endpoint)}`).then((r) => r.json()),
          fetch(`/api/floci/s3?endpoint=${encodeURIComponent(endpoint)}`).then((r) => r.json()),
          fetch(`/api/floci/iam?endpoint=${encodeURIComponent(endpoint)}`).then((r) => r.json()),
          fetch(`/api/floci/dynamodb?endpoint=${encodeURIComponent(endpoint)}`).then((r) => r.json()),
          fetch(`/api/floci/sqs?endpoint=${encodeURIComponent(endpoint)}`).then((r) => r.json()),
          fetch(`/api/floci/lambda?endpoint=${encodeURIComponent(endpoint)}`).then((r) => r.json()),
          fetch(`/api/floci/logs?endpoint=${encodeURIComponent(endpoint)}`).then((r) => r.json()),
          fetch(`/api/floci/secrets?endpoint=${encodeURIComponent(endpoint)}`).then((r) => r.json()),
          fetch(`/api/floci/kms?endpoint=${encodeURIComponent(endpoint)}`).then((r) => r.json()),
          fetch(`/api/floci/rds?endpoint=${encodeURIComponent(endpoint)}`).then((r) => r.json()),
          fetch(`/api/floci/apigateway?endpoint=${encodeURIComponent(endpoint)}`).then((r) => r.json()),
          fetch(`/api/floci/sns?endpoint=${encodeURIComponent(endpoint)}`).then((r) => r.json()),
          fetch(`/api/floci/ssm?endpoint=${encodeURIComponent(endpoint)}`).then((r) => r.json()),
          fetch(`/api/floci/cloudformation?endpoint=${encodeURIComponent(endpoint)}`).then((r) => r.json()),
          fetch(`/api/floci/eventbridge?endpoint=${encodeURIComponent(endpoint)}`).then((r) => r.json()),
          fetch(`/api/floci/stepfunctions?endpoint=${encodeURIComponent(endpoint)}`).then((r) => r.json()),
          fetch(`/api/floci/cloudwatch?endpoint=${encodeURIComponent(endpoint)}`).then((r) => r.json()),
          fetch(`/api/floci/cognito?endpoint=${encodeURIComponent(endpoint)}`).then((r) => r.json()),
          fetch(`/api/floci/ecs?endpoint=${encodeURIComponent(endpoint)}`).then((r) => r.json()),
          fetch(`/api/floci/ecr?endpoint=${encodeURIComponent(endpoint)}`).then((r) => r.json()),
          fetch(`/api/floci/route53?endpoint=${encodeURIComponent(endpoint)}`).then((r) => r.json()),
          fetch(`/api/floci/ses?endpoint=${encodeURIComponent(endpoint)}`).then((r) => r.json()),
          fetch(`/api/floci/kinesis?endpoint=${encodeURIComponent(endpoint)}`).then((r) => r.json()),
          fetch(`/api/floci/cloudfront?endpoint=${encodeURIComponent(endpoint)}`).then((r) => r.json()),
          fetch(`/api/floci/eks?endpoint=${encodeURIComponent(endpoint)}`).then((r) => r.json()),
          fetch(`/api/floci/elasticache?endpoint=${encodeURIComponent(endpoint)}`).then((r) => r.json()),
          fetch(`/api/floci/elb?endpoint=${encodeURIComponent(endpoint)}`).then((r) => r.json()),
          fetch(`/api/floci/acm?endpoint=${encodeURIComponent(endpoint)}`).then((r) => r.json()),
          fetch(`/api/floci/organizations?endpoint=${encodeURIComponent(endpoint)}`).then((r) => r.json()),
          fetch(`/api/floci/cloudtrail?endpoint=${encodeURIComponent(endpoint)}`).then((r) => r.json()),
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
          sqs: sqsRes.status === "fulfilled" && sqsRes.value?.queues ? sqsRes.value.queues.length : 0,
          lambda: lambdaRes.status === "fulfilled" && lambdaRes.value?.functions ? lambdaRes.value.functions.length : 0,
          logs: logsRes.status === "fulfilled" && logsRes.value?.logGroups ? logsRes.value.logGroups.length : 0,
          secrets: secRes.status === "fulfilled" && secRes.value?.secrets ? secRes.value.secrets.length : 0,
          kms: kmsRes.status === "fulfilled" && kmsRes.value?.keys ? kmsRes.value.keys.length : 0,
          rds: rdsRes.status === "fulfilled" && rdsRes.value?.count !== undefined ? rdsRes.value.count : 0,
          apigateway: apigwRes.status === "fulfilled" && apigwRes.value?.count !== undefined ? apigwRes.value.count : 0,
          sns: snsRes.status === "fulfilled" && snsRes.value?.topics ? snsRes.value.topics.length : 0,
          ssm: ssmRes.status === "fulfilled" && ssmRes.value?.parameters ? ssmRes.value.parameters.length : 0,
          cloudformation: cfnRes.status === "fulfilled" && cfnRes.value?.stacks ? cfnRes.value.stacks.length : 0,
          eventbridge: ebRes.status === "fulfilled" && ebRes.value?.count !== undefined ? ebRes.value.count : 0,
          stepfunctions: sfnRes.status === "fulfilled" && sfnRes.value?.count !== undefined ? sfnRes.value.count : 0,
          cloudwatch: cwRes.status === "fulfilled" && cwRes.value?.count !== undefined ? cwRes.value.count : 0,
          cognito: cogRes.status === "fulfilled" && cogRes.value?.count !== undefined ? cogRes.value.count : 0,
          ecs: ecsRes.status === "fulfilled" && ecsRes.value?.count !== undefined ? ecsRes.value.count : 0,
          ecr: ecrRes.status === "fulfilled" && ecrRes.value?.count !== undefined ? ecrRes.value.count : 0,
          route53: r53Res.status === "fulfilled" && r53Res.value?.count !== undefined ? r53Res.value.count : 0,
          ses: sesRes.status === "fulfilled" && sesRes.value?.count !== undefined ? sesRes.value.count : 0,
          kinesis: kinRes.status === "fulfilled" && kinRes.value?.count !== undefined ? kinRes.value.count : 0,
          cloudfront: cfRes.status === "fulfilled" && cfRes.value?.count !== undefined ? cfRes.value.count : 0,
          eks: eksRes.status === "fulfilled" && eksRes.value?.count !== undefined ? eksRes.value.count : 0,
          elasticache: ecRes.status === "fulfilled" && ecRes.value?.count !== undefined ? ecRes.value.count : 0,
          elb: elbRes.status === "fulfilled" && elbRes.value?.count !== undefined ? elbRes.value.count : 0,
          acm: acmRes.status === "fulfilled" && acmRes.value?.count !== undefined ? acmRes.value.count : 0,
          organizations: orgRes.status === "fulfilled" && orgRes.value?.count !== undefined ? orgRes.value.count : 0,
          cloudtrail: ctRes.status === "fulfilled" && ctRes.value?.count !== undefined ? ctRes.value.count : 0,
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
      href: "/lambda",
      name: serviceLabels.lambda,
      label: "Functions",
      count: counts.lambda,
      icon: Zap,
      category: "Compute",
    },
    {
      href: "/apigateway",
      name: serviceLabels.apigateway,
      label: "APIs",
      count: counts.apigateway,
      icon: Network,
      category: "Networking",
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
      href: "/dynamodb",
      name: serviceLabels.dynamodb,
      label: isAws ? "Tables" : "Entities",
      count: counts.dynamodb,
      icon: Database,
      category: "Database",
    },
    {
      href: "/rds",
      name: serviceLabels.rds,
      label: isAws ? "Databases" : "Cloud SQL",
      count: counts.rds,
      icon: Database,
      category: "Database",
    },
    {
      href: "/sns",
      name: serviceLabels.sns,
      label: isAws ? "Topics" : "Topics",
      count: counts.sns,
      icon: Radio,
      category: "Messaging",
    },
    {
      href: "/sqs",
      name: serviceLabels.sqs,
      label: "Queues",
      count: counts.sqs,
      icon: MessageSquare,
      category: "Messaging",
    },
    {
      href: "/ssm",
      name: serviceLabels.ssm,
      label: "Parameters",
      count: counts.ssm,
      icon: SlidersHorizontal,
      category: "Management",
    },
    {
      href: "/logs",
      name: serviceLabels.logs,
      label: "Log Groups",
      count: counts.logs,
      icon: FileText,
      category: "Observability",
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
      href: "/secrets",
      name: serviceLabels.secrets,
      label: "Secrets",
      count: counts.secrets,
      icon: KeyRound,
      category: "Security",
    },
    {
      href: "/kms",
      name: serviceLabels.kms,
      label: "Keys",
      count: counts.kms,
      icon: ShieldCheck,
      category: "Security",
    },
    {
      href: "/eventbridge",
      name: serviceLabels.eventbridge,
      label: "Event Buses",
      count: counts.eventbridge,
      icon: Workflow,
      category: "Events",
    },
    {
      href: "/stepfunctions",
      name: serviceLabels.stepfunctions,
      label: "State Machines",
      count: counts.stepfunctions,
      icon: GitBranch,
      category: "Workflows",
    },
    {
      href: "/cloudwatch",
      name: serviceLabels.cloudwatch,
      label: "Metrics & Alarms",
      count: counts.cloudwatch,
      icon: Activity,
      category: "Observability",
    },
    {
      href: "/cognito",
      name: serviceLabels.cognito,
      label: "User Pools",
      count: counts.cognito,
      icon: UserCheck,
      category: "Identity",
    },
    {
      href: "/ecs",
      name: serviceLabels.ecs,
      label: "Clusters",
      count: counts.ecs,
      icon: Container,
      category: "Containers",
    },
    {
      href: "/ecr",
      name: serviceLabels.ecr,
      label: "Repositories",
      count: counts.ecr,
      icon: Package,
      category: "Containers",
    },
    {
      href: "/route53",
      name: serviceLabels.route53,
      label: "Hosted Zones",
      count: counts.route53,
      icon: Globe2,
      category: "Networking",
    },
    {
      href: "/ses",
      name: serviceLabels.ses,
      label: "Identities",
      count: counts.ses,
      icon: Mail,
      category: "Messaging",
    },
    {
      href: "/kinesis",
      name: serviceLabels.kinesis,
      label: "Data Streams",
      count: counts.kinesis,
      icon: Waves,
      category: "Streaming",
    },
    {
      href: "/cloudformation",
      name: serviceLabels.cloudformation,
      label: "Stacks",
      count: counts.cloudformation,
      icon: Boxes,
      category: "Infrastructure",
    },
    {
      href: "/cloudfront",
      name: serviceLabels.cloudfront,
      label: "Distributions",
      count: counts.cloudfront,
      icon: Cloud,
      category: "Networking",
    },
    {
      href: "/eks",
      name: serviceLabels.eks,
      label: "K8s Clusters",
      count: counts.eks,
      icon: Cpu,
      category: "Containers",
    },
    {
      href: "/elasticache",
      name: serviceLabels.elasticache,
      label: "Cache Clusters",
      count: counts.elasticache,
      icon: Zap,
      category: "Database",
    },
    {
      href: "/elb",
      name: serviceLabels.elb,
      label: "Load Balancers",
      count: counts.elb,
      icon: Scale,
      category: "Networking",
    },
    {
      href: "/acm",
      name: serviceLabels.acm,
      label: "Certificates",
      count: counts.acm,
      icon: FileKey2,
      category: "Security",
    },
    {
      href: "/organizations",
      name: serviceLabels.organizations,
      label: "Accounts",
      count: counts.organizations,
      icon: Building2,
      category: "Governance",
    },
    {
      href: "/cloudtrail",
      name: serviceLabels.cloudtrail,
      label: "Audit Trails",
      count: counts.cloudtrail,
      icon: ScrollText,
      category: "Governance",
    },
  ];
  const routes: Record<string, string> = {
    ec2: "/ec2",
    s3: "/s3",
    iam: "/iam",
    dynamodb: "/dynamodb",
    sqs: "/sqs",
    lambda: "/lambda",
    logs: "/logs",
    secretsmanager: "/secrets",
    kms: "/kms",
    rds: "/rds",
    docdb: "/rds",
    sns: "/sns",
    ssm: "/ssm",
    apigateway: "/apigateway",
    apigatewayv2: "/apigateway",
    cloudformation: "/cloudformation",
    events: "/eventbridge",
    eventbridge: "/eventbridge",
    stepfunctions: "/stepfunctions",
    sfn: "/stepfunctions",
    cloudwatch: "/cloudwatch",
    "cognito-idp": "/cognito",
    cognito: "/cognito",
    ecs: "/ecs",
    ecr: "/ecr",
    route53: "/route53",
    ses: "/ses",
    kinesis: "/kinesis",
    cloudfront: "/cloudfront",
    eks: "/eks",
    elasticache: "/elasticache",
    elbv2: "/elb",
    elb: "/elb",
    acm: "/acm",
    organizations: "/organizations",
    cloudtrail: "/cloudtrail",
  };
  const runningCount = serviceEntries.filter(
    ([, status]) => status === "running" || status === "available",
  ).length;

  const cloudHomeTitle =
    cloudMode === "azure"
      ? "Azure Portal Home"
      : cloudMode === "oci"
        ? "Oracle Cloud Dashboard"
        : cloudMode === "gcp"
          ? "Welcome to Google Cloud"
          : "Console home";

  const cloudBreadcrumbName =
    cloudMode === "azure"
      ? "Microsoft Azure"
      : cloudMode === "oci"
        ? "Oracle Cloud"
        : cloudMode === "gcp"
          ? "Google Cloud"
          : "AWS";

  const cloudSubtitle =
    cloudMode === "aws"
      ? "Your resources and services at a glance."
      : `Working in ${branding.scopeLabel}: ${branding.scopeValue}.`;

  const resourcesHeading =
    cloudMode === "aws"
      ? "Resources"
      : cloudMode === "azure"
        ? "Azure Resources"
        : cloudMode === "oci"
          ? "Compartment Resources"
          : "Project resources";

  return (
    <div className="dashboard">
      <div className="console-breadcrumb">
        {cloudBreadcrumbName}
        <span>›</span>
        {cloudMode === "aws" ? "Console home" : "Overview"}
      </div>
      <div className="page-title-row">
        <div>
          <h1>{cloudHomeTitle}</h1>
          <p>{cloudSubtitle}</p>
        </div>
        <span className="environment-badge">Floci · Local environment</span>
      </div>
      <div className="overview-tabs">
        <span>{cloudMode === "aws" ? "Overview" : "Dashboard"}</span>
      </div>
      <div className="overview-columns">
        <section className="console-panel resource-panel">
          <div className="panel-heading">
            <h2>{resourcesHeading}</h2>
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
