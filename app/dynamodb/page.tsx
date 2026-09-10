"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Database,
  RefreshCw,
  Table as TableIcon,
  Key,
  Code2,
  Plus,
  Trash2,
  X,
  AlertCircle,
  CheckCircle2,
  FilePlus2,
} from "lucide-react";
import { useEndpoint } from "@/components/EndpointProvider";
import { useCloudTheme } from "@/components/CloudThemeContext";

export default function DynamoDBPage() {
  const { endpoint, isConnected } = useEndpoint();
  const { cloudMode, serviceLabels } = useCloudTheme();
  const [tables, setTables] = useState<string[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [tableDetails, setTableDetails] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [loadingTables, setLoadingTables] = useState(true);
  const [loadingItems, setLoadingItems] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Modals state
  const [isCreateTableOpen, setIsCreateTableOpen] = useState(false);
  const [newTableName, setNewTableName] = useState("");
  const [partitionKeyName, setPartitionKeyName] = useState("id");
  const [partitionKeyType, setPartitionKeyType] = useState("S");
  const [enableSortKey, setEnableSortKey] = useState(false);
  const [sortKeyName, setSortKeyName] = useState("");
  const [sortKeyType, setSortKeyType] = useState("S");

  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [itemJson, setItemJson] = useState('{\n  "id": "item-101",\n  "name": "Sample Record"\n}');

  // Notifications
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

  const fetchTables = async (preferSelected?: string) => {
    setLoadingTables(true);
    try {
      const res = await fetch(`/api/floci/dynamodb?endpoint=${encodeURIComponent(endpoint)}`);
      const json = await res.json();
      if (json.success) {
        const tbls = json.tables || [];
        setTables(tbls);
        if (preferSelected) {
          setSelectedTable(preferSelected);
        } else if (tbls.length > 0 && (!selectedTable || !tbls.includes(selectedTable))) {
          setSelectedTable(tbls[0]);
        } else if (tbls.length === 0) {
          setSelectedTable(null);
          setTableDetails(null);
          setItems([]);
        }
      }
    } catch (e: any) {
      console.error(e);
      showNotification(e.message || "Failed to fetch tables", true);
    } finally {
      setLoadingTables(false);
    }
  };

  const fetchTableData = async (tableName: string) => {
    setLoadingItems(true);
    try {
      const res = await fetch(
        `/api/floci/dynamodb?endpoint=${encodeURIComponent(endpoint)}&table=${encodeURIComponent(
          tableName
        )}`
      );
      const json = await res.json();
      if (json.success) {
        setTableDetails(json.table);
        setItems(json.items || []);
      }
    } catch (e: any) {
      console.error(e);
      showNotification(e.message || "Failed to fetch table details", true);
    } finally {
      setLoadingItems(false);
    }
  };

  useEffect(() => {
    if (isConnected) {
      fetchTables();
    }
  }, [endpoint, isConnected]);

  useEffect(() => {
    if (selectedTable) {
      fetchTableData(selectedTable);
    }
  }, [selectedTable]);

  const handleCreateTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTableName.trim() || !partitionKeyName.trim()) return;

    setActionLoading(true);
    try {
      const res = await fetch("/api/floci/dynamodb", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create-table",
          tableName: newTableName.trim(),
          partitionKey: partitionKeyName.trim(),
          partitionKeyType,
          sortKey: enableSortKey && sortKeyName.trim() ? sortKeyName.trim() : undefined,
          sortKeyType: enableSortKey ? sortKeyType : undefined,
          endpoint,
        }),
      });
      const json = await res.json();
      if (json.success) {
        showNotification(json.message || "Table created successfully");
        const created = newTableName.trim();
        setNewTableName("");
        setPartitionKeyName("id");
        setSortKeyName("");
        setEnableSortKey(false);
        setIsCreateTableOpen(false);
        await fetchTables(created);
      } else {
        showNotification(json.error || "Failed to create table", true);
      }
    } catch (err: any) {
      showNotification(err.message || "Network error", true);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteTable = async (tableName: string) => {
    if (!confirm(`Are you sure you want to permanently delete table '${tableName}' and all of its items?`)) {
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch("/api/floci/dynamodb", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete-table",
          tableName,
          endpoint,
        }),
      });
      const json = await res.json();
      if (json.success) {
        showNotification(json.message || "Table deleted successfully");
        if (selectedTable === tableName) {
          setSelectedTable(null);
          setTableDetails(null);
          setItems([]);
        }
        await fetchTables();
      } else {
        showNotification(json.error || "Failed to delete table", true);
      }
    } catch (err: any) {
      showNotification(err.message || "Network error", true);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTable) return;

    let parsed: any;
    try {
      parsed = JSON.parse(itemJson);
    } catch (err) {
      showNotification("Invalid JSON format. Please correct syntax.", true);
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch("/api/floci/dynamodb", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "put-item",
          tableName: selectedTable,
          item: parsed,
          endpoint,
        }),
      });
      const json = await res.json();
      if (json.success) {
        showNotification(json.message || "Item inserted successfully");
        setIsAddItemOpen(false);
        await fetchTableData(selectedTable);
      } else {
        showNotification(json.error || "Failed to insert item", true);
      }
    } catch (err: any) {
      showNotification(err.message || "Network error", true);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteItem = async (rawItem: Record<string, any>) => {
    if (!selectedTable || !tableDetails?.KeySchema) return;
    if (!confirm("Are you sure you want to delete this record?")) return;

    // Extract the primary key attributes from rawItem
    const key: Record<string, any> = {};
    for (const schema of tableDetails.KeySchema) {
      const attrName = schema.AttributeName;
      if (rawItem[attrName] !== undefined) {
        key[attrName] = rawItem[attrName];
      }
    }

    try {
      const res = await fetch("/api/floci/dynamodb", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete-item",
          tableName: selectedTable,
          key,
          endpoint,
        }),
      });
      const json = await res.json();
      if (json.success) {
        showNotification("Item deleted");
        await fetchTableData(selectedTable);
      } else {
        showNotification(json.error || "Failed to delete item", true);
      }
    } catch (err: any) {
      showNotification(err.message || "Network error", true);
    }
  };

  const openAddItemModal = () => {
    if (!tableDetails?.KeySchema) {
      setItemJson('{\n  "id": "item-101",\n  "name": "Sample Record"\n}');
    } else {
      const template: Record<string, any> = {};
      for (const k of tableDetails.KeySchema) {
        template[k.AttributeName] = "test-value";
      }
      template["data"] = "Sample content";
      setItemJson(JSON.stringify(template, null, 2));
    }
    setIsAddItemOpen(true);
  };

  return (
    <div className="space-y-6 resource-page">
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
            <Database className={`w-6 h-6 ${isAws ? "text-accent" : "text-accent"}`} />
            {isAws ? "DynamoDB NoSQL Explorer" : "Datastore & NoSQL Explorer"}
          </h2>
          <p className="text-sm text-muted mt-1">
            {isAws
              ? "Create tables, manage composite keys, insert and query DynamoDB items"
              : "Create entities, manage partition keys, and manage NoSQL documents in Floci"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsCreateTableOpen(true)}
            className={`flex items-center gap-2 px-4 py-2 rounded-control text-xs font-semibold text-white transition-all ${
              isAws
                ? "bg-action hover:bg-action shadow-amber-600/20"
                : "bg-action hover:bg-action shadow-blue-600/20"
            }`}
          >
            <Plus className="w-4 h-4" />
            {isAws ? "Create Table" : "Create Entity"}
          </button>

          <button
            onClick={() => fetchTables()}
            disabled={loadingTables}
            className="flex items-center gap-2 bg-subtle hover:bg-subtle text-ink border border-line px-4 py-2 rounded-control text-xs font-semibold transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingTables ? "animate-spin text-success" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tables Sidebar */}
        <div className="bg-surface border border-line rounded-panel p-5 space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-line">
            <span className="text-xs font-bold text-ink uppercase tracking-wider flex items-center gap-2">
              <TableIcon className={`w-4 h-4 ${isAws ? "text-accent" : "text-accent"}`} />
              {isAws ? "Tables" : "Entities"} ({tables.length})
            </span>
          </div>

          {loadingTables ? (
            <div className="py-8 text-center text-xs text-muted">Loading {serviceLabels.tables}...</div>
          ) : tables.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted space-y-2">
              <p>No tables found.</p>
              <button
                onClick={() => setIsCreateTableOpen(true)}
                className="text-xs font-semibold text-success hover:underline"
              >
                + Create your first table
              </button>
            </div>
          ) : (
            <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-1">
              {tables.map((tbl) => {
                const isSelected = selectedTable === tbl;
                const activeBorder = isAws
                  ? "bg-selected border-line text-accent font-semibold"
                  : "bg-selected border-line text-accent font-semibold";

                return (
                  <div
                    key={tbl}
                    className={`group w-full p-2.5 rounded-control text-xs font-mono transition-all flex items-center justify-between border ${
                      isSelected
                        ? activeBorder
                        : "bg-subtle border-line text-ink hover:border-line"
                    }`}
                  >
                    <button
                      onClick={() => setSelectedTable(tbl)}
                      className="flex-1 text-left truncate flex items-center gap-2"
                    >
                      <TableIcon className={`w-3.5 h-3.5 shrink-0 ${isSelected ? (isAws ? "text-accent" : "text-accent") : "text-muted"}`} />
                      <span className="truncate">{tbl}</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteTable(tbl);
                      }}
                      title={`Delete table ${tbl}`}
                      className="p-1 text-muted hover:text-danger rounded transition-colors opacity-80 hover:opacity-100"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Table Schema & Items */}
        <div className="lg:col-span-2 bg-surface border border-line rounded-panel p-5 space-y-5">
          {loadingItems ? (
            <div className="py-16 text-center text-xs text-muted flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-success" />
              Scanning table items...
            </div>
          ) : !selectedTable ? (
            <div className="py-16 text-center text-xs text-muted">
              Select or create a table to view schema and records.
            </div>
          ) : (
            <>
              {/* Schema Summary */}
              {tableDetails && (
                <div className="bg-subtle border border-line rounded-control p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm font-bold text-ink">
                      {tableDetails.TableName}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] px-2 py-0.5 rounded bg-success-soft text-success border border-emerald-500/30 font-semibold uppercase">
                        {tableDetails.TableStatus || "ACTIVE"}
                      </span>
                      <button
                        onClick={() => handleDeleteTable(selectedTable)}
                        className="text-[11px] text-danger hover:text-danger flex items-center gap-1 hover:underline ml-2"
                      >
                        <Trash2 className="w-3 h-3" /> Delete Table
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <span className="text-muted text-[11px] block">
                        {isAws ? "Key Schema" : "Partition & Key"}
                      </span>
                      <div className="font-mono text-ink mt-0.5 flex items-center gap-1">
                        <Key className={`w-3 h-3 ${isAws ? "text-accent" : "text-accent"}`} />
                        {tableDetails.KeySchema?.map(
                          (k: any) => `${k.AttributeName} (${k.KeyType})`
                        ).join(", ")}
                      </div>
                    </div>
                    <div>
                      <span className="text-muted text-[11px] block">Item Count</span>
                      <span className="font-semibold text-ink mt-0.5 block">
                        {tableDetails.ItemCount ?? items.length}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted text-[11px] block">Throughput Mode</span>
                      <span className="text-ink mt-0.5 block">
                        {tableDetails.BillingModeSummary?.BillingMode || "PAY_PER_REQUEST"}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Items View */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-ink uppercase tracking-wider flex items-center gap-2">
                    <Code2 className="w-4 h-4 text-success" />
                    Scanned Records ({items.length})
                  </span>

                  <button
                    onClick={openAddItemModal}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all ${
                      isAws
                        ? "bg-action hover:bg-action"
                        : "bg-action hover:bg-action"
                    }`}
                  >
                    <FilePlus2 className="w-3.5 h-3.5" />
                    Insert Item
                  </button>
                </div>

                {items.length === 0 ? (
                  <div className="py-8 text-center text-xs text-muted space-y-2">
                    <p>No items found in this table.</p>
                    <button
                      onClick={openAddItemModal}
                      className="text-xs font-semibold text-success hover:underline inline-flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Insert first item
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[450px] overflow-y-auto pr-1 font-mono text-xs">
                    {items.map((item, idx) => (
                      <div
                        key={idx}
                        className="bg-subtle border border-line rounded-control p-3.5 relative group"
                      >
                        <button
                          onClick={() => handleDeleteItem(item)}
                          title="Delete record"
                          className="absolute top-3 right-3 p-1 text-muted hover:text-danger rounded transition-colors opacity-0 group-hover:opacity-100 bg-subtle"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <pre className="text-success leading-relaxed overflow-x-auto pr-8">
                          {JSON.stringify(item, null, 2)}
                        </pre>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Create Table Modal */}
      {isCreateTableOpen && mounted && createPortal(
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsCreateTableOpen(false);
          }}
        >
          <div className="bg-surface border border-line rounded-panel w-full max-w-md p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div className="flex items-center gap-2">
                <Database className={`w-5 h-5 ${isAws ? "text-accent" : "text-accent"}`} />
                <h3 className="font-bold text-ink text-base">
                  {isAws ? "Create DynamoDB Table" : "Create Datastore Entity"}
                </h3>
              </div>
              <button
                onClick={() => setIsCreateTableOpen(false)}
                className="text-muted hover:text-ink p-1 hover:bg-subtle rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTable} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-ink mb-1.5">
                  Table Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. users, products, telemetry"
                  value={newTableName}
                  onChange={(e) => setNewTableName(e.target.value)}
                  required
                  className="w-full bg-subtle border border-line px-3.5 py-2 rounded-control text-xs text-ink focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1.5">
                    Partition Key (HASH)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. id, userId"
                    value={partitionKeyName}
                    onChange={(e) => setPartitionKeyName(e.target.value)}
                    required
                    className="w-full bg-subtle border border-line px-3.5 py-2 rounded-control text-xs text-ink focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1.5">
                    Key Type
                  </label>
                  <select
                    value={partitionKeyType}
                    onChange={(e) => setPartitionKeyType(e.target.value)}
                    className="w-full bg-subtle border border-line px-3 py-2 rounded-control text-xs text-ink focus:outline-none focus:border-emerald-500 font-mono cursor-pointer"
                  >
                    <option value="S">String (S)</option>
                    <option value="N">Number (N)</option>
                    <option value="B">Binary (B)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 cursor-pointer text-xs text-ink">
                  <input
                    type="checkbox"
                    checked={enableSortKey}
                    onChange={(e) => setEnableSortKey(e.target.checked)}
                    className="rounded bg-subtle border-line text-emerald-500 focus:ring-0"
                  />
                  <span>Add Sort Key (RANGE)</span>
                </label>
              </div>

              {enableSortKey && (
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-xs font-semibold text-ink mb-1.5">
                      Sort Key Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. timestamp, sk"
                      value={sortKeyName}
                      onChange={(e) => setSortKeyName(e.target.value)}
                      required={enableSortKey}
                      className="w-full bg-subtle border border-line px-3.5 py-2 rounded-control text-xs text-ink focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-ink mb-1.5">
                      Sort Key Type
                    </label>
                    <select
                      value={sortKeyType}
                      onChange={(e) => setSortKeyType(e.target.value)}
                      className="w-full bg-subtle border border-line px-3 py-2 rounded-control text-xs text-ink focus:outline-none focus:border-emerald-500 font-mono cursor-pointer"
                    >
                      <option value="S">String (S)</option>
                      <option value="N">Number (N)</option>
                      <option value="B">Binary (B)</option>
                    </select>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateTableOpen(false)}
                  className="px-4 py-2 text-xs text-muted hover:text-ink rounded-control"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className={`px-4 py-2 text-xs font-semibold text-white rounded-control transition-colors flex items-center gap-1.5 ${
                    isAws
                      ? "bg-action hover:bg-action"
                      : "bg-action hover:bg-action"
                  }`}
                >
                  {actionLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  Create Table
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Add Item Modal */}
      {isAddItemOpen && mounted && createPortal(
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsAddItemOpen(false);
          }}
        >
          <div className="bg-surface border border-line rounded-panel w-full max-w-lg p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div className="flex items-center gap-2">
                <FilePlus2 className={`w-5 h-5 ${isAws ? "text-accent" : "text-accent"}`} />
                <h3 className="font-bold text-ink text-base">
                  Insert Item into {selectedTable}
                </h3>
              </div>
              <button
                onClick={() => setIsAddItemOpen(false)}
                className="text-muted hover:text-ink p-1 hover:bg-subtle rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddItem} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-ink mb-1.5">
                  Item JSON Document
                </label>
                <textarea
                  rows={8}
                  value={itemJson}
                  onChange={(e) => setItemJson(e.target.value)}
                  required
                  className="w-full bg-subtle border border-line p-3 rounded-control text-xs text-success focus:outline-none focus:border-emerald-500 font-mono"
                />
                <span className="text-[11px] text-muted mt-1 block">
                  Must include the primary key attributes defined in the table schema.
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddItemOpen(false)}
                  className="px-4 py-2 text-xs text-muted hover:text-ink rounded-control"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className={`px-4 py-2 text-xs font-semibold text-white rounded-control transition-colors flex items-center gap-1.5 ${
                    isAws
                      ? "bg-action hover:bg-action"
                      : "bg-action hover:bg-action"
                  }`}
                >
                  {actionLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  Save Record
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
