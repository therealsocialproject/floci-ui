"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Server,
  RefreshCw,
  Play,
  Square,
  Trash2,
  Shield,
  Tag,
  Key,
  Globe,
  Lock,
  Plus,
  X,
  AlertCircle,
  CheckCircle2,
  Terminal,
  Cpu,
  Maximize2,
  Camera,
  HardDrive,
  Copy,
  Check,
  ExternalLink,
  Layers,
  Settings2,
  ArrowRight,
  ChevronRight,
  Archive,
  Search,
  ChevronDown,
} from "lucide-react";
import { InstanceDetails } from "@/components/InstanceDetails";
import { useEndpoint } from "@/components/EndpointProvider";
import { useCloudTheme } from "@/components/CloudThemeContext";

export default function EC2Page() {
  const { endpoint, isConnected } = useEndpoint();
  const { cloudMode, serviceLabels } = useCloudTheme();
  const [instances, setInstances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null);
  useEffect(() => { setSelectedInstanceId(null); }, [endpoint]);
  const [instanceSearch, setInstanceSearch] = useState("");
  const [stateFilter, setStateFilter] = useState("all");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // Launch modal state
  const [isLaunchModalOpen, setIsLaunchModalOpen] = useState(false);
  const [instanceName, setInstanceName] = useState("");
  const [instanceType, setInstanceType] = useState(cloudMode === "gcp" ? "e2-micro" : "t3.micro");
  const [workloadTag, setWorkloadTag] = useState("web-server");
  const [imageId, setImageId] = useState("ami-12345678");

  // Firewall / Security Group modal state
  const [isFirewallModalOpen, setIsFirewallModalOpen] = useState(false);
  const [activeSecurityGroup, setActiveSecurityGroup] = useState<any>(null);
  const [securityGroupDetails, setSecurityGroupDetails] = useState<any>(null);
  const [loadingRules, setLoadingRules] = useState(false);
  const [newRule, setNewRule] = useState({
    ipProtocol: "tcp",
    fromPort: "80",
    toPort: "80",
    cidrIp: "0.0.0.0/0",
  });

  // Resize instance modal state
  const [isResizeModalOpen, setIsResizeModalOpen] = useState(false);
  const [resizeTargetInstance, setResizeTargetInstance] = useState<any>(null);
  const [targetInstanceType, setTargetInstanceType] = useState("t3.small");
  const [autoStopForResize, setAutoStopForResize] = useState(true);

  // Connect & Console modal state
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [connectInstance, setConnectInstance] = useState<any>(null);
  const [connectTab, setConnectTab] = useState<"ssh" | "console">("ssh");
  const [copiedSSH, setCopiedSSH] = useState(false);
  const [terminalHistory, setTerminalHistory] = useState<Array<{ cmd: string; output: string; time: string }>>([
    {
      cmd: "systemctl status cloud-init",
      output: "● cloud-init.service - Initial Cloud-Init Job\n   Loaded: loaded (/usr/lib/systemd/system/cloud-init.service; enabled)\n   Active: active (exited) - System initialized successfully.",
      time: "10:00:01",
    },
  ]);
  const [terminalInput, setTerminalInput] = useState("");

  // Create Backup (AMI) modal state
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [backupTargetInstance, setBackupTargetInstance] = useState<any>(null);
  const [backupName, setBackupName] = useState("");
  const [backupDescription, setBackupDescription] = useState("");

  // AMIs & Backups Drawer state
  const [isBackupsDrawerOpen, setIsBackupsDrawerOpen] = useState(false);
  const [imagesList, setImagesList] = useState<any[]>([]);
  const [loadingImages, setLoadingImages] = useState(false);

  // Attached Volumes modal state
  const [isVolumesModalOpen, setIsVolumesModalOpen] = useState(false);
  const [volumesTargetInstance, setVolumesTargetInstance] = useState<any>(null);
  const [attachedVolumes, setAttachedVolumes] = useState<any[]>([]);
  const [loadingVolumes, setLoadingVolumes] = useState(false);

  // Notifications
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const isAws = cloudMode === "aws";

  useEffect(() => {
    setMounted(true);
  }, []);

  const dialogOpen = isLaunchModalOpen || isFirewallModalOpen || isResizeModalOpen || isConnectModalOpen || isBackupModalOpen || isBackupsDrawerOpen || isVolumesModalOpen;
  useEffect(() => {
    if (!dialogOpen) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const dialog = document.querySelector<HTMLElement>(".ec2-dialog");
    const focusable = () => Array.from(dialog?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], summary') || []).filter(el => el.getClientRects().length > 0);
    focusable()[0]?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsLaunchModalOpen(false); setIsFirewallModalOpen(false); setIsResizeModalOpen(false); setIsConnectModalOpen(false); setIsBackupModalOpen(false); setIsBackupsDrawerOpen(false); setIsVolumesModalOpen(false);
      }
      if (event.key === "Tab") {
        const items = focusable();
        const first = items[0], last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => { document.removeEventListener("keydown", onKeyDown); previousFocus?.focus(); };
  }, [dialogOpen]);

  const showNotification = (msg: string, isError = false) => {
    if (isError) {
      setErrorMessage(msg);
      setTimeout(() => setErrorMessage(null), 5000);
    } else {
      setSuccessMessage(msg);
      setTimeout(() => setSuccessMessage(null), 4000);
    }
  };

  const fetchInstances = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/floci/ec2?endpoint=${encodeURIComponent(endpoint)}`);
      const json = await res.json();
      if (json.success) {
        setInstances(json.data || []);
      }
    } catch (e: any) {
      console.error(e);
      showNotification(e.message || "Failed to fetch instances", true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isConnected) {
      fetchInstances();
    }
  }, [endpoint, isConnected]);

  const handleAction = async (action: string, instanceId: string) => {
    if (action === "terminate") {
      if (!confirm(`Are you sure you want to terminate instance ${instanceId}? This will permanently delete the instance.`)) {
        return;
      }
    }

    setActionLoading(`${action}-${instanceId}`);
    try {
      const res = await fetch("/api/floci/ec2", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, instanceId, endpoint }),
      });
      const json = await res.json();
      if (json.success) {
        showNotification(`Instance ${action}ed successfully`);
        await fetchInstances();
      } else {
        showNotification(json.error || `Failed to ${action} instance`, true);
      }
    } catch (e: any) {
      console.error(e);
      showNotification(e.message || "Network error", true);
    } finally {
      setActionLoading(null);
    }
  };

  const handleLaunch = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading("launch");

    try {
      const res = await fetch("/api/floci/ec2", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "launch",
          name: instanceName.trim(),
          instanceType,
          workload: workloadTag.trim(),
          imageId: imageId.trim(),
          endpoint,
        }),
      });
      const json = await res.json();
      if (json.success) {
        showNotification("Instance launched successfully!");
        setInstanceName("");
        setIsLaunchModalOpen(false);
        await fetchInstances();
      } else {
        showNotification(json.error || "Failed to launch instance", true);
      }
    } catch (err: any) {
      showNotification(err.message || "Network error", true);
    } finally {
      setActionLoading(null);
    }
  };

  const instanceTypes = isAws
    ? [
        { id: "t3.nano", label: "t3.nano (2 vCPU, 0.5 GB RAM) - General Purpose" },
        { id: "t3.micro", label: "t3.micro (2 vCPU, 1 GB RAM) - Standard Free Tier" },
        { id: "t3.small", label: "t3.small (2 vCPU, 2 GB RAM) - General Purpose" },
        { id: "t3.medium", label: "t3.medium (2 vCPU, 4 GB RAM) - Recommended Dev" },
        { id: "t3.large", label: "t3.large (2 vCPU, 8 GB RAM) - Production Workloads" },
        { id: "c5.large", label: "c5.large (2 vCPU, 4 GB RAM) - Compute Optimized" },
        { id: "c5.2xlarge", label: "c5.2xlarge (8 vCPU, 16 GB RAM) - High Throughput" },
        { id: "r6g.large", label: "r6g.large (2 vCPU, 16 GB RAM) - Memory Optimized" },
      ]
    : [
        { id: "e2-micro", label: "e2-micro (2 vCPU, 1 GB RAM) - Cost Optimized" },
        { id: "e2-small", label: "e2-small (2 vCPU, 2 GB RAM) - Light Workload" },
        { id: "e2-medium", label: "e2-medium (2 vCPU, 4 GB RAM) - Standard Dev" },
        { id: "e2-standard-4", label: "e2-standard-4 (4 vCPU, 16 GB RAM) - General" },
        { id: "n2-highmem-8", label: "n2-highmem-8 (8 vCPU, 64 GB RAM) - In-Memory DB" },
        { id: "c2-standard-4", label: "c2-standard-4 (4 vCPU, 16 GB RAM) - Compute" },
      ];

  // --- Security Groups & Firewall Handlers ---
  const fetchSecurityGroupRules = async (groupId: string) => {
    setLoadingRules(true);
    try {
      const res = await fetch(
        `/api/floci/ec2?endpoint=${encodeURIComponent(endpoint)}&view=security_groups&groupId=${groupId}`
      );
      const json = await res.json();
      if (json.success && json.data && json.data.length > 0) {
        setSecurityGroupDetails(json.data[0]);
      }
    } catch (e: any) {
      showNotification(e.message || "Failed to fetch firewall rules", true);
    } finally {
      setLoadingRules(false);
    }
  };

  const handleOpenFirewall = (sg: any) => {
    setActiveSecurityGroup(sg);
    setIsFirewallModalOpen(true);
    fetchSecurityGroupRules(sg.groupId);
  };

  const handleAddRule = async (e?: React.FormEvent, customPreset?: any) => {
    if (e) e.preventDefault();
    if (!activeSecurityGroup) return;

    const ruleData = customPreset || newRule;
    setActionLoading("add-rule");

    try {
      const res = await fetch("/api/floci/ec2", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "authorize_security_group_ingress",
          endpoint,
          groupId: activeSecurityGroup.groupId,
          ipProtocol: ruleData.ipProtocol,
          fromPort: ruleData.fromPort,
          toPort: ruleData.toPort,
          cidrIp: ruleData.cidrIp,
        }),
      });
      const json = await res.json();
      if (json.success) {
        showNotification(`Firewall rule added for port ${ruleData.fromPort}`);
        await fetchSecurityGroupRules(activeSecurityGroup.groupId);
      } else {
        showNotification(json.error || "Failed to add firewall rule", true);
      }
    } catch (e: any) {
      showNotification(e.message || "Network error", true);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRevokeRule = async (rule: any, cidr: string) => {
    if (!activeSecurityGroup) return;
    setActionLoading(`revoke-${rule.FromPort}`);

    try {
      const res = await fetch("/api/floci/ec2", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "revoke_security_group_ingress",
          endpoint,
          groupId: activeSecurityGroup.groupId,
          ipProtocol: rule.IpProtocol,
          fromPort: rule.FromPort,
          toPort: rule.ToPort,
          cidrIp: cidr,
        }),
      });
      const json = await res.json();
      if (json.success) {
        showNotification(`Revoked firewall rule port ${rule.FromPort}`);
        await fetchSecurityGroupRules(activeSecurityGroup.groupId);
      } else {
        showNotification(json.error || "Failed to revoke rule", true);
      }
    } catch (e: any) {
      showNotification(e.message || "Network error", true);
    } finally {
      setActionLoading(null);
    }
  };

  // --- Resize Instance Handlers ---
  const handleOpenResize = (inst: any) => {
    setResizeTargetInstance(inst);
    setTargetInstanceType(inst.instanceType || (isAws ? "t3.medium" : "e2-medium"));
    setIsResizeModalOpen(true);
  };

  const handleResizeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resizeTargetInstance) return;

    const instanceId = resizeTargetInstance.instanceId;
    const isCurrentlyRunning = resizeTargetInstance.state === "running";
    setActionLoading("resize");

    try {
      if (isCurrentlyRunning && autoStopForResize) {
        showNotification("Stopping instance before resizing...");
        await fetch("/api/floci/ec2", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "stop", instanceId, endpoint }),
        });
        await new Promise((r) => setTimeout(r, 1000));
      }

      const res = await fetch("/api/floci/ec2", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "modify_instance_type",
          instanceId,
          instanceType: targetInstanceType,
          endpoint,
        }),
      });
      const json = await res.json();

      if (json.success) {
        if (isCurrentlyRunning && autoStopForResize) {
          showNotification("Restarting resized instance...");
          await fetch("/api/floci/ec2", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "start", instanceId, endpoint }),
          });
        }
        showNotification(`Instance resized to ${targetInstanceType} successfully!`);
        setIsResizeModalOpen(false);
        await fetchInstances();
      } else {
        showNotification(json.error || "Failed to resize instance", true);
      }
    } catch (e: any) {
      showNotification(e.message || "Network error", true);
    } finally {
      setActionLoading(null);
    }
  };

  // --- Instance Connect & Console Handlers ---
  const handleOpenConnect = (inst: any) => {
    setConnectInstance(inst);
    setConnectTab("ssh");
    setIsConnectModalOpen(true);
  };

  const handleRunTerminalCommand = (cmdText?: string) => {
    const cmd = (cmdText || terminalInput).trim();
    if (!cmd) return;

    let simulatedOutput = "";
    const now = new Date().toTimeString().split(" ")[0];
    const instName = connectInstance?.tags?.Name || connectInstance?.instanceId || "node";

    if (cmd === "clear") {
      setTerminalHistory([]);
      setTerminalInput("");
      return;
    } else if (cmd === "uptime") {
      simulatedOutput = ` 10:48:12 up 8 days, 14:22, 1 user, load average: 0.12, 0.08, 0.05`;
    } else if (cmd === "uname -a") {
      simulatedOutput = `Linux ${instName} 6.8.0-139-generic #139-Ubuntu SMP PREEMPT_DYNAMIC x86_64 GNU/Linux`;
    } else if (cmd === "df -h") {
      simulatedOutput = `Filesystem      Size  Used Avail Use% Mounted on\n/dev/xvda1       20G  4.2G   16G  21% /\ndevtmpfs        1.9G     0  1.9G   0% /dev\ntmpfs           2.0G     0  2.0G   0% /dev/shm`;
    } else if (cmd === "top" || cmd.startsWith("ps")) {
      simulatedOutput = `USER         PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND\nroot           1  0.0  0.1  22556  4120 ?        Ss   02:00   0:01 /sbin/init\nroot          84  0.1  0.8 142104 18200 ?        Ssl  02:01   0:14 node-service\nec2-user     102  0.0  0.2  11244  3200 pts/0    R+   10:48   0:00 ps aux`;
    } else if (cmd.includes("curl") || cmd.includes("netstat")) {
      simulatedOutput = `HTTP/1.1 200 OK\nServer: nginx/1.24.0\nContent-Type: application/json\nContent-Length: 42\n\n{"status":"healthy","workload":"active"}`;
    } else if (cmd.includes("os-release")) {
      simulatedOutput = `NAME="Amazon Linux"\nVERSION="2023"\nID="amzn"\nVERSION_ID="2023"\nPRETTY_NAME="Amazon Linux 2023.5.20240903"`;
    } else {
      simulatedOutput = `[floci-cloud-exec]: Command '${cmd}' executed successfully (exit status 0).`;
    }

    setTerminalHistory((prev) => [...prev, { cmd, output: simulatedOutput, time: now }]);
    setTerminalInput("");
  };

  // --- Backups & Snapshots (AMIs) Handlers ---
  const fetchImages = async () => {
    setLoadingImages(true);
    try {
      const res = await fetch(`/api/floci/ec2?endpoint=${encodeURIComponent(endpoint)}&view=images`);
      const json = await res.json();
      if (json.success) {
        setImagesList(json.data || []);
      }
    } catch (e: any) {
      showNotification(e.message || "Failed to fetch images", true);
    } finally {
      setLoadingImages(false);
    }
  };

  const handleOpenBackupsDrawer = () => {
    setIsBackupsDrawerOpen(true);
    fetchImages();
  };

  const handleOpenCreateBackup = (inst: any) => {
    setBackupTargetInstance(inst);
    const defaultName = `backup-${inst.tags?.Name || inst.instanceId}-${Date.now().toString().slice(-4)}`;
    setBackupName(defaultName);
    setBackupDescription(`Manual snapshot backup of ${inst.instanceId}`);
    setIsBackupModalOpen(true);
  };

  const handleCreateBackupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!backupTargetInstance) return;

    setActionLoading("create-backup");
    try {
      const res = await fetch("/api/floci/ec2", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_image",
          instanceId: backupTargetInstance.instanceId,
          name: backupName.trim(),
          description: backupDescription.trim(),
          endpoint,
        }),
      });
      const json = await res.json();
      if (json.success) {
        showNotification(`AMI Backup created successfully! (${json.result?.ImageId || "ami"})`);
        setIsBackupModalOpen(false);
        fetchImages();
      } else {
        showNotification(json.error || "Failed to create backup image", true);
      }
    } catch (e: any) {
      showNotification(e.message || "Network error", true);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeregisterImage = async (imgId: string) => {
    if (!confirm(`Deregister / delete backup image ${imgId}?`)) return;

    setActionLoading(`deregister-${imgId}`);
    try {
      const res = await fetch("/api/floci/ec2", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "deregister_image",
          imageId: imgId,
          endpoint,
        }),
      });
      const json = await res.json();
      if (json.success) {
        showNotification(`Backup image ${imgId} deregistered.`);
        await fetchImages();
      } else {
        showNotification(json.error || "Failed to deregister image", true);
      }
    } catch (e: any) {
      showNotification(e.message || "Network error", true);
    } finally {
      setActionLoading(null);
    }
  };

  // --- Volumes Handlers ---
  const handleOpenVolumes = async (inst: any) => {
    setVolumesTargetInstance(inst);
    setIsVolumesModalOpen(true);
    setLoadingVolumes(true);
    try {
      const res = await fetch(
        `/api/floci/ec2?endpoint=${encodeURIComponent(endpoint)}&view=volumes&instanceId=${inst.instanceId}`
      );
      const json = await res.json();
      if (json.success) {
        setAttachedVolumes(json.data || []);
      }
    } catch (e: any) {
      showNotification(e.message || "Failed to fetch volumes", true);
    } finally {
      setLoadingVolumes(false);
    }
  };

  const filteredInstances = instances.filter((inst) => {
    const text = [inst.instanceId, inst.tags?.Name, inst.tags?.name, inst.publicIp, inst.privateIp, inst.instanceType, inst.tags?.MachineType].filter(Boolean).join(" ").toLowerCase();
    return text.includes(instanceSearch.toLowerCase()) && (stateFilter === "all" || inst.state === stateFilter);
  });

  const selectedInstance = filteredInstances.find(inst => inst.instanceId === selectedInstanceId);

  return (
    <div className={`space-y-6 resource-page ec2-workspace ${selectedInstance ? "has-instance-selection" : ""}`}>
      <div className="console-breadcrumb"><a href="/">Console home</a><ChevronRight size={14} /><span>{isAws ? "EC2" : "Compute Engine"}</span><ChevronRight size={14} />{isAws ? "Instances" : "VM instances"}</div>
      {/* Toast Notifications */}
      {errorMessage && (
        <div className="fixed top-20 right-6 z-50 flex items-center gap-2 bg-danger-soft border border-rose-500/50 text-danger px-4 py-3 rounded-control shadow-2xl backdrop-blur-md text-xs">
          <AlertCircle className="w-4 h-4 text-danger shrink-0" />
          <span>{errorMessage}</span>
          <button onClick={() => setErrorMessage(null)} className="ml-2 text-danger hover:text-danger">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
      {successMessage && (
        <div className="fixed top-20 right-6 z-50 flex items-center gap-2 bg-success-soft border border-emerald-500/50 text-success px-4 py-3 rounded-control shadow-2xl backdrop-blur-md text-xs">
          <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
          <span>{successMessage}</span>
          <button onClick={() => setSuccessMessage(null)} className="ml-2 text-success hover:text-emerald-100">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-ink flex items-center gap-3">
            <Server className={`w-6 h-6 ${isAws ? "text-accent" : "text-accent"}`} />
            {isAws ? "Instances" : "VM instances"} <span className="text-muted font-normal">({instances.length})</span>
          </h2>
          <p className="text-sm text-muted mt-1">
            {isAws
              ? "Manage compute, connections, security, and storage in your local environment."
              : "Manage virtual machines, connections, firewall rules, and disks."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={handleOpenBackupsDrawer}
            className="flex items-center gap-2 bg-subtle hover:bg-subtle text-ink border border-line px-3.5 py-2 rounded-control text-xs font-semibold transition-colors"
          >
            <Archive className="w-3.5 h-3.5 text-accent" />
            {isAws ? "Images & backups" : "Machine images"}
          </button>

          <button
            onClick={() => setIsLaunchModalOpen(true)}
            className={`flex items-center gap-2 px-4 py-2 rounded-control text-xs font-semibold text-white transition-all ${
              isAws
                ? "bg-action hover:bg-action shadow-amber-600/20"
                : "bg-action hover:bg-action shadow-blue-600/20"
            }`}
          >
            <Plus className="w-4 h-4" />
            {isAws ? "Launch Instance" : "Create VM Instance"}
          </button>

          <button
            onClick={fetchInstances}
            disabled={loading}
            className="flex items-center gap-2 bg-subtle hover:bg-subtle text-ink border border-line px-4 py-2 rounded-control text-xs font-semibold transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-success" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Instances Table */}
      {loading ? (
        <div className="bg-surface border border-line rounded-panel p-12 text-center text-muted">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-success mb-3" />
          Querying {serviceLabels.instances} from {endpoint}...
        </div>
      ) : instances.length === 0 ? (
        <div className="bg-surface border border-line rounded-panel p-12 text-center text-muted space-y-3">
          <Server className="w-10 h-10 mx-auto text-muted" />
          <p className="font-semibold text-ink">No {serviceLabels.instances} found</p>
          <p className="text-xs text-muted max-w-sm mx-auto">
            Click &apos;{isAws ? "Launch Instance" : "Create VM Instance"}&apos; to deploy your first simulated virtual machine.
          </p>
          <button
            onClick={() => setIsLaunchModalOpen(true)}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-control text-xs font-semibold text-white transition-all ${
              isAws ? "bg-action hover:bg-action" : "bg-action hover:bg-action"
            }`}
          >
            <Plus className="w-3.5 h-3.5" /> Launch Now
          </button>
        </div>
      ) : (
        <div className="bg-surface border border-line rounded-panel">
          <div className="instance-filter-toolbar">
            <label className="instance-search"><Search size={17} /><input aria-label="Find instances" placeholder="Find by name, instance ID, IP, or type" value={instanceSearch} onChange={e => setInstanceSearch(e.target.value)} /></label>
            <select aria-label="Filter by instance state" value={stateFilter} onChange={e => setStateFilter(e.target.value)}><option value="all">All states</option>{Array.from(new Set(instances.map(inst => inst.state))).sort().map(state => <option key={state} value={state}>{state}</option>)}</select>
            <span>{filteredInstances.length} of {instances.length} instances</span>
          </div>
          <div className="instance-list-scroll overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-subtle border-b border-line text-muted uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-6 py-3.5">{isAws ? "Instance ID / Name" : "VM Name / ID"}</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">{isAws ? "Instance Type" : "Machine Type"}</th>
                  <th className="px-6 py-3.5">Network Interfaces</th>
                  <th className="px-6 py-3.5">{isAws ? "Security / IAM" : "Firewall / Identity"}</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filteredInstances.map((inst) => {
                  const isRunning = inst.state === "running";
                  const nameTag = inst.tags?.Name || inst.tags?.name || inst.instanceId;
                  const workloadTag = inst.tags?.Role || inst.tags?.Workload || inst.tags?.workload;

                  return (
                    <tr key={inst.instanceId} className={`instance-selectable-row ${selectedInstanceId === inst.instanceId ? "instance-row-selected" : ""}`} onClick={event => {
                      if ((event.target as HTMLElement).closest("button, input, a, summary, details")) return;
                      setSelectedInstanceId(inst.instanceId);
                    }}>
                      <td className="px-6 py-4">
                        <div className="instance-name-cell"><input type="checkbox" aria-label={`Select instance ${inst.instanceId}`} checked={selectedInstanceId === inst.instanceId} onChange={event => setSelectedInstanceId(event.target.checked ? inst.instanceId : null)} /><button className="text-accent font-semibold text-left hover:underline" aria-expanded={selectedInstanceId === inst.instanceId} onClick={() => setSelectedInstanceId(inst.instanceId)}>{nameTag}</button></div>
                        <div className="font-mono text-[11px] text-muted mt-0.5">{inst.instanceId}</div>
                        {workloadTag && (
                          <div
                            className={`mt-1 inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded border ${
                              isAws
                                ? "text-accent bg-selected border-line"
                                : "text-accent bg-selected border-line"
                            }`}
                          >
                            <Tag className="w-2.5 h-2.5" />
                            {workloadTag}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                            isRunning
                              ? "bg-success-soft text-success border-emerald-500/30"
                              : "bg-subtle text-muted border-line"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isRunning ? "bg-emerald-400 animate-pulse" : "bg-slate-500"
                            }`}
                          />
                          {inst.state}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono text-ink">
                        <button
                          onClick={() => handleOpenResize(inst)}
                          className="inline-flex items-center gap-1.5 hover:text-accent transition-colors group cursor-pointer"
                          title="Click to resize instance type"
                        >
                          <span>{inst.tags?.MachineType || inst.instanceType}</span>
                          <Cpu className="w-3 h-3 text-muted group-hover:text-accent" />
                        </button>
                      </td>
                      <td className="px-6 py-4 space-y-1">
                        <div className="flex items-center gap-1.5 text-ink font-mono">
                          <Globe className="w-3 h-3 text-muted" />
                          <span>External: {inst.publicIp}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-muted font-mono">
                          <Lock className="w-3 h-3 text-muted" />
                          <span>Internal: {inst.privateIp}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 space-y-1.5">
                        {inst.securityGroups?.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5 text-ink">
                            {inst.securityGroups.map((sg: any) => (
                              <button
                                key={sg.groupId}
                                onClick={() => handleOpenFirewall(sg)}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-line bg-subtle hover:border-accent hover:text-accent transition-colors text-[11px] font-mono"
                                title="Click to manage firewall rules"
                              >
                                <Shield className="w-3 h-3 text-accent shrink-0" />
                                <span className="truncate max-w-[140px]">{sg.groupName}</span>
                              </button>
                            ))}
                          </div>
                        )}
                        {(inst.iamInstanceProfile !== "-" || inst.tags?.ServiceAccount) && (
                          <div className="flex items-center gap-1.5 text-muted text-[11px] font-mono truncate max-w-[200px]">
                            <Key className="w-3 h-3 text-success shrink-0" />
                            <span className="truncate">
                              {inst.tags?.ServiceAccount || inst.iamInstanceProfile?.split("/").pop()}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="instance-row-actions">
                          <button onClick={() => handleOpenConnect(inst)} className="instance-connect"><Terminal size={14} />Connect</button>
                          <details className="instance-actions-menu">
                            <summary>Actions<ChevronDown size={13} /></summary>
                            <div className="instance-actions-list" onClick={e => { e.currentTarget.closest("details")?.removeAttribute("open"); }}>
                              <button onClick={() => handleOpenFirewall(inst.securityGroups?.[0] || { groupId: "default", groupName: "default" })}><Shield size={15} />{isAws ? "Security groups" : "Firewall rules"}</button>
                              <button onClick={() => handleOpenResize(inst)}><Cpu size={15} />{isAws ? "Change instance type" : "Change machine type"}</button>
                              <button onClick={() => handleOpenCreateBackup(inst)}><Camera size={15} />{isAws ? "Create image backup" : "Create machine image"}</button>
                              <button onClick={() => handleOpenVolumes(inst)}><HardDrive size={15} />{isAws ? "Attached volumes" : "Attached disks"}</button>
                              <div className="instance-action-divider" />
                              <button onClick={() => handleAction(isRunning ? "stop" : "start", inst.instanceId)} disabled={actionLoading !== null}>{isRunning ? <Square size={15} /> : <Play size={15} />}{isRunning ? "Stop instance" : "Start instance"}</button>
                              <button onClick={() => handleAction("terminate", inst.instanceId)} disabled={actionLoading !== null} className="text-danger"><Trash2 size={15} />{isAws ? "Terminate instance" : "Delete instance"}</button>
                            </div>
                          </details>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredInstances.length === 0 && <tr><td colSpan={6} className="text-center text-muted py-10">No instances match your filters. <button className="text-accent" onClick={() => { setInstanceSearch(""); setStateFilter("all"); }}>Clear filters</button></td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedInstance && <InstanceDetails key={selectedInstance.instanceId} instance={selectedInstance} isAws={isAws}
        onClose={() => setSelectedInstanceId(null)} onConnect={() => handleOpenConnect(selectedInstance)}
        onSecurityGroup={handleOpenFirewall} onVolumes={() => handleOpenVolumes(selectedInstance)} />}

      {/* Launch Instance Modal */}
      {isLaunchModalOpen && mounted && createPortal(
        <div
          className="ec2-dialog-overlay fixed inset-0 bg-black/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsLaunchModalOpen(false);
          }}
        >
          <div role="dialog" aria-modal="true" aria-label="Instance configuration" className="ec2-dialog bg-surface border border-line rounded-panel w-full max-w-md p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div className="flex items-center gap-2">
                <Server className={`w-5 h-5 ${isAws ? "text-accent" : "text-accent"}`} />
                <h3 className="font-bold text-ink text-base">
                  {isAws ? "Launch EC2 Instance" : "Create Compute Instance"}
                </h3>
              </div>
              <button
                onClick={() => setIsLaunchModalOpen(false)}
                aria-label="Close dialog" className="text-muted hover:text-ink p-1 hover:bg-subtle rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleLaunch} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-ink mb-1.5">
                  Instance Name (Tag: Name)
                </label>
                <input
                  type="text"
                  placeholder="e.g. backend-api-01"
                  value={instanceName}
                  onChange={(e) => setInstanceName(e.target.value)}
                  required
                  className="w-full bg-subtle border border-line px-3.5 py-2 rounded-control text-xs text-ink focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink mb-1.5">
                  {isAws ? "Instance Type" : "Machine Type"}
                </label>
                <select
                  value={instanceType}
                  onChange={(e) => setInstanceType(e.target.value)}
                  className="w-full bg-subtle border border-line px-3.5 py-2 rounded-control text-xs text-ink focus:outline-none focus:border-emerald-500 font-mono cursor-pointer"
                >
                  {instanceTypes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink mb-1.5">
                  Workload / Role Tag
                </label>
                <input
                  type="text"
                  placeholder="e.g. web, worker, api"
                  value={workloadTag}
                  onChange={(e) => setWorkloadTag(e.target.value)}
                  className="w-full bg-subtle border border-line px-3.5 py-2 rounded-control text-xs text-ink focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink mb-1.5">
                  Image ID / AMI
                </label>
                <input
                  type="text"
                  value={imageId}
                  onChange={(e) => setImageId(e.target.value)}
                  className="w-full bg-subtle border border-line px-3.5 py-2 rounded-control text-xs text-ink focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsLaunchModalOpen(false)}
                  className="px-4 py-2 text-xs text-muted hover:text-ink rounded-control"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading !== null}
                  className={`px-4 py-2 text-xs font-semibold text-white rounded-control transition-colors flex items-center gap-1.5 ${
                    isAws
                      ? "bg-action hover:bg-action"
                      : "bg-action hover:bg-action"
                  }`}
                >
                  {actionLoading === "launch" ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  Launch Instance
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Firewall & Security Group Rules Modal */}
      {isFirewallModalOpen && mounted && createPortal(
        <div
          className="ec2-dialog-overlay fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsFirewallModalOpen(false);
          }}
        >
          <div role="dialog" aria-modal="true" aria-label="Instance configuration" className="ec2-dialog bg-surface border border-line rounded-panel w-full max-w-2xl p-6 shadow-2xl space-y-5 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-line shrink-0">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-accent" />
                <div>
                  <h3 className="font-bold text-ink text-base">
                    Firewall & Security Rules
                  </h3>
                  <p className="text-xs text-muted font-mono">
                    {activeSecurityGroup?.groupName} ({activeSecurityGroup?.groupId})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsFirewallModalOpen(false)}
                aria-label="Close dialog" className="text-muted hover:text-ink p-1 hover:bg-subtle rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 overflow-y-auto flex-1 pr-1">
              {/* Quick Presets */}
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted mb-2">
                  Quick-Add Port Presets
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { name: "SSH", port: "22", proto: "tcp" },
                    { name: "HTTP", port: "80", proto: "tcp" },
                    { name: "HTTPS", port: "443", proto: "tcp" },
                    { name: "PostgreSQL", port: "5432", proto: "tcp" },
                    { name: "MySQL", port: "3306", proto: "tcp" },
                    { name: "Redis", port: "6379", proto: "tcp" },
                    { name: "MongoDB", port: "27017", proto: "tcp" },
                  ].map((p) => (
                    <button
                      key={p.name}
                      onClick={() =>
                        handleAddRule(undefined, {
                          ipProtocol: p.proto,
                          fromPort: p.port,
                          toPort: p.port,
                          cidrIp: "0.0.0.0/0",
                        })
                      }
                      disabled={actionLoading !== null}
                      className="px-2.5 py-1 text-xs rounded border border-line bg-subtle hover:border-accent hover:text-accent font-mono transition-colors"
                    >
                      + {p.name} ({p.port})
                    </button>
                  ))}
                </div>
              </div>

              {/* Inbound Rules Table */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                    Active Inbound Rules (Ingress)
                  </label>
                  {loadingRules && <RefreshCw className="w-3.5 h-3.5 animate-spin text-accent" />}
                </div>

                <div className="border border-line rounded-control overflow-hidden bg-subtle">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="border-b border-line bg-surface text-muted">
                      <tr>
                        <th className="px-3 py-2">Protocol</th>
                        <th className="px-3 py-2">Port Range</th>
                        <th className="px-3 py-2">Source CIDR</th>
                        <th className="px-3 py-2 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {!securityGroupDetails?.IpPermissions ||
                      securityGroupDetails.IpPermissions.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-3 py-6 text-center text-muted">
                            No inbound rules configured (All ingress blocked)
                          </td>
                        </tr>
                      ) : (
                        securityGroupDetails.IpPermissions.map((rule: any, i: number) => {
                          const portStr =
                            rule.FromPort === rule.ToPort
                              ? `${rule.FromPort || "ALL"}`
                              : `${rule.FromPort}-${rule.ToPort}`;
                          const cidrs =
                            rule.IpRanges?.map((r: any) => r.CidrIp).join(", ") || "0.0.0.0/0";

                          return (
                            <tr key={i} className="hover:bg-surface/50">
                              <td className="px-3 py-2 uppercase text-ink">{rule.IpProtocol}</td>
                              <td className="px-3 py-2 font-semibold text-accent">{portStr}</td>
                              <td className="px-3 py-2 text-muted">{cidrs}</td>
                              <td className="px-3 py-2 text-right">
                                <button
                                  onClick={() => handleRevokeRule(rule, cidrs.split(", ")[0])}
                                  disabled={actionLoading !== null}
                                  className="text-danger hover:text-danger p-1 rounded hover:bg-danger-soft transition-colors"
                                  title="Revoke / Delete Rule"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Add Custom Rule Form */}
              <form onSubmit={handleAddRule} className="p-3 bg-surface border border-line rounded-control space-y-3">
                <div className="text-xs font-semibold text-ink">Add Custom Inbound Rule</div>
                <div className="grid grid-cols-4 gap-2">
                  <div>
                    <label className="block text-[10px] text-muted mb-1">Protocol</label>
                    <select
                      value={newRule.ipProtocol}
                      onChange={(e) => setNewRule({ ...newRule, ipProtocol: e.target.value })}
                      className="w-full bg-subtle border border-line px-2 py-1.5 rounded text-xs text-ink font-mono"
                    >
                      <option value="tcp">TCP</option>
                      <option value="udp">UDP</option>
                      <option value="icmp">ICMP</option>
                      <option value="-1">ALL</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-muted mb-1">From Port</label>
                    <input
                      type="number"
                      value={newRule.fromPort}
                      onChange={(e) => setNewRule({ ...newRule, fromPort: e.target.value })}
                      placeholder="80"
                      className="w-full bg-subtle border border-line px-2 py-1.5 rounded text-xs text-ink font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-muted mb-1">To Port</label>
                    <input
                      type="number"
                      value={newRule.toPort}
                      onChange={(e) => setNewRule({ ...newRule, toPort: e.target.value })}
                      placeholder="80"
                      className="w-full bg-subtle border border-line px-2 py-1.5 rounded text-xs text-ink font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-muted mb-1">CIDR Source</label>
                    <input
                      type="text"
                      value={newRule.cidrIp}
                      onChange={(e) => setNewRule({ ...newRule, cidrIp: e.target.value })}
                      placeholder="0.0.0.0/0"
                      className="w-full bg-subtle border border-line px-2 py-1.5 rounded text-xs text-ink font-mono"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={actionLoading !== null}
                    className="px-3 py-1.5 bg-action hover:bg-action text-white text-xs font-semibold rounded transition-colors flex items-center gap-1.5"
                  >
                    {actionLoading === "add-rule" ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Plus className="w-3.5 h-3.5" />
                    )}
                    Authorize Rule
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Resize Instance Type Modal */}
      {isResizeModalOpen && mounted && createPortal(
        <div
          className="ec2-dialog-overlay fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsResizeModalOpen(false);
          }}
        >
          <div role="dialog" aria-modal="true" aria-label="Instance configuration" className="ec2-dialog bg-surface border border-line rounded-panel w-full max-w-md p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div className="flex items-center gap-2">
                <Cpu className="w-5 h-5 text-accent" />
                <h3 className="font-bold text-ink text-base">Change Instance Type</h3>
              </div>
              <button
                onClick={() => setIsResizeModalOpen(false)}
                aria-label="Close dialog" className="text-muted hover:text-ink p-1 hover:bg-subtle rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleResizeSubmit} className="space-y-4">
              <div className="p-3 bg-subtle rounded-control border border-line text-xs space-y-1 font-mono">
                <div className="text-muted">Target: <span className="text-ink font-semibold">{resizeTargetInstance?.tags?.Name || resizeTargetInstance?.instanceId}</span></div>
                <div className="text-muted">Current Type: <span className="text-accent font-semibold">{resizeTargetInstance?.instanceType}</span></div>
                <div className="text-muted">State: <span className="uppercase text-ink font-semibold">{resizeTargetInstance?.state}</span></div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink mb-1.5">
                  Select New Instance Type
                </label>
                <select
                  value={targetInstanceType}
                  onChange={(e) => setTargetInstanceType(e.target.value)}
                  className="w-full bg-subtle border border-line px-3.5 py-2 rounded-control text-xs text-ink focus:outline-none focus:border-emerald-500 font-mono cursor-pointer"
                >
                  {instanceTypes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              {resizeTargetInstance?.state === "running" && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-control text-xs text-amber-900 space-y-2">
                  <div className="flex items-center gap-1.5 font-semibold">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    Instance is currently running
                  </div>
                  <p className="text-[11px] text-amber-200/80">
                    Modifying instance type requires stopping the instance. Check below to perform automatic stop $\rightarrow$ resize $\rightarrow$ restart.
                  </p>
                  <label className="flex items-center gap-2 cursor-pointer font-medium pt-1 text-ink">
                    <input
                      type="checkbox"
                      checked={autoStopForResize}
                      onChange={(e) => setAutoStopForResize(e.target.checked)}
                      className="rounded border-line"
                    />
                    <span>Automatically stop and restart instance</span>
                  </label>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsResizeModalOpen(false)}
                  className="px-4 py-2 text-xs text-muted hover:text-ink rounded-control"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading !== null}
                  className="px-4 py-2 text-xs font-semibold text-white bg-action hover:bg-action rounded-control transition-colors flex items-center gap-1.5"
                >
                  {actionLoading === "resize" ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Cpu className="w-3.5 h-3.5" />
                  )}
                  Apply New Type
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Connect & Console Modal */}
      {isConnectModalOpen && mounted && createPortal(
        <div
          className="ec2-dialog-overlay fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsConnectModalOpen(false);
          }}
        >
          <div role="dialog" aria-modal="true" aria-label="Instance configuration" className="ec2-dialog bg-surface border border-line rounded-panel w-full max-w-2xl p-6 shadow-2xl space-y-5 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-line shrink-0">
              <div className="flex items-center gap-2">
                <Terminal className="w-5 h-5 text-accent" />
                <div>
                  <h3 className="font-bold text-ink text-base">Instance Connect & Console</h3>
                  <p className="text-xs text-muted font-mono">
                    {connectInstance?.tags?.Name || connectInstance?.instanceId} ({connectInstance?.instanceId})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsConnectModalOpen(false)}
                aria-label="Close dialog" className="text-muted hover:text-ink p-1 hover:bg-subtle rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-line gap-4 text-xs font-semibold shrink-0">
              <button
                onClick={() => setConnectTab("ssh")}
                className={`pb-2 border-b-2 transition-colors flex items-center gap-1.5 ${
                  connectTab === "ssh"
                    ? "border-accent text-accent"
                    : "border-transparent text-muted hover:text-ink"
                }`}
              >
                <Key className="w-3.5 h-3.5" /> SSH & Network Details
              </button>
              <button
                onClick={() => setConnectTab("console")}
                className={`pb-2 border-b-2 transition-colors flex items-center gap-1.5 ${
                  connectTab === "console"
                    ? "border-accent text-accent"
                    : "border-transparent text-muted hover:text-ink"
                }`}
              >
                <Terminal className="w-3.5 h-3.5" /> Web Cloud Terminal
              </button>
            </div>

            {/* Tab 1: SSH Details */}
            {connectTab === "ssh" && (
              <div className="space-y-4 overflow-y-auto pr-1 flex-1">
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1">
                    SSH Connection String
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={`ssh -p 2201 ec2-user@${endpoint.replace(/^https?:\/\//, "").split(":")[0]}`}
                      className="w-full bg-subtle border border-line px-3 py-2 rounded-control text-xs text-ink font-mono select-all"
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(
                          `ssh -p 2201 ec2-user@${endpoint.replace(/^https?:\/\//, "").split(":")[0]}`
                        );
                        setCopiedSSH(true);
                        setTimeout(() => setCopiedSSH(false), 2000);
                      }}
                      className="px-3 py-2 rounded-control bg-subtle border border-line hover:border-accent text-xs text-ink flex items-center gap-1.5 shrink-0 transition-colors"
                    >
                      {copiedSSH ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedSSH ? "Copied" : "Copy"}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-subtle border border-line rounded-control space-y-1.5 font-mono">
                    <div className="text-[11px] text-muted uppercase font-semibold">IP Addresses</div>
                    <div>Public IP: <span className="text-accent">{connectInstance?.publicIp}</span></div>
                    <div>Private IP: <span className="text-ink">{connectInstance?.privateIp}</span></div>
                    <div>Public DNS: <span className="text-muted text-[11px] truncate block">{connectInstance?.publicDns}</span></div>
                  </div>

                  <div className="p-3 bg-subtle border border-line rounded-control space-y-1.5 font-mono">
                    <div className="text-[11px] text-muted uppercase font-semibold">Port Forwarders</div>
                    <div>SSH: <span className="text-accent">Port 2201 &rarr; 22</span></div>
                    <div>Web: <span className="text-ink">Port 30000 &rarr; 80</span></div>
                    <div>SSL: <span className="text-ink">Port 30001 &rarr; 443</span></div>
                  </div>
                </div>

                <div className="p-3 bg-surface border border-line rounded-control text-xs space-y-1">
                  <div className="font-semibold text-ink">Authentication & Key Pairs</div>
                  <p className="text-muted text-[11px]">
                    Floci EC2 instances use containerized host bridging. If password login is prompted, default container password is <span className="font-mono text-accent">root</span> or use your deployed SSH keypair.
                  </p>
                </div>
              </div>
            )}

            {/* Tab 2: Interactive Web Cloud Terminal */}
            {connectTab === "console" && (
              <div className="flex flex-col flex-1 overflow-hidden space-y-2">
                {/* Diagnostic Toolbar */}
                <div className="flex flex-wrap gap-1.5 pb-1">
                  {["uptime", "uname -a", "df -h", "ps aux", "cat /etc/os-release", "curl localhost", "clear"].map(
                    (cmd) => (
                      <button
                        key={cmd}
                        onClick={() => handleRunTerminalCommand(cmd)}
                        className="px-2 py-0.5 text-[11px] font-mono rounded border border-line bg-subtle hover:border-accent hover:text-accent transition-colors"
                      >
                        {cmd}
                      </button>
                    )
                  )}
                </div>

                {/* Terminal Screen */}
                <div className="flex-1 bg-black/90 text-emerald-400 font-mono text-xs p-4 rounded-control border border-line overflow-y-auto space-y-3 min-h-[260px] shadow-inner">
                  {terminalHistory.map((h, i) => (
                    <div key={i} className="space-y-1">
                      <div className="text-slate-400 flex items-center gap-2">
                        <span className="text-emerald-400">ec2-user@{connectInstance?.tags?.Name || "node"}:~$</span>
                        <span className="text-white font-semibold">{h.cmd}</span>
                        <span className="text-[10px] text-slate-600 ml-auto">{h.time}</span>
                      </div>
                      <pre className="text-slate-300 whitespace-pre-wrap pl-2 border-l border-emerald-500/30 text-[11px]">
                        {h.output}
                      </pre>
                    </div>
                  ))}
                </div>

                {/* Terminal Input */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleRunTerminalCommand();
                  }}
                  className="flex items-center gap-2 pt-1"
                >
                  <div className="text-emerald-400 font-mono text-xs shrink-0">&gt;</div>
                  <input
                    type="text"
                    placeholder="Type command (e.g. uptime, uname -a, df -h) and press Enter..."
                    value={terminalInput}
                    onChange={(e) => setTerminalInput(e.target.value)}
                    className="flex-1 bg-subtle border border-line px-3 py-1.5 rounded-control text-xs text-ink font-mono focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-action hover:bg-action text-white text-xs font-semibold rounded-control transition-colors"
                  >
                    Run
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* Create Backup (AMI) Modal */}
      {isBackupModalOpen && mounted && createPortal(
        <div
          className="ec2-dialog-overlay fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsBackupModalOpen(false);
          }}
        >
          <div role="dialog" aria-modal="true" aria-label="Instance configuration" className="ec2-dialog bg-surface border border-line rounded-panel w-full max-w-md p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-accent" />
                <h3 className="font-bold text-ink text-base">Create Instance Backup (AMI)</h3>
              </div>
              <button
                onClick={() => setIsBackupModalOpen(false)}
                aria-label="Close dialog" className="text-muted hover:text-ink p-1 hover:bg-subtle rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateBackupSubmit} className="space-y-4">
              <div className="p-3 bg-subtle rounded-control border border-line text-xs space-y-1 font-mono">
                <div className="text-muted">Instance: <span className="text-ink font-semibold">{backupTargetInstance?.tags?.Name || backupTargetInstance?.instanceId}</span></div>
                <div className="text-muted">Source AMI: <span className="text-accent font-semibold">{backupTargetInstance?.instanceId}</span></div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink mb-1.5">
                  Backup Image Name
                </label>
                <input
                  type="text"
                  value={backupName}
                  onChange={(e) => setBackupName(e.target.value)}
                  required
                  placeholder="e.g. backup-prod-db-v1"
                  className="w-full bg-subtle border border-line px-3.5 py-2 rounded-control text-xs text-ink focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink mb-1.5">
                  Description
                </label>
                <textarea
                  value={backupDescription}
                  onChange={(e) => setBackupDescription(e.target.value)}
                  rows={3}
                  className="w-full bg-subtle border border-line px-3.5 py-2 rounded-control text-xs text-ink focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsBackupModalOpen(false)}
                  className="px-4 py-2 text-xs text-muted hover:text-ink rounded-control"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading !== null}
                  className="px-4 py-2 text-xs font-semibold text-white bg-action hover:bg-action rounded-control transition-colors flex items-center gap-1.5"
                >
                  {actionLoading === "create-backup" ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Camera className="w-3.5 h-3.5" />
                  )}
                  Create Backup
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* AMIs & Backups Drawer */}
      {isBackupsDrawerOpen && mounted && createPortal(
        <div
          className="ec2-dialog-overlay fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsBackupsDrawerOpen(false);
          }}
        >
          <div role="dialog" aria-modal="true" aria-label="Instance configuration" className="ec2-dialog bg-surface border border-line rounded-panel w-full max-w-3xl p-6 shadow-2xl space-y-5 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-line shrink-0">
              <div className="flex items-center gap-2">
                <Archive className="w-5 h-5 text-accent" />
                <div>
                  <h3 className="font-bold text-ink text-base">AMIs & Instance Backups</h3>
                  <p className="text-xs text-muted">Browse snapshots and launch instances from image backups</p>
                </div>
              </div>
              <button
                onClick={() => setIsBackupsDrawerOpen(false)}
                aria-label="Close dialog" className="text-muted hover:text-ink p-1 hover:bg-subtle rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 pr-1">
              {loadingImages ? (
                <div className="p-12 text-center text-muted">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto text-accent mb-2" />
                  Loading snapshot images...
                </div>
              ) : imagesList.length === 0 ? (
                <div className="p-12 text-center text-muted space-y-2">
                  <Camera className="w-8 h-8 mx-auto text-muted" />
                  <p className="font-semibold text-ink">No image backups found</p>
                  <p className="text-xs text-muted">Create a backup from any instance in the table.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {imagesList.map((img: any) => (
                    <div
                      key={img.ImageId}
                      className="p-4 bg-subtle border border-line rounded-panel flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-ink text-sm">{img.Name || "Unnamed AMI"}</span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-success-soft text-success border border-emerald-500/30">
                            {img.State || "available"}
                          </span>
                        </div>
                        <div className="text-accent">{img.ImageId}</div>
                        <div className="text-muted text-[11px]">{img.Description || "No description provided"}</div>
                        <div className="text-muted text-[10px]">Architecture: {img.Architecture} • Created: {img.CreationDate}</div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => {
                            setImageId(img.ImageId);
                            setInstanceName(`restored-${img.Name || "vm"}`);
                            setIsBackupsDrawerOpen(false);
                            setIsLaunchModalOpen(true);
                          }}
                          className="px-3 py-1.5 bg-action hover:bg-action text-white rounded text-xs font-semibold flex items-center gap-1 transition-colors"
                        >
                          <Play className="w-3 h-3" /> Launch VM
                        </button>
                        <button
                          onClick={() => handleDeregisterImage(img.ImageId)}
                          disabled={actionLoading !== null}
                          className="p-1.5 text-danger hover:bg-danger-soft border border-line rounded transition-colors"
                          title="Deregister AMI"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Attached Storage / Volumes Modal */}
      {isVolumesModalOpen && mounted && createPortal(
        <div
          className="ec2-dialog-overlay fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsVolumesModalOpen(false);
          }}
        >
          <div role="dialog" aria-modal="true" aria-label="Instance configuration" className="ec2-dialog bg-surface border border-line rounded-panel w-full max-w-xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div className="flex items-center gap-2">
                <HardDrive className="w-5 h-5 text-accent" />
                <div>
                  <h3 className="font-bold text-ink text-base">Attached Disks & Volumes</h3>
                  <p className="text-xs text-muted font-mono">{volumesTargetInstance?.tags?.Name || volumesTargetInstance?.instanceId}</p>
                </div>
              </div>
              <button
                onClick={() => setIsVolumesModalOpen(false)}
                aria-label="Close dialog" className="text-muted hover:text-ink p-1 hover:bg-subtle rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              {loadingVolumes ? (
                <div className="p-8 text-center text-muted">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto text-accent mb-2" />
                  Loading attached volumes...
                </div>
              ) : attachedVolumes.length === 0 ? (
                <div className="p-8 text-center text-muted">
                  No EBS volumes attached to this instance.
                </div>
              ) : (
                <div className="border border-line rounded-control overflow-hidden bg-subtle font-mono text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-surface border-b border-line text-muted">
                      <tr>
                        <th className="px-3 py-2">Device</th>
                        <th className="px-3 py-2">Volume ID</th>
                        <th className="px-3 py-2">Size</th>
                        <th className="px-3 py-2">Type</th>
                        <th className="px-3 py-2">State</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {attachedVolumes.map((vol: any) => {
                        const device = vol.Attachments?.[0]?.Device || "/dev/xvda";
                        return (
                          <tr key={vol.VolumeId} className="hover:bg-surface/50">
                            <td className="px-3 py-2 font-semibold text-accent">{device}</td>
                            <td className="px-3 py-2 text-ink">{vol.VolumeId}</td>
                            <td className="px-3 py-2">{vol.Size} GiB</td>
                            <td className="px-3 py-2 uppercase">{vol.VolumeType || "gp3"}</td>
                            <td className="px-3 py-2">
                              <span className="px-2 py-0.5 rounded text-[10px] bg-success-soft text-success border border-emerald-500/30">
                                {vol.State}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setIsVolumesModalOpen(false)}
                className="px-4 py-2 text-xs text-muted hover:text-ink rounded-control border border-line hover:bg-subtle"
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
