"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  FolderLock,
  RefreshCw,
  Folder,
  File,
  Plus,
  Trash2,
  UploadCloud,
  X,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { useEndpoint } from "@/components/EndpointProvider";
import { useCloudTheme } from "@/components/CloudThemeContext";

export default function S3Page() {
  const { endpoint, isConnected } = useEndpoint();
  const { cloudMode, serviceLabels } = useCloudTheme();
  const [buckets, setBuckets] = useState<any[]>([]);
  const [selectedBucket, setSelectedBucket] = useState<string | null>(null);
  const [objects, setObjects] = useState<any[]>([]);
  const [loadingBuckets, setLoadingBuckets] = useState(true);
  const [loadingObjects, setLoadingObjects] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Modals & Forms state
  const [isCreateBucketOpen, setIsCreateBucketOpen] = useState(false);
  const [newBucketName, setNewBucketName] = useState("");
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadKey, setUploadKey] = useState("");
  const [uploadContent, setUploadContent] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const isAws = cloudMode === "aws";

  useEffect(() => {
    setMounted(true);
  }, []);

  const showNotification = (msg: string, isError = false) => {
    if (isError) {
      setErrorMessage(msg);
      setTimeout(() => setErrorMessage(null), 5000);
    } else {
      setSuccessMessage(msg);
      setTimeout(() => setSuccessMessage(null), 4000);
    }
  };

  const fetchBuckets = async (preferSelected?: string) => {
    setLoadingBuckets(true);
    try {
      const res = await fetch(`/api/floci/s3?endpoint=${encodeURIComponent(endpoint)}`);
      const json = await res.json();
      if (json.success) {
        const fetchedBuckets = json.data || [];
        setBuckets(fetchedBuckets);
        if (preferSelected) {
          setSelectedBucket(preferSelected);
        } else if (fetchedBuckets.length > 0 && (!selectedBucket || !fetchedBuckets.some((b: any) => b.name === selectedBucket))) {
          setSelectedBucket(fetchedBuckets[0].name);
        } else if (fetchedBuckets.length === 0) {
          setSelectedBucket(null);
          setObjects([]);
        }
      }
    } catch (e: any) {
      console.error(e);
      showNotification(e.message || "Failed to fetch buckets", true);
    } finally {
      setLoadingBuckets(false);
    }
  };

  const fetchObjects = async (bucketName: string) => {
    setLoadingObjects(true);
    try {
      const res = await fetch(
        `/api/floci/s3?endpoint=${encodeURIComponent(endpoint)}&bucket=${encodeURIComponent(
          bucketName
        )}`
      );
      const json = await res.json();
      if (json.success) {
        setObjects(json.data || []);
      }
    } catch (e: any) {
      console.error(e);
      showNotification(e.message || "Failed to fetch objects", true);
    } finally {
      setLoadingObjects(false);
    }
  };

  useEffect(() => {
    if (isConnected) {
      fetchBuckets();
    }
  }, [endpoint, isConnected]);

  useEffect(() => {
    if (selectedBucket) {
      fetchObjects(selectedBucket);
    }
  }, [selectedBucket]);

  const handleCreateBucket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBucketName.trim()) return;

    setActionLoading(true);
    try {
      const res = await fetch("/api/floci/s3", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create-bucket",
          bucket: newBucketName.trim().toLowerCase(),
          endpoint,
        }),
      });
      const json = await res.json();
      if (json.success) {
        showNotification(json.message || "Bucket created successfully");
        const createdName = newBucketName.trim().toLowerCase();
        setNewBucketName("");
        setIsCreateBucketOpen(false);
        await fetchBuckets(createdName);
      } else {
        showNotification(json.error || "Failed to create bucket", true);
      }
    } catch (err: any) {
      showNotification(err.message || "Network error", true);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteBucket = async (bucketName: string) => {
    if (!confirm(`Are you sure you want to delete bucket '${bucketName}'? All objects must be removed first.`)) {
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch("/api/floci/s3", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete-bucket",
          bucket: bucketName,
          endpoint,
        }),
      });
      const json = await res.json();
      if (json.success) {
        showNotification(json.message || "Bucket deleted successfully");
        if (selectedBucket === bucketName) {
          setSelectedBucket(null);
          setObjects([]);
        }
        await fetchBuckets();
      } else {
        showNotification(json.error || "Failed to delete bucket", true);
      }
    } catch (err: any) {
      showNotification(err.message || "Network error", true);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUploadObject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBucket || !uploadKey.trim()) return;

    setActionLoading(true);
    try {
      const res = await fetch("/api/floci/s3", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "upload-object",
          bucket: selectedBucket,
          key: uploadKey.trim(),
          content: uploadContent,
          endpoint,
        }),
      });
      const json = await res.json();
      if (json.success) {
        showNotification(json.message || "Object uploaded successfully");
        setUploadKey("");
        setUploadContent("");
        setIsUploadOpen(false);
        await fetchObjects(selectedBucket);
      } else {
        showNotification(json.error || "Failed to upload object", true);
      }
    } catch (err: any) {
      showNotification(err.message || "Network error", true);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteObject = async (key: string) => {
    if (!selectedBucket) return;
    if (!confirm(`Are you sure you want to delete object '${key}'?`)) {
      return;
    }

    try {
      const res = await fetch("/api/floci/s3", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete-object",
          bucket: selectedBucket,
          key,
          endpoint,
        }),
      });
      const json = await res.json();
      if (json.success) {
        showNotification(json.message || "Object deleted");
        await fetchObjects(selectedBucket);
      } else {
        showNotification(json.error || "Failed to delete object", true);
      }
    } catch (err: any) {
      showNotification(err.message || "Network error", true);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!uploadKey) {
        setUploadKey(file.name);
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        setUploadContent((event.target?.result as string) || "");
      };
      reader.readAsText(file);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Toast Notifications */}
      {errorMessage && (
        <div className="fixed top-20 right-6 z-50 flex items-center gap-2 bg-rose-950/90 border border-rose-500/50 text-rose-200 px-4 py-3 rounded-xl shadow-2xl backdrop-blur-md text-xs">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{errorMessage}</span>
          <button onClick={() => setErrorMessage(null)} className="ml-2 text-rose-400 hover:text-rose-100">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
      {successMessage && (
        <div className="fixed top-20 right-6 z-50 flex items-center gap-2 bg-emerald-950/90 border border-emerald-500/50 text-emerald-200 px-4 py-3 rounded-xl shadow-2xl backdrop-blur-md text-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successMessage}</span>
          <button onClick={() => setSuccessMessage(null)} className="ml-2 text-emerald-400 hover:text-emerald-100">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <FolderLock className={`w-6 h-6 ${isAws ? "text-amber-400" : "text-blue-400"}`} />
            {isAws ? "S3 Storage Buckets" : "Cloud Storage Buckets"}
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            {isAws
              ? "Create, manage, and browse AWS S3 buckets and stored objects"
              : "Create, manage, and browse GCP Cloud Storage buckets and blobs inside Floci"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsCreateBucketOpen(true)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white shadow-lg transition-all ${
              isAws
                ? "bg-amber-600 hover:bg-amber-500 shadow-amber-600/20"
                : "bg-blue-600 hover:bg-blue-500 shadow-blue-600/20"
            }`}
          >
            <Plus className="w-4 h-4" />
            {isAws ? "Create Bucket" : "Create Storage Bucket"}
          </button>

          <button
            onClick={() => fetchBuckets()}
            disabled={loadingBuckets}
            className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 px-4 py-2 rounded-xl text-xs font-semibold transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingBuckets ? "animate-spin text-emerald-400" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Main Grid: Buckets + Objects */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Buckets List */}
        <div className="bg-[#0d1322] border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Folder className={`w-4 h-4 ${isAws ? "text-amber-400" : "text-blue-400"}`} />
              {isAws ? "Buckets" : "Storage Buckets"} ({buckets.length})
            </span>
          </div>

          {loadingBuckets ? (
            <div className="py-8 text-center text-xs text-slate-500">Loading {serviceLabels.buckets}...</div>
          ) : buckets.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500 space-y-2">
              <p>No buckets created yet.</p>
              <button
                onClick={() => setIsCreateBucketOpen(true)}
                className="text-xs font-semibold text-emerald-400 hover:underline"
              >
                + Create your first bucket
              </button>
            </div>
          ) : (
            <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-1">
              {buckets.map((b) => {
                const isSelected = selectedBucket === b.name;
                const activeBorder = isAws
                  ? "bg-amber-500/10 border-amber-500/40 text-amber-300 font-semibold"
                  : "bg-blue-500/10 border-blue-500/40 text-blue-300 font-semibold";

                return (
                  <div
                    key={b.name}
                    className={`group w-full p-2.5 rounded-xl text-xs font-mono transition-all flex items-center justify-between border ${
                      isSelected
                        ? activeBorder
                        : "bg-slate-900/60 border-slate-800/80 text-slate-300 hover:border-slate-700"
                    }`}
                  >
                    <button
                      onClick={() => setSelectedBucket(b.name)}
                      className="flex-1 text-left truncate flex items-center gap-2"
                    >
                      <Folder className={`w-3.5 h-3.5 shrink-0 ${isSelected ? (isAws ? "text-amber-400" : "text-blue-400") : "text-slate-500"}`} />
                      <span className="truncate">{b.name}</span>
                    </button>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] text-slate-500 font-sans hidden sm:inline">
                        {new Date(b.creationDate).toLocaleDateString()}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteBucket(b.name);
                        }}
                        title={`Delete ${b.name}`}
                        className="p-1 text-slate-500 hover:text-rose-400 rounded transition-colors opacity-80 hover:opacity-100"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Objects List */}
        <div className="lg:col-span-2 bg-[#0d1322] border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-2">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <File className={`w-4 h-4 ${isAws ? "text-amber-400" : "text-blue-400"}`} />
              {selectedBucket ? `Objects in ${selectedBucket}` : "Select a bucket"}
            </span>

            {selectedBucket && (
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-400">{objects.length} item(s)</span>
                <button
                  onClick={() => setIsUploadOpen(true)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all ${
                    isAws
                      ? "bg-amber-600 hover:bg-amber-500"
                      : "bg-blue-600 hover:bg-blue-500"
                  }`}
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  Upload Object
                </button>
              </div>
            )}
          </div>

          {loadingObjects ? (
            <div className="py-12 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
              Fetching object contents...
            </div>
          ) : !selectedBucket ? (
            <div className="py-12 text-center text-xs text-slate-500">
              Select or create a bucket to view and manage stored objects.
            </div>
          ) : objects.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500 space-y-2">
              <p>This bucket is currently empty.</p>
              <button
                onClick={() => setIsUploadOpen(true)}
                className="text-xs font-semibold text-emerald-400 hover:underline inline-flex items-center gap-1"
              >
                <UploadCloud className="w-3.5 h-3.5" /> Upload an object
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/80 border-b border-slate-800 text-slate-400 uppercase font-semibold">
                  <tr>
                    <th className="px-4 py-2.5">Key / Object Path</th>
                    <th className="px-4 py-2.5">Size</th>
                    <th className="px-4 py-2.5">Last Modified</th>
                    <th className="px-4 py-2.5">Storage Tier</th>
                    <th className="px-4 py-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {objects.map((obj) => (
                    <tr key={obj.key} className="hover:bg-slate-900/40 transition-colors">
                      <td className="px-4 py-3 text-slate-200 flex items-center gap-2">
                        <File className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span className="truncate max-w-sm">{obj.key}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-400">{formatBytes(obj.size)}</td>
                      <td className="px-4 py-3 text-slate-500 text-[11px]">
                        {new Date(obj.lastModified).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-slate-400 font-sans text-[11px]">
                        <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
                          {obj.storageClass || "STANDARD"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleDeleteObject(obj.key)}
                          title={`Delete ${obj.key}`}
                          className="p-1 text-slate-500 hover:text-rose-400 transition-colors rounded"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Create Bucket Modal */}
      {isCreateBucketOpen && mounted && createPortal(
        <div
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsCreateBucketOpen(false);
          }}
        >
          <div className="bg-[#0f172a] border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <FolderLock className={`w-5 h-5 ${isAws ? "text-amber-400" : "text-blue-400"}`} />
                <h3 className="font-bold text-slate-100 text-base">
                  {isAws ? "Create S3 Bucket" : "Create Storage Bucket"}
                </h3>
              </div>
              <button
                onClick={() => setIsCreateBucketOpen(false)}
                className="text-slate-400 hover:text-slate-100 p-1 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateBucket} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Bucket Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. my-app-assets"
                  value={newBucketName}
                  onChange={(e) => setNewBucketName(e.target.value)}
                  pattern="[a-z0-9.-]+"
                  title="Bucket names must contain only lowercase letters, numbers, hyphens, and periods"
                  required
                  className="w-full bg-slate-900 border border-slate-800 px-3.5 py-2 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Bucket names must be globally unique within Floci and use lowercase alphanumeric characters.
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateBucketOpen(false)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-slate-200 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className={`px-4 py-2 text-xs font-semibold text-white rounded-xl transition-colors flex items-center gap-1.5 ${
                    isAws
                      ? "bg-amber-600 hover:bg-amber-500"
                      : "bg-blue-600 hover:bg-blue-500"
                  }`}
                >
                  {actionLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  Create Bucket
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Upload Object Modal */}
      {isUploadOpen && mounted && createPortal(
        <div
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsUploadOpen(false);
          }}
        >
          <div className="bg-[#0f172a] border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <UploadCloud className={`w-5 h-5 ${isAws ? "text-amber-400" : "text-blue-400"}`} />
                <h3 className="font-bold text-slate-100 text-base">
                  Upload to {selectedBucket}
                </h3>
              </div>
              <button
                onClick={() => setIsUploadOpen(false)}
                className="text-slate-400 hover:text-slate-100 p-1 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUploadObject} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Object Key (Path)
                </label>
                <input
                  type="text"
                  placeholder="e.g. data/config.json or readme.txt"
                  value={uploadKey}
                  onChange={(e) => setUploadKey(e.target.value)}
                  required
                  className="w-full bg-slate-900 border border-slate-800 px-3.5 py-2 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Choose File or Enter Text Payload
                </label>
                <input
                  type="file"
                  onChange={handleFileSelect}
                  className="w-full text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700 cursor-pointer mb-2"
                />
                <textarea
                  rows={5}
                  placeholder="Enter raw text, JSON, or payload contents..."
                  value={uploadContent}
                  onChange={(e) => setUploadContent(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 p-3 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsUploadOpen(false)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-slate-200 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className={`px-4 py-2 text-xs font-semibold text-white rounded-xl transition-colors flex items-center gap-1.5 ${
                    isAws
                      ? "bg-amber-600 hover:bg-amber-500"
                      : "bg-blue-600 hover:bg-blue-500"
                  }`}
                >
                  {actionLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <UploadCloud className="w-3.5 h-3.5" />}
                  Upload
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
