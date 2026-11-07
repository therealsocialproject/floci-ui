"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Boxes,
  RefreshCw,
  Plus,
  Trash2,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  X,
  Code,
  Copy,
  Check,
  Layers,
  FileCode,
  Activity,
  Server,
  Database,
  ShieldCheck,
  FolderLock,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import { useEndpoint } from "@/components/EndpointProvider";
import { useCloudTheme } from "@/components/CloudThemeContext";
import { ResourceDrawer } from "@/components/ResourceDrawer";

interface StackSummary {
  StackName: string;
  StackId: string;
  StackStatus: string;
  CreationTime?: string;
  LastUpdatedTime?: string;
  TemplateDescription?: string;
  StackStatusReason?: string;
}

interface StackResource {
  LogicalResourceId: string;
  PhysicalResourceId?: string;
  ResourceType: string;
  ResourceStatus: string;
  ResourceStatusReason?: string;
  LastUpdatedTimestamp?: string;
}

interface StackEvent {
  EventId: string;
  StackName: string;
  LogicalResourceId: string;
  PhysicalResourceId?: string;
  ResourceType: string;
  Timestamp?: string;
  ResourceStatus: string;
  ResourceStatusReason?: string;
}

const SAMPLE_TEMPLATES = [
  {
    name: "S3 Bucket & SQS Queue",
    description: "Standard storage bucket with dedicated dead-letter SQS message queue",
    body: `AWSTemplateFormatVersion: '2010-09-09'
Description: S3 Storage and SQS Event Pipeline for Floci
Resources:
  DataStorageBucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: !Sub "floci-app-storage-\${AWS::Region}"
  ProcessingQueue:
    Type: AWS::SQS::Queue
    Properties:
      QueueName: floci-events-queue.fifo
      FifoQueue: true
      ContentBasedDeduplication: true
Outputs:
  BucketArn:
    Description: ARN of the storage bucket
    Value: !GetAtt DataStorageBucket.Arn
  QueueUrl:
    Description: URL of the FIFO queue
    Value: !Ref ProcessingQueue`,
  },
  {
    name: "Serverless DynamoDB & IAM",
    description: "High-performance DynamoDB NoSQL table with IAM service role",
    body: `AWSTemplateFormatVersion: '2010-09-09'
Description: DynamoDB and Execution Role
Resources:
  ApplicationTable:
    Type: AWS::DynamoDB::Table
    Properties:
      TableName: floci-customer-records
      BillingMode: PAY_PER_REQUEST
      AttributeDefinitions:
        - AttributeName: customer_id
          AttributeType: S
        - AttributeName: created_at
          AttributeType: S
      KeySchema:
        - AttributeName: customer_id
          KeyType: HASH
        - AttributeName: created_at
          KeyType: RANGE
  LambdaExecutionRole:
    Type: AWS::IAM::Role
    Properties:
      RoleName: FlociAppRole
      AssumeRolePolicyDocument:
        Version: '2012-10-17'
        Statement:
          - Effect: Allow
            Principal:
              Service: lambda.amazonaws.com
            Action: sts:AssumeRole`,
  },
  {
    name: "EC2 Security Group & Compute",
    description: "EC2 Security Group with inbound firewall rules for web traffic",
    body: `AWSTemplateFormatVersion: '2010-09-09'
Description: Floci EC2 VPC Security Configuration
Resources:
  WebSecurityGroup:
    Type: AWS::EC2::SecurityGroup
    Properties:
      GroupDescription: Enable HTTP and SSH access
      SecurityGroupIngress:
        - IpProtocol: tcp
          FromPort: 80
          ToPort: 80
          CidrIp: 0.0.0.0/0
        - IpProtocol: tcp
          FromPort: 22
          ToPort: 22
          CidrIp: 10.0.0.0/8`,
  },
];

