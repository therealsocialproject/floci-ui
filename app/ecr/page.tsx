"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Package,
  RefreshCw,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  X,
  Copy,
  Check,
} from "lucide-react";
import { useEndpoint } from "@/components/EndpointProvider";
import { useCloudTheme } from "@/components/CloudThemeContext";

export default function ECRPage() {
  const { endpoint, isConnected } = useEndpoint();
  const { serviceLabels } = useCloudTheme();

  const [repos, setRepos] = useState<any[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null);
  const [images, setImages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [copiedUri, setCopiedUri] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ msg: string; isError?: boolean } | null>(null);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [repoName, setRepoName] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  const notify = (msg: string, isError = false) => {
    setNotification({ msg, isError });
    setTimeout(() => setNotification(null), 4000);
  };

  const loadRepos = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/floci/ecr?endpoint=${encodeURIComponent(endpoint)}`);
      const data = await res.json();
      if (res.ok) {
        const list = data.repositories || [];
        setRepos(list);
        if (list.length > 0 && !selectedRepo) setSelectedRepo(list[0].repositoryName);
      } else {
        notify(data.error || "Failed to load ECR repositories", true);
      }
    } catch (e: any) {
      notify(e.message || "Failed to load ECR repositories", true);
    } finally {
      setLoading(false);
    }
  };

  const loadImages = async (name: string) => {
    try {
      const res = await fetch(
        `/api/floci/ecr?endpoint=${encodeURIComponent(endpoint)}&action=images&repositoryName=${encodeURIComponent(name)}`
      );
      const data = await res.json();
      if (res.ok) setImages(data.images || []);
    } catch {
      setImages([]);
    }
  };

  useEffect(() => {
    if (isConnected) loadRepos();
  }, [endpoint, isConnected]);

  useEffect(() => {
    if (isConnected && selectedRepo) loadImages(selectedRepo);
  }, [endpoint, isConnected, selectedRepo]);

  const postAction = async (payload: Record<string, any>, successMsg: string) => {
    try {
      const res = await fetch(`/api/floci/ecr?endpoint=${encodeURIComponent(endpoint)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        notify(successMsg);
        loadRepos();
        if (selectedRepo) loadImages(selectedRepo);
        return true;
      }
      notify(data.error || "Operation failed", true);
      return false;
    } catch (e: any) {
      notify(e.message || "Operation failed", true);
      return false;
    }
  };

  return (
    <div className="space-y-6">
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg border shadow-lg text-sm font-medium ${
            notification.isError
              ? "bg-red-500/15 border-red-500/40 text-red-300"
              : "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
          }`}
        >
          {notification.isError ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
          <span>{notification.msg}</span>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2.5">
            <Package className="text-primary" size={24} />
            <span>{serviceLabels.ecr}</span>
          </h1>
          <p className="text-sm text-muted mt-1">
            Manage local container image repositories, tags, and digests.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsCreateOpen(true)}
            className="px-3 py-2 rounded-lg text-xs font-semibold bg-primary hover:opacity-90 text-white flex items-center gap-1.5 cursor-pointer"
          >
            <Plus size={14} /> Create Repository
          </button>
          <button
            onClick={loadRepos}
            className="p-2 rounded-lg bg-surface border border-line hover:bg-surface-hover cursor-pointer"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-surface border border-line rounded-panel p-4 space-y-3">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted">
            Repositories ({repos.length})
          </div>
          {repos.length === 0 ? (
            <div className="text-xs text-muted py-6 text-center">No repositories found.</div>
          ) : (
            <div className="space-y-2">
              {repos.map((r) => (
                <div
                  key={r.repositoryName}
                  onClick={() => setSelectedRepo(r.repositoryName)}
                  className={`p-3 rounded-lg border cursor-pointer ${
                    selectedRepo === r.repositoryName
                      ? "bg-primary/10 border-primary"
                      : "bg-background border-line hover:border-primary/40"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-xs truncate">{r.repositoryName}</span>
                    <div className="flex items-center gap-1.5">
                      {r.repositoryUri && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigator.clipboard.writeText(r.repositoryUri);
                            setCopiedUri(r.repositoryName);
                            setTimeout(() => setCopiedUri(null), 1500);
                          }}
                          className="text-muted hover:text-primary"
                          title="Copy URI"
                        >
                          {copiedUri === r.repositoryName ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Delete repository "${r.repositoryName}"?`)) {
                            postAction({ action: "delete_repository", repositoryName: r.repositoryName }, "Repository deleted").then(
                              (ok) => ok && selectedRepo === r.repositoryName && setSelectedRepo(null)
                            );
                          }
                        }}
                        className="text-muted hover:text-red-400"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                  <div className="text-[10px] font-mono text-muted truncate mt-1">{r.repositoryUri}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-2 bg-surface border border-line rounded-panel overflow-hidden">
          <div className="p-4 border-b border-line text-sm font-semibold">
            Images {selectedRepo ? `in ${selectedRepo}` : ""} ({images.length})
          </div>
          <table className="w-full text-left text-xs">
            <thead className="bg-background/50 border-b border-line text-muted uppercase">
              <tr>
                <th className="px-4 py-3">Tags</th>
                <th className="px-4 py-3">Digest</th>
                <th className="px-4 py-3">Size</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {images.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted">
                    No images pushed to this repository yet.
                  </td>
                </tr>
              ) : (
                images.map((img, i) => (
                  <tr key={img.imageDigest || i}>
                    <td className="px-4 py-3 font-medium">
                      {(img.imageTags || ["<untagged>"]).map((tag: string) => (
                        <span key={tag} className="mr-1 px-2 py-0.5 rounded bg-primary/15 text-primary text-[10px] font-mono">
                          {tag}
                        </span>
                      ))}
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-muted">
                      {(img.imageDigest || "").slice(0, 22)}...
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {img.imageSizeInBytes ? `${(img.imageSizeInBytes / 1024 / 1024).toFixed(1)} MB` : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() =>
                          postAction(
                            { action: "delete_image", repositoryName: selectedRepo, imageDigest: img.imageDigest },
                            "Image deleted"
                          )
                        }
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {mounted && isCreateOpen &&
        createPortal(
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-surface border border-line rounded-panel w-full max-w-md p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold">Create ECR Repository</h2>
                <button onClick={() => setIsCreateOpen(false)} className="text-muted"><X size={18} /></button>
              </div>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const ok = await postAction(
                    { action: "create_repository", repositoryName: repoName.trim() },
                    `Repository "${repoName}" created`
                  );
                  if (ok) { setRepoName(""); setIsCreateOpen(false); }
                }}
                className="space-y-4"
              >
                <input required value={repoName} onChange={(e) => setRepoName(e.target.value)} placeholder="my-org/backend-api" className="w-full px-3 py-2 rounded-lg bg-background border border-line text-sm" />
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setIsCreateOpen(false)} className="px-3 py-1.5 rounded-lg border border-line text-xs">Cancel</button>
                  <button type="submit" className="px-4 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold">Create</button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
