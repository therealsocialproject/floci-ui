"use client";

import React, { useState, useEffect } from "react";
import {
  Database,
  RefreshCw,
  Table as TableIcon,
  Key,
  Code2,
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

  const isAws = cloudMode === "aws";

  const fetchTables = async () => {
    setLoadingTables(true);
    try {
      const res = await fetch(`/api/floci/dynamodb?endpoint=${encodeURIComponent(endpoint)}`);
      const json = await res.json();
      if (json.success) {
        setTables(json.tables || []);
        if (json.tables?.length > 0 && !selectedTable) {
          setSelectedTable(json.tables[0]);
        }
      }
    } catch (e) {
      console.error(e);
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
    } catch (e) {
      console.error(e);
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

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <Database className={`w-6 h-6 ${isAws ? "text-amber-400" : "text-blue-400"}`} />
            {isAws ? "DynamoDB NoSQL Explorer" : "Datastore & NoSQL Explorer"}
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            {isAws
              ? "Browse DynamoDB tables, inspect composite keys, and scan records"
              : "Inspect NoSQL entity kinds, partition keys, and documents in Floci"}
          </p>
        </div>

        <button
          onClick={fetchTables}
          disabled={loadingTables}
          className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 px-4 py-2 rounded-xl text-xs font-semibold transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loadingTables ? "animate-spin text-emerald-400" : ""}`} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tables Sidebar */}
        <div className="bg-[#0d1322] border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <TableIcon className={`w-4 h-4 ${isAws ? "text-amber-400" : "text-blue-400"}`} />
              {isAws ? "Tables" : "Entities"} ({tables.length})
            </span>
          </div>

          {loadingTables ? (
            <div className="py-8 text-center text-xs text-slate-500">Loading {serviceLabels.tables}...</div>
          ) : tables.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">No tables found</div>
          ) : (
            <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-1">
              {tables.map((tbl) => {
                const isSelected = selectedTable === tbl;
                const activeBorder = isAws
                  ? "bg-amber-500/10 border-amber-500/40 text-amber-300 font-semibold"
                  : "bg-blue-500/10 border-blue-500/40 text-blue-300 font-semibold";

                return (
                  <button
                    key={tbl}
                    onClick={() => setSelectedTable(tbl)}
                    className={`w-full text-left p-3 rounded-xl text-xs font-mono transition-all flex items-center justify-between border ${
                      isSelected
                        ? activeBorder
                        : "bg-slate-900/60 border-slate-800/80 text-slate-300 hover:border-slate-700"
                    }`}
                  >
                    <span className="truncate">{tbl}</span>
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ml-2 ${
                        isAws ? "bg-amber-400" : "bg-blue-400"
                      }`}
                    />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Table Schema & Items */}
        <div className="lg:col-span-2 bg-[#0d1322] border border-slate-800 rounded-2xl p-5 shadow-xl space-y-5">
          {loadingItems ? (
            <div className="py-16 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
              Scanning table items...
            </div>
          ) : !selectedTable ? (
            <div className="py-16 text-center text-xs text-slate-500">
              Select a table from the left to view schema and records.
            </div>
          ) : (
            <>
              {/* Schema Summary */}
              {tableDetails && (
                <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm font-bold text-slate-100">
                      {tableDetails.TableName}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold uppercase">
                      {tableDetails.TableStatus || "ACTIVE"}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <span className="text-slate-500 text-[11px] block">
                        {isAws ? "Key Schema" : "Partition & Key"}
                      </span>
                      <div className="font-mono text-slate-300 mt-0.5 flex items-center gap-1">
                        <Key className={`w-3 h-3 ${isAws ? "text-amber-400" : "text-blue-400"}`} />
                        {tableDetails.KeySchema?.map(
                          (k: any) => `${k.AttributeName} (${k.KeyType})`
                        ).join(", ")}
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[11px] block">Item Count</span>
                      <span className="font-semibold text-slate-300 mt-0.5 block">
                        {tableDetails.ItemCount ?? items.length}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[11px] block">Throughput Mode</span>
                      <span className="text-slate-300 mt-0.5 block">
                        {tableDetails.BillingModeSummary?.BillingMode || "PROVISIONED"}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Items View */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <Code2 className="w-4 h-4 text-emerald-400" />
                    Scanned Records ({items.length})
                  </span>
                </div>

                {items.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-500">
                    No items found in this table.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[450px] overflow-y-auto pr-1 font-mono text-xs">
                    {items.map((item, idx) => (
                      <div
                        key={idx}
                        className="bg-slate-900 border border-slate-800/80 rounded-xl p-3.5 overflow-x-auto"
                      >
                        <pre className="text-emerald-400 leading-relaxed">
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
    </div>
  );
}