export default function CloudFormationPage() {
  const { endpoint, isConnected } = useEndpoint();
  const { cloudMode, serviceLabels } = useCloudTheme();

  const [stacks, setStacks] = useState<StackSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [mounted, setMounted] = useState(false);

  // Selected Stack & Drawer Details
  const [selectedStackName, setSelectedStackName] = useState<string | null>(null);
  const [stackDetail, setStackDetail] = useState<any>(null);
  const [stackResources, setStackResources] = useState<StackResource[]>([]);
  const [stackEvents, setStackEvents] = useState<StackEvent[]>([]);
  const [stackTemplate, setStackTemplate] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"resources" | "events" | "template" | "details">("resources");
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Create Stack Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newStackName, setNewStackName] = useState("");
  const [newTemplateBody, setNewTemplateBody] = useState(SAMPLE_TEMPLATES[0].body);
  const [submitting, setSubmitting] = useState(false);

  // Delete Stack
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Notification & Copy
  const [notification, setNotification] = useState<{ msg: string; isError?: boolean } | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const isAws = cloudMode === "aws";

  useEffect(() => {
    setMounted(true);
  }, []);

  const showNotification = (msg: string, isError = false) => {
    setNotification({ msg, isError });
    setTimeout(() => setNotification(null), 4000);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const fetchStacks = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/floci/cloudformation?endpoint=${encodeURIComponent(endpoint)}&action=list`
      );
      const data = await res.json();
      if (res.ok) {
        setStacks(data.stacks || []);
      } else {
        showNotification(data.error || "Failed to fetch CloudFormation stacks", true);
      }
    } catch (e: any) {
      showNotification(e.message || "Failed to fetch CloudFormation stacks", true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isConnected) {
      fetchStacks();
    }
  }, [endpoint, isConnected]);

  const loadStackDetails = async (stackName: string) => {
    setSelectedStackName(stackName);
    setLoadingDetail(true);
    try {
      const [resDesc, resRes, resEv, resTpl] = await Promise.all([
        fetch(`/api/floci/cloudformation?endpoint=${encodeURIComponent(endpoint)}&action=describe&stackName=${encodeURIComponent(stackName)}`).then((r) => r.json()),
        fetch(`/api/floci/cloudformation?endpoint=${encodeURIComponent(endpoint)}&action=resources&stackName=${encodeURIComponent(stackName)}`).then((r) => r.json()),
        fetch(`/api/floci/cloudformation?endpoint=${encodeURIComponent(endpoint)}&action=events&stackName=${encodeURIComponent(stackName)}`).then((r) => r.json()),
        fetch(`/api/floci/cloudformation?endpoint=${encodeURIComponent(endpoint)}&action=template&stackName=${encodeURIComponent(stackName)}`).then((r) => r.json()),
      ]);

      setStackDetail(resDesc.stack || null);
      setStackResources(resRes.resources || []);
      setStackEvents(resEv.events || []);
      setStackTemplate(resTpl.template || "");
    } catch (e: any) {
      showNotification(e.message || "Failed to load stack details", true);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleCreateStack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStackName.trim() || !newTemplateBody.trim()) {
      showNotification("Stack name and template body are required", true);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/floci/cloudformation?endpoint=${encodeURIComponent(endpoint)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          stackName: newStackName.trim(),
          templateBody: newTemplateBody,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showNotification(`Stack "${newStackName}" created successfully!`);
        setIsCreateOpen(false);
        setNewStackName("");
        fetchStacks();
      } else {
        showNotification(data.error || "Failed to create stack", true);
      }
    } catch (e: any) {
      showNotification(e.message || "Failed to create stack", true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteStack = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(
        `/api/floci/cloudformation?endpoint=${encodeURIComponent(endpoint)}&stackName=${encodeURIComponent(deleteTarget)}`,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (res.ok) {
        showNotification(`Stack "${deleteTarget}" deleted successfully.`);
        if (selectedStackName === deleteTarget) {
          setSelectedStackName(null);
          setStackDetail(null);
        }
        setDeleteTarget(null);
        fetchStacks();
      } else {
        showNotification(data.error || "Failed to delete stack", true);
      }
    } catch (e: any) {
      showNotification(e.message || "Failed to delete stack", true);
    } finally {
      setDeleting(false);
    }
  };

  // Filtering
  const filteredStacks = stacks.filter((s) => {
    const matchesSearch =
      s.StackName.toLowerCase().includes(search.toLowerCase()) ||
      (s.TemplateDescription || "").toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;
    if (statusFilter === "ALL") return true;
    if (statusFilter === "COMPLETE") return s.StackStatus.includes("COMPLETE");
    if (statusFilter === "IN_PROGRESS") return s.StackStatus.includes("IN_PROGRESS");
    if (statusFilter === "FAILED") return s.StackStatus.includes("FAILED") || s.StackStatus.includes("ROLLBACK");
    return true;
  });

  const getStatusBadge = (status: string) => {
    if (status.includes("COMPLETE")) {
      return (
        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 inline-flex items-center gap-1">
          <CheckCircle2 size={12} />
          {status}
        </span>
      );
    }
    if (status.includes("IN_PROGRESS")) {
      return (
        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 inline-flex items-center gap-1 animate-pulse">
          <RefreshCw size={12} className="animate-spin" />
          {status}
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20 inline-flex items-center gap-1">
        <AlertCircle size={12} />
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed top-4 right-4 z-[9999] px-4 py-3 rounded-panel border shadow-2xl flex items-center gap-2 text-xs font-semibold animate-in fade-in slide-in-from-top-2 ${
            notification.isError
              ? "bg-rose-950/90 border-rose-500/30 text-rose-200"
              : "bg-emerald-950/90 border-emerald-500/30 text-emerald-200"
          }`}
        >
          {notification.isError ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
          <span>{notification.msg}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-ink">
              {isAws ? "CloudFormation Stacks" : "Deployment Manager Deployments"}
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
              Floci v2.4 Engine
            </span>
          </div>
          <p className="text-xs text-muted mt-1">
            {isAws
              ? "Model, provision, and orchestrate AWS infrastructure with CloudFormation templates"
              : "Declarative infrastructure-as-code orchestration powered by Floci"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchStacks}
            disabled={loading}
            className="p-2 text-muted hover:text-ink bg-surface border border-line rounded-control hover:bg-subtle transition-colors"
            title="Refresh Stacks"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          </button>
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="px-3.5 py-1.5 text-xs font-semibold bg-action text-white hover:opacity-90 rounded-control transition-opacity flex items-center gap-1.5 shadow-sm"
          >
            <Plus size={15} />
            <span>Create Stack</span>
          </button>
        </div>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="stat-label flex items-center justify-between">
            <span>Total Stacks</span>
            <Boxes size={14} className="text-muted" />
          </div>
          <div className="stat-value">{stacks.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label flex items-center justify-between">
            <span>Complete</span>
            <CheckCircle2 size={14} className="text-emerald-400" />
          </div>
          <div className="stat-value text-emerald-400">
            {stacks.filter((s) => s.StackStatus.includes("COMPLETE")).length}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label flex items-center justify-between">
            <span>In Progress</span>
            <Clock size={14} className="text-blue-400" />
          </div>
          <div className="stat-value text-blue-400">
            {stacks.filter((s) => s.StackStatus.includes("IN_PROGRESS")).length}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label flex items-center justify-between">
            <span>Rollback / Failed</span>
            <AlertCircle size={14} className="text-rose-400" />
          </div>
          <div className="stat-value text-rose-400">
            {stacks.filter((s) => s.StackStatus.includes("FAILED") || s.StackStatus.includes("ROLLBACK")).length}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-3 bg-surface border border-line rounded-panel flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            placeholder="Search stacks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-subtle border border-line rounded-control text-xs text-ink placeholder:text-muted focus:outline-none focus:border-amber-500/50"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {(["ALL", "COMPLETE", "IN_PROGRESS", "FAILED"] as const).map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setStatusFilter(filter)}
              className={`px-3 py-1 text-xs rounded-control font-medium transition-colors cursor-pointer ${
                statusFilter === filter
                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                  : "text-muted hover:text-ink hover:bg-subtle"
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Main Stacks Table & Selected Drawer Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className={selectedStackName ? "lg:col-span-6 space-y-4" : "lg:col-span-12 space-y-4"}>
          <div className="bg-surface border border-line rounded-panel overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-subtle/60 border-b border-line text-muted">
                    <th className="py-2.5 px-4 font-semibold">Stack Name</th>
                    <th className="py-2.5 px-4 font-semibold">Status</th>
                    <th className="py-2.5 px-4 font-semibold hidden sm:table-cell">Created</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/60">
                  {loading && stacks.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-muted">
                        <RefreshCw size={18} className="animate-spin mx-auto mb-2 text-amber-400" />
                        Loading CloudFormation stacks...
                      </td>
                    </tr>
                  ) : filteredStacks.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-10 text-center text-muted">
                        <Boxes size={28} className="mx-auto mb-2 opacity-40" />
                        <div className="font-medium text-ink">No stacks found</div>
                        <p className="text-[11px] mt-0.5">Deploy a template or create your first stack.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredStacks.map((s) => {
                      const isSelected = selectedStackName === s.StackName;
                      return (
                        <tr
                          key={s.StackId}
                          onClick={() => loadStackDetails(s.StackName)}
                          className={`cursor-pointer transition-colors ${
                            isSelected ? "bg-amber-500/10" : "hover:bg-subtle/50"
                          }`}
                        >
                          <td className="py-3 px-4">
                            <div className="font-semibold text-ink flex items-center gap-1.5">
                              <Boxes size={14} className="text-amber-400 shrink-0" />
                              <span>{s.StackName}</span>
                            </div>
                            {s.TemplateDescription && (
                              <div className="text-[11px] text-muted truncate max-w-xs mt-0.5">
                                {s.TemplateDescription}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4">{getStatusBadge(s.StackStatus)}</td>
                          <td className="py-3 px-4 text-muted hidden sm:table-cell">
                            {s.CreationTime ? new Date(s.CreationTime).toLocaleString() : "—"}
                          </td>
                          <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => loadStackDetails(s.StackName)}
                                className="p-1.5 text-muted hover:text-ink hover:bg-subtle rounded transition-colors"
                                title="Inspect Stack Resources & Events"
                              >
                                <ArrowRight size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteTarget(s.StackName)}
                                className="p-1.5 text-muted hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors"
                                title="Delete Stack"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Selected Stack Details Inspector Panel */}
        {selectedStackName && (
          <div className="lg:col-span-6 bg-surface border border-line rounded-panel p-4 flex flex-col space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <Boxes size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-ink text-sm flex items-center gap-2">
                    {selectedStackName}
                    {stackDetail && getStatusBadge(stackDetail.StackStatus)}
                  </h3>
                  <div className="text-[11px] text-muted font-mono truncate max-w-md">
                    {stackDetail?.StackId || selectedStackName}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedStackName(null)}
                className="p-1 text-muted hover:text-ink rounded"
              >
                <X size={16} />
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-1 border-b border-line text-xs pb-1">
              {(
                [
                  { id: "resources", label: `Resources (${stackResources.length})`, icon: Layers },
                  { id: "events", label: `Events (${stackEvents.length})`, icon: Activity },
                  { id: "template", label: "Template", icon: FileCode },
                  { id: "details", label: "Parameters & Info", icon: Code },
                ] as const
              ).map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActiveTab(id)}
                  className={`px-3 py-1.5 rounded-control font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                    activeTab === id
                      ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                      : "text-muted hover:text-ink hover:bg-subtle"
                  }`}
                >
                  <Icon size={13} />
                  <span>{label}</span>
                </button>
              ))}
            </div>

            {/* Tab Contents */}
            <div className="flex-1 overflow-y-auto max-h-[500px]">
              {loadingDetail ? (
                <div className="py-12 text-center text-muted">
                  <RefreshCw size={20} className="animate-spin mx-auto mb-2 text-amber-400" />
                  Loading stack details...
                </div>
              ) : activeTab === "resources" ? (
                <div className="space-y-2">
                  {stackResources.length === 0 ? (
                    <div className="py-8 text-center text-muted text-xs">
                      No resources provisioned in this stack.
                    </div>
                  ) : (
                    stackResources.map((res) => (
                      <div
                        key={res.LogicalResourceId}
                        className="p-3 bg-subtle rounded border border-line text-xs flex items-center justify-between gap-3"
                      >
                        <div className="space-y-1">
                          <div className="font-semibold text-ink flex items-center gap-1.5">
                            <span className="font-mono text-amber-400">{res.LogicalResourceId}</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-surface border border-line text-muted">
                              {res.ResourceType}
                            </span>
                          </div>
                          {res.PhysicalResourceId && (
                            <div className="text-[11px] font-mono text-muted truncate max-w-sm">
                              Physical ID: {res.PhysicalResourceId}
                            </div>
                          )}
                        </div>
                        <div className="shrink-0">{getStatusBadge(res.ResourceStatus)}</div>
                      </div>
                    ))
                  )}
                </div>
              ) : activeTab === "events" ? (
                <div className="space-y-2">
                  {stackEvents.length === 0 ? (
                    <div className="py-8 text-center text-muted text-xs">No stack events recorded.</div>
                  ) : (
                    stackEvents.map((ev) => (
                      <div
                        key={ev.EventId || `${ev.LogicalResourceId}-${ev.Timestamp}`}
                        className="p-3 bg-subtle rounded border border-line text-xs space-y-1.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-ink font-mono">{ev.LogicalResourceId}</span>
                          {getStatusBadge(ev.ResourceStatus)}
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-muted">
                          <span className="font-mono">{ev.ResourceType}</span>
                          <span>{ev.Timestamp ? new Date(ev.Timestamp).toLocaleTimeString() : ""}</span>
                        </div>
                        {ev.ResourceStatusReason && (
                          <div className="text-[11px] text-muted bg-surface/60 p-2 rounded border border-line/50">
                            {ev.ResourceStatusReason}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              ) : activeTab === "template" ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted font-medium">Template Specification</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(stackTemplate, "tpl")}
                      className="px-2 py-1 text-[11px] bg-subtle border border-line rounded text-muted hover:text-ink flex items-center gap-1"
                    >
                      {copied === "tpl" ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                      <span>{copied === "tpl" ? "Copied" : "Copy"}</span>
                    </button>
                  </div>
                  <pre className="p-3 bg-subtle rounded border border-line font-mono text-[11px] text-ink overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-96">
                    {stackTemplate || "No template source available for this stack."}
                  </pre>
                </div>
              ) : (
                <div className="space-y-3 text-xs">
                  <div className="p-3 bg-subtle rounded border border-line space-y-2">
                    <div className="font-semibold text-ink">Stack Information</div>
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div>
                        <span className="text-muted block">Created:</span>
                        <span className="text-ink font-mono">
                          {stackDetail?.CreationTime
                            ? new Date(stackDetail.CreationTime).toLocaleString()
                            : "—"}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted block">Status:</span>
                        <span className="text-ink font-mono">{stackDetail?.StackStatus || "—"}</span>
                      </div>
                    </div>
                  </div>

                  {stackDetail?.Parameters && stackDetail.Parameters.length > 0 && (
                    <div className="p-3 bg-subtle rounded border border-line space-y-2">
                      <div className="font-semibold text-ink">Parameters</div>
                      <div className="space-y-1">
                        {stackDetail.Parameters.map((p: any) => (
                          <div key={p.ParameterKey} className="flex justify-between font-mono text-[11px]">
                            <span className="text-muted">{p.ParameterKey}:</span>
                            <span className="text-amber-400">{p.ParameterValue}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {stackDetail?.Outputs && stackDetail.Outputs.length > 0 && (
                    <div className="p-3 bg-subtle rounded border border-line space-y-2">
                      <div className="font-semibold text-ink">Outputs</div>
                      <div className="space-y-1">
                        {stackDetail.Outputs.map((o: any) => (
                          <div key={o.OutputKey} className="font-mono text-[11px]">
                            <div className="text-emerald-400 font-semibold">{o.OutputKey}</div>
                            <div className="text-ink break-all">{o.OutputValue}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Deploy / Create Stack Modal */}
      {isCreateOpen &&
        mounted &&
        createPortal(
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[99999] flex items-center justify-center p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) setIsCreateOpen(false);
            }}
          >
            <div className="bg-surface border border-line rounded-panel w-full max-w-2xl p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between pb-3 border-b border-line">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <Boxes size={18} />
                  </div>
                  <div>
                    <h3 className="font-bold text-ink text-base">Create CloudFormation Stack</h3>
                    <p className="text-[11px] text-muted">Deploy infrastructure resources via template</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="p-1 text-muted hover:text-ink rounded"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleCreateStack} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1.5">Stack Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="my-infrastructure-stack"
                    value={newStackName}
                    onChange={(e) => setNewStackName(e.target.value)}
                    className="w-full px-3 py-2 bg-subtle border border-line rounded-control text-xs text-ink placeholder:text-muted focus:outline-none focus:border-amber-500/50"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-ink">Template Presets</label>
                    <span className="text-[10px] text-muted">Choose a template to load</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {SAMPLE_TEMPLATES.map((tmpl) => (
                      <button
                        key={tmpl.name}
                        type="button"
                        onClick={() => setNewTemplateBody(tmpl.body)}
                        className="p-2.5 bg-subtle hover:bg-subtle/80 border border-line hover:border-amber-500/40 rounded-control text-left transition-colors cursor-pointer"
                      >
                        <div className="text-xs font-semibold text-ink">{tmpl.name}</div>
                        <div className="text-[10px] text-muted mt-0.5 leading-tight">{tmpl.description}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-ink">Template Source (YAML / JSON) *</label>
                    <span className="text-[10px] text-muted">Floci v2.4 supports 160+ resource types</span>
                  </div>
                  <textarea
                    rows={12}
                    required
                    value={newTemplateBody}
                    onChange={(e) => setNewTemplateBody(e.target.value)}
                    className="w-full px-3 py-2 bg-subtle border border-line rounded-control text-xs font-mono text-ink leading-relaxed focus:outline-none focus:border-amber-500/50"
                    placeholder="AWSTemplateFormatVersion: '2010-09-09'..."
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-line">
                  <button
                    type="button"
                    onClick={() => setIsCreateOpen(false)}
                    className="px-4 py-2 text-xs text-muted hover:text-ink rounded-control"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 text-xs font-semibold bg-action text-white hover:opacity-90 rounded-control flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {submitting && <RefreshCw size={13} className="animate-spin" />}
                    <span>{submitting ? "Deploying Stack..." : "Deploy Stack"}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* Delete Confirmation Modal */}
      {deleteTarget &&
        mounted &&
        createPortal(
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[99999] flex items-center justify-center p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) setDeleteTarget(null);
            }}
          >
            <div className="bg-surface border border-line rounded-panel w-full max-w-md p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20 shrink-0">
                  <Trash2 size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-ink text-sm">Delete CloudFormation Stack</h3>
                  <p className="text-xs text-muted">
                    Are you sure you want to delete stack <span className="font-mono text-ink">{deleteTarget}</span>?
                  </p>
                </div>
              </div>

              <p className="text-xs text-muted leading-relaxed">
                This will trigger stack deprovisioning in Floci. Associated resources (buckets, queues, tables) will be deleted.
              </p>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-line">
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  className="px-4 py-2 text-xs text-muted hover:text-ink rounded-control"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteStack}
                  disabled={deleting}
                  className="px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-control flex items-center gap-1.5 disabled:opacity-50"
                >
                  {deleting && <RefreshCw size={13} className="animate-spin" />}
                  <span>{deleting ? "Deleting..." : "Delete Stack"}</span>
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
