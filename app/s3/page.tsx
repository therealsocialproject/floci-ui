"use client";

import React, { useState, useEffect } from "react";
import {
  FolderLock,
  RefreshCw,
  Folder,
  File,
  HardDrive,
  Calendar,
  Layers,
} from "lucide-react";
import { useEndpoint } from "@/components/EndpointProvider";

export default function S3Page() {
  const { endpoint, isConnected } = useEndpoint();
  const [buckets, setBuckets] = useState<any[]>([]);
  const [selectedBucket, setSelectedBucket] = useState<string | null>(null);
  const [objects, setObjects] = useState<any[]>([]);
  const [loadingBuckets, setLoadingBuckets] = useState(true);
  const [loadingObjects, setLoadingObjects] = useState(false);

  const fetchBuckets = async () => {
    setLoadingBuckets(true);
    try {
      const res = await fetch(`/api/floci/s3?endpoint=${encodeURIComponent(endpoint)}`);
      const json = await res.json();
      if (json.success) {
        setBuckets(json.data || []);
        if (json.data?.length > 0 && !selectedBucket) {
          setSelectedBucket(json.data[0].name);
        }
      }
    } catch (e) {
      console.error(e);
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
    } catch (e) {
      console.error(e);
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

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <FolderLock className="w-6 h-6 text-emerald-400" />
            S3 Storage Buckets
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Browse buckets and stored objects inside the Floci storage emulator
          </p>
        </div>

        <button
          onClick={fetchBuckets}
          disabled={loadingBuckets}
          className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 px-4 py-2 rounded-xl text-xs font-semibold transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loadingBuckets ? "animate-spin text-emerald-400" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Main Grid: Buckets + Objects */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Buckets List */}
        <div className="bg-[#0d1322] border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Folder className="w-4 h-4 text-emerald-400" />
              Buckets ({buckets.length})
            </span>
          </div>

          {loadingBuckets ? (
            <div className="py-8 text-center text-xs text-slate-500">Loading buckets...</div>
          ) : buckets.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">No S3 buckets created yet</div>
          ) : (
            <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-1">
              {buckets.map((b) => {
                const isSelected = selectedBucket === b.name;
                return (
                  <button
                    key={b.name}
                    onClick={() => setSelectedBucket(b.name)}
                    className={`w-full text-left p-3 rounded-xl text-xs font-mono transition-all flex items-center justify-between border ${
                      isSelected
                        ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-300 font-semibold"
                        : "bg-slate-900/60 border-slate-800/80 text-slate-300 hover:border-slate-700"
                    }`}
                  >
                    <span className="truncate pr-2">{b.name}</span>
                    <span className="text-[10px] text-slate-500 shrink-0 font-sans">
                      {new Date(b.creationDate).toLocaleDateString()}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Objects List */}
        <div className="lg:col-span-2 bg-[#0d1322] border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <File className="w-4 h-4 text-emerald-400" />
              {selectedBucket ? `Objects in ${selectedBucket}` : "Select a bucket"}
            </span>
            {selectedBucket && (
              <span className="text-xs text-slate-400">{objects.length} item(s)</span>
            )}
          </div>

          {loadingObjects ? (
            <div className="py-12 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
              Fetching object contents...
            </div>
          ) : !selectedBucket ? (
            <div className="py-12 text-center text-xs text-slate-500">
              Select a bucket from the left panel to inspect its contents.
            </div>
          ) : objects.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">
              This bucket is currently empty.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/80 border-b border-slate-800 text-slate-400 uppercase font-semibold">
                  <tr>
                    <th className="px-4 py-2.5">Key / Filename</th>
                    <th className="px-4 py-2.5">Size</th>
                    <th className="px-4 py-2.5">Last Modified</th>
                    <th className="px-4 py-2.5">Storage Class</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {objects.map((obj) => (
                    <tr key={obj.key} className="hover:bg-slate-900/40">
                      <td className="px-4 py-3 text-slate-200 flex items-center gap-2">
                        <File className="w-3.5 h-3.5 text-slate-500" />
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
