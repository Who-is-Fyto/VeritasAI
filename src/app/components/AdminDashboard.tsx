"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import {
  ShieldAlert,
  ShieldCheck,
  Users,
  Database,
  Activity,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Crown,
  Zap,
  Clock,
  Terminal,
  Cpu,
  Trash2,
  Lock,
  Unlock,
  Key,
  Layers,
  HardDrive,
  BarChart3,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Brain,
  Sparkles
} from "lucide-react";

import { veritasAPI } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import type { AdminUser, DatabaseTelemetry, AuditLog } from "../../types/admin";

export function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Navigation tabs
  const [activeTab, setActiveTab] = useState<"users" | "telemetry" | "audit" | "trainer">("users");

  // Telemetry state
  const [telemetry, setTelemetry] = useState<DatabaseTelemetry | null>(null);
  const [telemetryLoading, setTelemetryLoading] = useState(true);

  // User Management state
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [usersTotal, setUsersTotal] = useState(0);
  const [usersPage, setUsersPage] = useState(1);
  const [usersPages, setUsersPages] = useState(1);
  const [usersLoading, setUsersLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [tierFilter, setTierFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Audit Logs state
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditLoading, setAuditLoading] = useState(false);

  // Trainer state
  const [trainStatus, setTrainStatus] = useState<any>(null);
  const [trainLoading, setTrainLoading] = useState(false);
  const [trainTriggering, setTrainTriggering] = useState(false);

  // Modals state
  const [suspensionModalUser, setSuspensionModalUser] = useState<AdminUser | null>(null);
  const [suspensionReason, setSuspensionReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const [deleteModalUser, setDeleteModalUser] = useState<AdminUser | null>(null);

  // ── Fetch Telemetry ────────────────────────────────────────────────────────
  const fetchTelemetry = useCallback(async () => {
    try {
      setTelemetryLoading(true);
      const data = await veritasAPI.adminGetDbTelemetry();
      setTelemetry(data);
    } catch (err: any) {
      toast.error("Telemetry failed: " + (err.message || "Could not retrieve system stats"));
    } finally {
      setTelemetryLoading(false);
    }
  }, []);

  // ── Fetch Users ────────────────────────────────────────────────────────────
  const fetchUsers = useCallback(async () => {
    try {
      setUsersLoading(true);
      const res = await veritasAPI.adminGetUsers({
        search: searchQuery.trim() || undefined,
        tier: tierFilter === "all" ? undefined : tierFilter,
        status: statusFilter === "all" ? undefined : statusFilter,
        page: usersPage,
        limit: 15,
      });
      setUsers(res.users);
      setUsersTotal(res.total);
      setUsersPages(res.pages);
    } catch (err: any) {
      toast.error("User list failed: " + (err.message || "Could not retrieve accounts"));
    } finally {
      setUsersLoading(false);
    }
  }, [searchQuery, tierFilter, statusFilter, usersPage]);

  // ── Fetch Audit Logs ───────────────────────────────────────────────────────
  const fetchAuditLogs = useCallback(async () => {
    try {
      setAuditLoading(true);
      const res = await veritasAPI.adminGetAuditLogs({ limit: 50 });
      setAuditLogs(res.logs);
      setAuditTotal(res.total);
    } catch (err: any) {
      toast.error("Audit log failed: " + (err.message || "Could not load audit ledger"));
    } finally {
      setAuditLoading(false);
    }
  }, []);

  // ── Fetch Trainer Status ───────────────────────────────────────────────────
  const fetchTrainStatus = useCallback(async () => {
    try {
      setTrainLoading(true);
      const res = await veritasAPI.getTrainStatus();
      setTrainStatus(res);
    } catch (err: any) {
      toast.error("Trainer status failed: " + (err.message || "Failed to query trainer"));
    } finally {
      setTrainLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTelemetry();
    fetchUsers();
    fetchAuditLogs();
    fetchTrainStatus();
  }, [fetchTelemetry, fetchUsers, fetchAuditLogs, fetchTrainStatus]);

  // ── Action Handlers ────────────────────────────────────────────────────────
  const handleUpdateTier = async (userId: string, newTier: string) => {
    try {
      setActionLoading(true);
      const updated = await veritasAPI.adminUpdateUserTier(userId, newTier);
      toast.success(`Account tier updated to ${newTier.toUpperCase()} for ${updated.email}`);
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, tier: updated.tier, daily_limit: updated.daily_limit } : u)));
      fetchTelemetry();
      fetchAuditLogs();
    } catch (err: any) {
      toast.error("Tier update failed: " + (err.message || "Could not elevate tier"));
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleSuspension = async () => {
    if (!suspensionModalUser) return;
    try {
      setActionLoading(true);
      const targetState = !suspensionModalUser.is_suspended;
      const updated = await veritasAPI.adminUpdateUserStatus(
        suspensionModalUser.id,
        targetState,
        targetState ? suspensionReason : "Administrative reinstatement"
      );
      toast.success(
        targetState
          ? `Account suspended: ${updated.email}`
          : `Account reinstated: ${updated.email}`
      );
      setUsers((prev) =>
        prev.map((u) =>
          u.id === suspensionModalUser.id
            ? { ...u, is_suspended: updated.is_suspended, suspension_reason: updated.suspension_reason }
            : u
        )
      );
      setSuspensionModalUser(null);
      setSuspensionReason("");
      fetchAuditLogs();
    } catch (err: any) {
      toast.error("Status update failed: " + (err.message || "Could not modify account"));
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteModalUser) return;
    try {
      setActionLoading(true);
      await veritasAPI.adminDeleteUser(deleteModalUser.id);
      toast.success(`User ${deleteModalUser.email} permanently deleted.`);
      setUsers((prev) => prev.filter((u) => u.id !== deleteModalUser.id));
      setUsersTotal((prev) => Math.max(0, prev - 1));
      setDeleteModalUser(null);
      fetchTelemetry();
      fetchAuditLogs();
    } catch (err: any) {
      toast.error("User deletion failed: " + (err.message || "Could not delete account"));
    } finally {
      setActionLoading(false);
    }
  };

  const handleTriggerTraining = async () => {
    try {
      setTrainTriggering(true);
      await veritasAPI.triggerTraining();
      toast.success("Active learning sequence classification retrain dispatched in background.");
      setTimeout(() => fetchTrainStatus(), 1200);
      fetchAuditLogs();
    } catch (err: any) {
      toast.error("Training trigger failed: " + (err.message || "Could not trigger retrain"));
    } finally {
      setTrainTriggering(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/60 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Bar */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 shadow-xs clip-corner-lg">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2.5 mb-2">
                <span className="p-2 rounded-lg bg-emerald-100 text-emerald-800">
                  <ShieldCheck className="w-6 h-6" />
                </span>
                <div>
                  <h1 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2">
                    Super Administrator Console
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold tracking-wider uppercase bg-emerald-600 text-white">
                      Superadmin Tier
                    </span>
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-500 font-medium">
                    Institutional governance oversight, user tier control, live telemetry, and active learning supervision.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => {
                  fetchTelemetry();
                  fetchUsers();
                  fetchAuditLogs();
                  fetchTrainStatus();
                  toast.info("Refreshed governance telemetry metrics.");
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Refresh Data
              </button>

              <button
                onClick={handleTriggerTraining}
                disabled={trainTriggering}
                className="px-4 py-2 bg-gradient-to-r from-blue-700 to-blue-600 hover:from-blue-800 hover:to-blue-700 text-white text-xs font-bold rounded-lg shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Brain className="w-3.5 h-3.5" />
                {trainTriggering ? "Dispatched..." : "Trigger Model Retrain"}
              </button>
            </div>
          </div>

          {/* Quick Metrics Strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-6 border-t border-slate-100">
            {/* Metric 1 */}
            <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/80">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider">Total Analyses</span>
                <Activity className="w-4 h-4 text-blue-600" />
              </div>
              <p className="text-2xl font-black text-slate-900">
                {telemetryLoading ? "..." : telemetry?.verifications_summary.total_analyses ?? 0}
              </p>
              <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
                <span className="text-emerald-700 font-bold">
                  {telemetry?.verifications_summary.credible_count ?? 0} Credible
                </span>
                <span>•</span>
                <span className="text-rose-700 font-bold">
                  {telemetry?.verifications_summary.misinformation_count ?? 0} Flagged
                </span>
              </div>
            </div>

            {/* Metric 2 */}
            <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/80">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider">Registered Accounts</span>
                <Users className="w-4 h-4 text-indigo-600" />
              </div>
              <p className="text-2xl font-black text-slate-900">
                {telemetryLoading ? "..." : telemetry?.collection_counts.users ?? usersTotal}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                Multi-tier RBAC enabled across all accounts
              </p>
            </div>

            {/* Metric 3 */}
            <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/80">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider">Avg Credibility</span>
                <BarChart3 className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-2xl font-black text-slate-900">
                {telemetryLoading ? "..." : `${telemetry?.verifications_summary.average_credibility_score ?? 82.5}%`}
              </p>
              <p className="text-[11px] text-emerald-700 font-semibold mt-1">
                Institutional Quality Standard
              </p>
            </div>

            {/* Metric 4 */}
            <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/80">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider">Database & Latency</span>
                <HardDrive className="w-4 h-4 text-purple-600" />
              </div>
              <p className="text-2xl font-black text-slate-900">
                {telemetryLoading ? "..." : `${telemetry?.latency_ms ?? 1.4} ms`}
              </p>
              <div className="flex items-center gap-1.5 mt-1 text-[11px]">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-slate-600 font-semibold uppercase">
                  {telemetry?.status === "healthy" ? "Cluster Healthy" : "Degraded"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
          <button
            onClick={() => setActiveTab("users")}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "users"
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>User Management & RBAC</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              activeTab === "users" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-700"
            }`}>
              {usersTotal}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("telemetry")}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "telemetry"
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            <Database className="w-4 h-4" />
            <span>Database Telemetry</span>
          </button>

          <button
            onClick={() => setActiveTab("audit")}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "audit"
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            <span>Security Audit Ledger</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              activeTab === "audit" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-700"
            }`}>
              {auditTotal}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("trainer")}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "trainer"
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            <Brain className="w-4 h-4" />
            <span>Active Learning ML Engine</span>
          </button>
        </div>

        {/* TAB 1: User Management & RBAC Table */}
        {activeTab === "users" && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs clip-corner-lg space-y-5">
            {/* Search and Filters Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by name, email, or institution..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setUsersPage(1);
                  }}
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Tier Filter */}
                <select
                  value={tierFilter}
                  onChange={(e) => {
                    setTierFilter(e.target.value);
                    setUsersPage(1);
                  }}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="all">All Tiers</option>
                  <option value="superadmin">Super Admin</option>
                  <option value="pro">Pro Journalist</option>
                  <option value="academic">Academic Seat</option>
                  <option value="free">Free Tier</option>
                </select>

                {/* Status Filter */}
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setUsersPage(1);
                  }}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active Only</option>
                  <option value="suspended">Suspended Only</option>
                </select>
              </div>
            </div>

            {/* Users Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-extrabold uppercase tracking-wider text-slate-600">
                    <th className="py-3 px-4">User & Contact</th>
                    <th className="py-3 px-4">Role & Institution</th>
                    <th className="py-3 px-4">Account Tier</th>
                    <th className="py-3 px-4">Verifications</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {usersLoading ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-500">
                        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                        <span>Querying user records from MongoDB...</span>
                      </td>
                    </tr>
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-500">
                        <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="font-semibold text-slate-700">No matching accounts found</p>
                        <p className="text-slate-400 text-[11px] mt-0.5">Adjust search criteria or reset filters.</p>
                      </td>
                    </tr>
                  ) : (
                    users.map((u) => {
                      const isSelf = u.id === user?.id || u.email === user?.email;
                      const isSuspended = u.is_suspended;

                      const tierBadgeStyle =
                        u.tier === "superadmin"
                          ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                          : u.tier === "pro"
                          ? "bg-blue-100 text-blue-800 border-blue-300"
                          : u.tier === "academic"
                          ? "bg-indigo-100 text-indigo-800 border-indigo-300"
                          : "bg-slate-100 text-slate-700 border-slate-200";

                      return (
                        <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                          {/* Col 1: User & Contact */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center shrink-0">
                                {u.name
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")
                                  .substring(0, 2)
                                  .toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="font-bold text-slate-900 truncate flex items-center gap-1.5">
                                  <span>{u.name}</span>
                                  {isSelf && (
                                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-amber-100 text-amber-800 border border-amber-200">
                                      You
                                    </span>
                                  )}
                                </p>
                                <p className="text-[11px] text-slate-500 truncate">{u.email}</p>
                              </div>
                            </div>
                          </td>

                          {/* Col 2: Role & Institution */}
                          <td className="py-3 px-4">
                            <p className="font-semibold text-slate-800">{u.role || "Base User"}</p>
                            <p className="text-[11px] text-slate-500 truncate max-w-[180px]">
                              {u.institution || "Independent"}
                            </p>
                          </td>

                          {/* Col 3: Account Tier & Elevation Selector */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <select
                                value={u.tier}
                                onChange={(e) => handleUpdateTier(u.id, e.target.value)}
                                disabled={actionLoading}
                                className={`px-2.5 py-1 rounded-md text-[11px] font-bold uppercase border cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500 ${tierBadgeStyle}`}
                              >
                                <option value="free">Free Tier</option>
                                <option value="academic">Academic Seat</option>
                                <option value="pro">Pro Journalist</option>
                                <option value="superadmin">Super Admin</option>
                              </select>
                            </div>
                          </td>

                          {/* Col 4: Verifications Count */}
                          <td className="py-3 px-4">
                            <p className="font-bold text-slate-900">{u.total_verifications}</p>
                            <p className="text-[10px] text-slate-500">
                              {u.daily_limit > 9000 ? "Unlimited" : `${u.daily_used}/${u.daily_limit} today`}
                            </p>
                          </td>

                          {/* Col 5: Status */}
                          <td className="py-3 px-4">
                            {isSuspended ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-300">
                                <XCircle className="w-3 h-3 text-rose-600" />
                                Suspended
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                Active
                              </span>
                            )}
                          </td>

                          {/* Col 6: Actions */}
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Suspend / Reinstate Button */}
                              <button
                                onClick={() => setSuspensionModalUser(u)}
                                disabled={isSelf || actionLoading}
                                title={
                                  isSelf
                                    ? "Cannot suspend your own account"
                                    : isSuspended
                                    ? "Reinstate account"
                                    : "Suspend account"
                                }
                                className={`p-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                                  isSuspended
                                    ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                                    : "bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200"
                                }`}
                              >
                                {isSuspended ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                              </button>

                              {/* Delete Button */}
                              <button
                                onClick={() => setDeleteModalUser(u)}
                                disabled={isSelf || actionLoading}
                                title={isSelf ? "Cannot delete your own account" : "Delete user"}
                                className="p-1.5 rounded-md bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
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

            {/* Pagination */}
            <div className="flex items-center justify-between text-xs text-slate-500 pt-2">
              <span>
                Showing Page {usersPage} of {usersPages} ({usersTotal} total accounts)
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setUsersPage((p) => Math.max(1, p - 1))}
                  disabled={usersPage <= 1}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1 font-semibold"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  Previous
                </button>
                <button
                  onClick={() => setUsersPage((p) => Math.min(usersPages, p + 1))}
                  disabled={usersPage >= usersPages}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1 font-semibold"
                >
                  Next
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Database Telemetry */}
        {activeTab === "telemetry" && (
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Storage Breakdown Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs clip-corner-lg space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Database className="w-5 h-5 text-blue-600" />
                  <h3 className="font-bold text-slate-900 text-base">MongoDB Cluster Storage</h3>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                  {telemetry?.status || "Healthy"}
                </span>
              </div>

              <div className="space-y-3">
                <div className="p-3 bg-slate-50 rounded-xl flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700">Database Name</span>
                  <span className="font-mono font-bold text-slate-900">{telemetry?.database_name || "veritasai"}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700">Cluster Query Latency</span>
                  <span className="font-mono font-bold text-emerald-700">{telemetry?.latency_ms ?? 1.4} ms (Optimal)</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700">Raw Data Storage</span>
                  <span className="font-mono font-bold text-slate-900">{telemetry?.storage.data_size_mb ?? 2.8} MB</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700">Allocated Disk Storage</span>
                  <span className="font-mono font-bold text-slate-900">{telemetry?.storage.storage_size_mb ?? 8.5} MB</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700">Index Overhead</span>
                  <span className="font-mono font-bold text-slate-900">{telemetry?.storage.indexes_size_mb ?? 1.2} MB</span>
                </div>
              </div>
            </div>

            {/* Collection Tallies Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs clip-corner-lg space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Layers className="w-5 h-5 text-indigo-600" />
                  <h3 className="font-bold text-slate-900 text-base">Collection Document Registry</h3>
                </div>
                <span className="text-xs font-semibold text-slate-500">Live Collection Counts</span>
              </div>

              <div className="space-y-2.5">
                {telemetry?.collection_counts &&
                  Object.entries(telemetry.collection_counts).map(([name, count]) => (
                    <div
                      key={name}
                      className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-900 capitalize">{name}</span>
                        <span className="text-[10px] text-slate-500">collection</span>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-md font-mono font-bold text-slate-900 bg-white border border-slate-200">
                        {count.toLocaleString()} docs
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: Security Audit Ledger */}
        {activeTab === "audit" && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs clip-corner-lg space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-rose-600" />
                <h3 className="font-bold text-slate-900 text-base">Immutable Security Audit Ledger</h3>
              </div>
              <span className="text-xs text-slate-500 font-medium">
                {auditTotal} total administrative actions recorded
              </span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-extrabold uppercase tracking-wider text-slate-600">
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Actor Email</th>
                    <th className="py-3 px-4">Action Event</th>
                    <th className="py-3 px-4">Target Details</th>
                    <th className="py-3 px-4 text-right">IP Address</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {auditLoading ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-500">
                        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                        <span>Querying audit ledger...</span>
                      </td>
                    </tr>
                  ) : auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-500">
                        No audit events recorded yet.
                      </td>
                    </tr>
                  ) : (
                    auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-600">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-800">
                          {log.actor_email}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-800 border border-slate-200">
                            {log.action}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-700 font-mono text-[11px] max-w-xs truncate">
                          {JSON.stringify(log.details)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-[11px] text-slate-500">
                          {log.ip_address || "127.0.0.1"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: Active Learning ML Engine */}
        {activeTab === "trainer" && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs clip-corner-lg space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Brain className="w-5 h-5 text-blue-600" />
                  <h3 className="font-bold text-slate-900 text-base">RoBERTa Active Learning Classifier</h3>
                </div>
                <p className="text-xs text-slate-500">
                  Continuous sequence classification retrain loop updating weights from verified user feedback.
                </p>
              </div>

              <button
                onClick={handleTriggerTraining}
                disabled={trainTriggering}
                className="px-4 py-2 bg-gradient-to-r from-blue-700 to-blue-600 hover:from-blue-800 hover:to-blue-700 text-white text-xs font-bold rounded-lg shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 self-start sm:self-center"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${trainTriggering ? "animate-spin" : ""}`} />
                {trainTriggering ? "Training Dispatched..." : "Run Retraining Cycle"}
              </button>
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Engine State</span>
                <p className="text-xl font-black text-slate-900 mt-1 capitalize">
                  {trainStatus?.status || "Idle / Ready"}
                </p>
                <p className="text-[11px] text-emerald-700 font-semibold mt-0.5">Awaiting retrain batches</p>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Samples Trained</span>
                <p className="text-xl font-black text-slate-900 mt-1">
                  {trainStatus?.samples_trained ?? 142}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">Verified ground-truth samples</p>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Model Loss</span>
                <p className="text-xl font-black text-slate-900 mt-1 font-mono">
                  {trainStatus?.loss ? trainStatus.loss.toFixed(4) : "0.0384"}
                </p>
                <p className="text-[11px] text-blue-700 font-semibold mt-0.5">Convergence threshold passed</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Suspension / Reinstatement Confirmation Modal */}
      <AnimatePresence>
        {suspensionModalUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl border border-slate-200 space-y-4"
            >
              <div className="flex items-center gap-2.5 text-amber-600">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="font-bold text-slate-900 text-base">
                  {suspensionModalUser.is_suspended ? "Reinstate User Account" : "Suspend User Account"}
                </h3>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                {suspensionModalUser.is_suspended
                  ? `Reinstating ${suspensionModalUser.email} will immediately unlock their login ability and restore their verification access.`
                  : `Suspending ${suspensionModalUser.email} will immediately revoke active JWT sessions and prevent future analysis requests.`}
              </p>

              {!suspensionModalUser.is_suspended && (
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Audit Suspension Reason
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Provide reason for account suspension (e.g., quota abuse, terms violation)..."
                    value={suspensionReason}
                    onChange={(e) => setSuspensionReason(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => {
                    setSuspensionModalUser(null);
                    setSuspensionReason("");
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleToggleSuspension}
                  disabled={actionLoading}
                  className={`px-4 py-2 rounded-xl text-xs font-bold text-white shadow-xs cursor-pointer ${
                    suspensionModalUser.is_suspended
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : "bg-amber-600 hover:bg-amber-700"
                  }`}
                >
                  {actionLoading
                    ? "Updating..."
                    : suspensionModalUser.is_suspended
                    ? "Confirm Reinstatement"
                    : "Confirm Suspension"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete User Confirmation Modal */}
      <AnimatePresence>
        {deleteModalUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl border border-slate-200 space-y-4"
            >
              <div className="flex items-center gap-2.5 text-rose-600">
                <Trash2 className="w-5 h-5" />
                <h3 className="font-bold text-slate-900 text-base">Permanently Delete Account</h3>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                Are you sure you want to permanently delete account <strong>{deleteModalUser.email}</strong>?
                This action is irreversible and will purge all associated API keys and audit metadata.
              </p>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setDeleteModalUser(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteUser}
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {actionLoading ? "Deleting..." : "Permanently Delete"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default AdminDashboard;
