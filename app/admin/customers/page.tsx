"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  Users,
  Search,
  Ban,
  User,
  CheckCircle,
  Loader2,
  Mail,
  Phone,
  Calendar,
  Briefcase,
  UserCheck,
  Trash2,
  KeyRound,
  Eye,
  XCircle,
  Clock,
  Filter,
  Send,
  Archive,
  RotateCcw,
  ShieldAlert,
  Wrench,
} from "lucide-react";

interface Profile {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  created_at: string;
  is_banned: boolean;
  is_blocked?: boolean;
  is_provider: boolean;
  is_admin: boolean;
  is_super_admin?: boolean;
  city?: string;
  gender?: string;
  is_deleted?: boolean;
  deleted_at?: string;
  last_sign_in_at?: string;
}

export default function CustomersPage() {
  const [allUsers, setAllUsers] = useState<Profile[]>([]);
  const [displayedUsers, setDisplayedUsers] = useState<Profile[]>([]);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [maintenanceCodes, setMaintenanceCodes] = useState<Record<string, string>>({});
  const [searchTerm, setSearchTerm] = useState("");

  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "banned" | "deleted" | "inactive"
  >("all");

  const [typeFilter, setTypeFilter] = useState<"clients" | "providers">(
    "clients"
  );

  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);

  const [stats, setStats] = useState({
    activeClients: 0,
    activeProviders: 0,
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    filterData();
  }, [searchTerm, statusFilter, typeFilter, allUsers]);

  const isUserBanned = (user: Profile) => {
    return Boolean(user.is_banned || user.is_blocked);
  };

  const fetchData = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .not("is_admin", "eq", true)
      .order("created_at", { ascending: false });

    if (!error && data) {
      const users = data as Profile[];
      setAllUsers(users);

      const activeClients = users.filter(
        (u) => !u.is_provider && !u.is_deleted && !isUserBanned(u)
      ).length;

      const activeProviders = users.filter(
        (u) => u.is_provider && !u.is_deleted && !isUserBanned(u)
      ).length;

      setStats({
        activeClients,
        activeProviders,
      });

      const providerIds = users.filter((u) => u.is_provider).map((u) => u.id);
      await fetchMaintenanceCodes(providerIds);
    }

    setLoading(false);
  };

  const fetchMaintenanceCodes = async (providerIds: string[]) => {
    if (providerIds.length === 0) {
      setMaintenanceCodes({});
      return;
    }

    try {
      const requesterId = await getSessionUserId();
      const searchParams = new URLSearchParams({
        providerIds: providerIds.join(","),
        requesterId,
      });
      const response = await fetch(
        `/api/admin/maintenance/code?${searchParams.toString()}`
      );
      const result = await response.json().catch(() => ({}));

      if (!response.ok) return;

      const codes = (result.codes || []).reduce((acc: Record<string, string>, row: any) => {
        acc[row.provider_id] = row.maintenance_code;
        return acc;
      }, {});

      setMaintenanceCodes(codes);
    } catch (error) {
      console.warn("Maintenance codes were not loaded:", error);
    }
  };

  const handleCreateMaintenanceCode = async (providerId: string) => {
    setActionLoading(providerId);

    try {
      const requesterId = await getSessionUserId();
      const response = await fetch("/api/admin/maintenance/code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providerId, requesterId }),
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (result?.error === "provider_not_found_or_not_linked") {
          throw new Error("لا يمكن إنشاء رقم صيانة لهذا المزود لأن حساب المزود غير مربوط بعد");
        }

        throw new Error(result?.error || "تعذر إنشاء رقم الصيانة");
      }

      setMaintenanceCodes((prev) => ({
        ...prev,
        [providerId]: result.code,
      }));
    } catch (error: any) {
      alert(error.message || "حدث خطأ أثناء إنشاء رقم الصيانة");
    } finally {
      setActionLoading(null);
    }
  };

  const filterData = () => {
    let result = allUsers;

    if (typeFilter === "clients") {
      result = result.filter((u) => !u.is_provider);
    } else if (typeFilter === "providers") {
      result = result.filter((u) => u.is_provider);
    }

    if (statusFilter === "active") {
      result = result.filter((u) => !isUserBanned(u) && !u.is_deleted);
    } else if (statusFilter === "banned") {
      result = result.filter((u) => isUserBanned(u) && !u.is_deleted);
    } else if (statusFilter === "deleted") {
      result = result.filter((u) => u.is_deleted);
    } else if (statusFilter === "inactive") {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      result = result.filter((u) => {
        const lastSeen = u.last_sign_in_at
          ? new Date(u.last_sign_in_at)
          : new Date(u.created_at);

        return lastSeen < thirtyDaysAgo && !u.is_deleted;
      });
    }

    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase();

      result = result.filter(
        (u) =>
          (u.full_name?.toLowerCase() || "").includes(lowerTerm) ||
          (u.email?.toLowerCase() || "").includes(lowerTerm) ||
          (u.phone || "").includes(lowerTerm)
      );
    }

    setDisplayedUsers(result);
  };

  const getSessionUserId = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user?.id) {
      throw new Error("جلسة العمل مفقودة");
    }

    return session.user.id;
  };

  const callUserAction = async (payload: {
    action: "toggle_ban" | "archive" | "restore" | "permanent_delete";
    userId: string;
    newStatus?: boolean;
    confirmText?: string;
  }) => {
    const requesterId = await getSessionUserId();

    const response = await fetch("/api/admin/users/action", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...payload,
        requesterId,
      }),
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(result?.error || "فشل تنفيذ العملية");
    }

    return result;
  };

  const handleToggleBan = async (
    id: string,
    currentStatus: boolean,
    userName: string
  ) => {
    const actionText = currentStatus ? "فك الإيقاف عن" : "إيقاف";
    const confirmMsg = currentStatus
      ? `هل أنت متأكد من فك الإيقاف عن المستخدم "${userName}"؟`
      : `هل أنت متأكد من إيقاف المستخدم "${userName}"؟ سيتم منع تسجيل الدخول بدون تغيير البريد.`;

    if (!confirm(confirmMsg)) return;

    setActionLoading(id);

    try {
      const newStatus = !currentStatus;

      await callUserAction({
        action: "toggle_ban",
        userId: id,
        newStatus,
      });

      setAllUsers((prev) =>
        prev.map((u) =>
          u.id === id
            ? { ...u, is_banned: newStatus, is_blocked: newStatus }
            : u
        )
      );

      if (selectedUser?.id === id) {
        setSelectedUser((prev) =>
          prev ? { ...prev, is_banned: newStatus, is_blocked: newStatus } : prev
        );
      }

      alert(`تم ${actionText} المستخدم بنجاح.`);
    } catch (error: any) {
      alert("حدث خطأ: " + error.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleArchiveUser = async (user: Profile) => {
    if (
      !confirm(
        `هل أنت متأكد من أرشفة الحساب "${user.full_name || user.email}"؟\n\nالأرشفة تمنع الدخول وتخفي الحساب من النشطين بدون تغيير البريد الإلكتروني.`
      )
    ) {
      return;
    }

    setActionLoading(user.id);

    try {
      await callUserAction({
        action: "archive",
        userId: user.id,
      });

      setAllUsers((prev) =>
        prev.map((u) =>
          u.id === user.id
            ? {
                ...u,
                is_deleted: true,
                is_banned: true,
                is_blocked: true,
                deleted_at: new Date().toISOString(),
              }
            : u
        )
      );

      if (selectedUser?.id === user.id) {
        setSelectedUser((prev) =>
          prev
            ? {
                ...prev,
                is_deleted: true,
                is_banned: true,
                is_blocked: true,
                deleted_at: new Date().toISOString(),
              }
            : prev
        );
      }

      alert("تمت أرشفة الحساب بنجاح بدون تغيير البريد الإلكتروني.");
    } catch (error: any) {
      alert("حدث خطأ أثناء الأرشفة: " + error.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRestoreUser = async (user: Profile) => {
    if (
      !confirm(
        `هل تريد استعادة الحساب "${user.full_name || user.email}" وإلغاء الأرشفة والإيقاف؟`
      )
    ) {
      return;
    }

    setActionLoading(user.id);

    try {
      await callUserAction({
        action: "restore",
        userId: user.id,
      });

      setAllUsers((prev) =>
        prev.map((u) =>
          u.id === user.id
            ? {
                ...u,
                is_deleted: false,
                is_banned: false,
                is_blocked: false,
                deleted_at: undefined,
              }
            : u
        )
      );

      if (selectedUser?.id === user.id) {
        setSelectedUser((prev) =>
          prev
            ? {
                ...prev,
                is_deleted: false,
                is_banned: false,
                is_blocked: false,
                deleted_at: undefined,
              }
            : prev
        );
      }

      alert("تمت استعادة الحساب بنجاح.");
    } catch (error: any) {
      alert("حدث خطأ أثناء الاستعادة: " + error.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handlePermanentDelete = async (user: Profile) => {
    const confirmText = window.prompt(
      `تحذير شديد: الحذف النهائي قد يؤثر على الحجوزات والمدفوعات والبيانات المرتبطة.\n\nلحذف الحساب نهائيًا اكتب:\nDELETE_USER_PERMANENTLY`
    );

    if (confirmText !== "DELETE_USER_PERMANENTLY") {
      alert("تم إلغاء الحذف النهائي.");
      return;
    }

    setActionLoading(user.id);

    try {
      await callUserAction({
        action: "permanent_delete",
        userId: user.id,
        confirmText,
      });

      alert("تم تنفيذ طلب الحذف النهائي.");
      await fetchData();
      setSelectedUser(null);
    } catch (error: any) {
      alert("الحذف النهائي لم يتم: " + error.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleResetPassword = async (email: string) => {
    if (!email || email.includes("deleted_") || email.includes("@temp.com")) {
      alert("لا يمكن إرسال رابط إعادة تعيين لهذا البريد.");
      return;
    }

    if (!confirm(`هل تريد إرسال رابط إعادة تعيين كلمة المرور إلى ${email}؟`)) {
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/update-password`,
    });

    if (error) alert("خطأ: " + error.message);
    else alert("تم إرسال رابط إعادة التعيين إلى بريد المستخدم.");
  };

  const handleDirectEmail = (clientEmail: string, clientName: string) => {
    if (!clientEmail || clientEmail.includes("deleted_") || clientEmail.includes("@temp.com")) {
      alert("لا يمكن مراسلة هذا البريد.");
      return;
    }

    const subject = encodeURIComponent("تواصل من إدارة منصة سيّر");
    const body = encodeURIComponent(
      `مرحباً ${clientName}،\n\nنحن فريق الدعم في منصة سيّر، ونتواصل معك بخصوص...\n\n`
    );

    window.location.href = `mailto:${clientEmail}?subject=${subject}&body=${body}`;
  };

  const renderStatusBadge = (user: Profile) => {
    if (user.is_deleted) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-gray-700 text-gray-300 text-xs border border-gray-600">
          <Archive size={12} />
          مؤرشف
        </span>
      );
    }

    if (isUserBanned(user)) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-red-500/10 text-red-400 text-xs border border-red-500/20">
          <Ban size={12} />
          موقوف
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 text-xs border border-emerald-500/20">
        <CheckCircle size={12} />
        نشط
      </span>
    );
  };

  const renderActionButtons = (user: Profile) => {
    const disabled = actionLoading === user.id;

    return (
      <div className="flex items-center justify-center gap-2">
        <button
          onClick={() => handleDirectEmail(user.email, user.full_name || "العميل")}
          title="مراسلة عبر الإيميل"
          disabled={disabled || Boolean(user.is_deleted)}
          className="p-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded-lg transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Send size={16} />
        </button>

        <button
          onClick={() => setSelectedUser(user)}
          title="عرض التفاصيل"
          disabled={disabled}
          className="p-2 bg-white/5 hover:bg-white/10 text-blue-400 rounded-lg transition disabled:opacity-40"
        >
          <Eye size={16} />
        </button>

        <button
          onClick={() => handleResetPassword(user.email)}
          title="إرسال رابط استعادة كلمة المرور"
          disabled={disabled || Boolean(user.is_deleted)}
          className="p-2 bg-white/5 hover:bg-white/10 text-yellow-400 rounded-lg transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <KeyRound size={16} />
        </button>

        {!user.is_deleted && (
          <button
            onClick={() =>
              handleToggleBan(
                user.id,
                isUserBanned(user),
                user.full_name || "المستخدم"
              )
            }
            title={isUserBanned(user) ? "فك الإيقاف" : "إيقاف"}
            disabled={disabled}
            className={`p-2 bg-white/5 hover:bg-white/10 rounded-lg transition disabled:opacity-40 ${
              isUserBanned(user) ? "text-emerald-400" : "text-orange-400"
            }`}
          >
            {isUserBanned(user) ? (
              <CheckCircle size={16} />
            ) : (
              <Ban size={16} />
            )}
          </button>
        )}

        {!user.is_deleted ? (
          <button
            onClick={() => handleArchiveUser(user)}
            title="أرشفة الحساب"
            disabled={disabled}
            className="p-2 bg-gray-500/10 hover:bg-gray-500/20 text-gray-300 rounded-lg transition disabled:opacity-40"
          >
            <Archive size={16} />
          </button>
        ) : (
          <button
            onClick={() => handleRestoreUser(user)}
            title="استعادة الحساب"
            disabled={disabled}
            className="p-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg transition disabled:opacity-40"
          >
            <RotateCcw size={16} />
          </button>
        )}

        {user.is_deleted && (
          <button
            onClick={() => handlePermanentDelete(user)}
            title="حذف نهائي"
            disabled={disabled}
            className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition disabled:opacity-40"
          >
            <Trash2 size={16} />
          </button>
        )}

        {disabled && <Loader2 className="animate-spin text-[#C89B3C]" size={16} />}
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-2 text-white">
            <Users className="text-[#C89B3C]" />
            إدارة {typeFilter === "clients" ? "العملاء" : "مزودي الخدمة"}
          </h1>
          <p className="text-white/60 text-sm">
            متابعة{" "}
            {typeFilter === "clients" ? "السياح والزوار" : "أصحاب الخدمات"}{" "}
            المسجلين في المنصة.
          </p>
        </div>
      </header>

      <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 text-amber-300 text-sm flex items-start gap-3">
        <ShieldAlert size={20} className="shrink-0 mt-0.5" />
        <p>
          الأرشفة والإيقاف لا يغيران البريد الإلكتروني. لا يتم استخدام صيغة
          deleted_ نهائيًا من هذه الصفحة.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div
          onClick={() => setTypeFilter("clients")}
          className={`cursor-pointer border p-6 rounded-2xl flex items-center justify-between transition-all duration-300 ${
            typeFilter === "clients"
              ? "bg-linear-to-br from-blue-500/20 to-blue-600/10 border-blue-500 ring-1 ring-blue-500/50"
              : "bg-white/5 border-white/10 hover:bg-white/10"
          }`}
        >
          <div>
            <p
              className={`text-sm font-bold mb-1 ${
                typeFilter === "clients" ? "text-blue-400" : "text-gray-400"
              }`}
            >
              العملاء النشطين
            </p>
            <h2 className="text-4xl font-bold text-white">
              {stats.activeClients}
            </h2>
          </div>
          <div
            className={`w-12 h-12 rounded-full flex items-center justify-center ${
              typeFilter === "clients"
                ? "bg-blue-500/20 text-blue-400"
                : "bg-white/10 text-white/50"
            }`}
          >
            <Users size={24} />
          </div>
        </div>

        <div
          onClick={() => setTypeFilter("providers")}
          className={`cursor-pointer border p-6 rounded-2xl flex items-center justify-between transition-all duration-300 ${
            typeFilter === "providers"
              ? "bg-linear-to-br from-purple-500/20 to-purple-600/10 border-purple-500 ring-1 ring-purple-500/50"
              : "bg-white/5 border-white/10 hover:bg-white/10"
          }`}
        >
          <div>
            <p
              className={`text-sm font-bold mb-1 ${
                typeFilter === "providers" ? "text-purple-400" : "text-gray-400"
              }`}
            >
              مزودي الخدمة النشطين
            </p>
            <h2 className="text-4xl font-bold text-white">
              {stats.activeProviders}
            </h2>
          </div>
          <div
            className={`w-12 h-12 rounded-full flex items-center justify-center ${
              typeFilter === "providers"
                ? "bg-purple-500/20 text-purple-400"
                : "bg-white/10 text-white/50"
            }`}
          >
            <Briefcase size={24} />
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6 bg-white/5 p-4 rounded-2xl border border-white/10">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-3 text-white/40" size={20} />
          <input
            type="text"
            placeholder="بحث بالاسم، الإيميل، أو الجوال..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-black/20 border border-white/10 rounded-xl py-2.5 pr-10 pl-4 text-white focus:border-[#C89B3C] outline-none"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0 custom-scrollbar">
          <button
            onClick={() => setStatusFilter("all")}
            className={`px-4 py-2 rounded-xl text-sm transition whitespace-nowrap flex items-center gap-2 ${
              statusFilter === "all"
                ? "bg-[#C89B3C] text-black font-bold"
                : "bg-black/20 text-white/60"
            }`}
          >
            <Filter size={16} />
            الكل
          </button>

          <button
            onClick={() => setStatusFilter("active")}
            className={`px-4 py-2 rounded-xl text-sm transition whitespace-nowrap flex items-center gap-2 ${
              statusFilter === "active"
                ? "bg-emerald-500 text-white"
                : "bg-black/20 text-white/60"
            }`}
          >
            <CheckCircle size={16} />
            نشط
          </button>

          <button
            onClick={() => setStatusFilter("inactive")}
            className={`px-4 py-2 rounded-xl text-sm transition whitespace-nowrap flex items-center gap-2 ${
              statusFilter === "inactive"
                ? "bg-orange-500 text-white"
                : "bg-black/20 text-white/60"
            }`}
          >
            <Clock size={16} />
            خامل 30+ يوم
          </button>

          <button
            onClick={() => setStatusFilter("banned")}
            className={`px-4 py-2 rounded-xl text-sm transition whitespace-nowrap flex items-center gap-2 ${
              statusFilter === "banned"
                ? "bg-red-500 text-white"
                : "bg-black/20 text-white/60"
            }`}
          >
            <Ban size={16} />
            موقوف
          </button>

          <button
            onClick={() => setStatusFilter("deleted")}
            className={`px-4 py-2 rounded-xl text-sm transition whitespace-nowrap flex items-center gap-2 ${
              statusFilter === "deleted"
                ? "bg-gray-600 text-white"
                : "bg-black/20 text-white/60"
            }`}
          >
            <Archive size={16} />
            مؤرشف
          </button>
        </div>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden shadow-xl min-h-100">
        {loading ? (
          <div className="p-20 flex justify-center">
            <Loader2 className="animate-spin text-[#C89B3C] w-10 h-10" />
          </div>
        ) : displayedUsers.length === 0 ? (
          <div className="p-20 text-center text-white/40 flex flex-col items-center">
            <Search size={40} className="mb-4 opacity-20" />
            لا يوجد مستخدمين مطابقين للبحث أو الفلتر.
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-right min-w-250">
              <thead className="bg-black/20 text-white/50 text-xs uppercase">
                <tr>
                  <th className="px-6 py-4">المستخدم</th>
                  <th className="px-6 py-4">بيانات التواصل</th>
                  <th className="px-6 py-4">تاريخ الانضمام</th>
                  <th className="px-6 py-4">آخر ظهور</th>
                  <th className="px-6 py-4">الحالة</th>
                  <th className="px-6 py-4 text-center">إجراءات سريعة</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-white/5 text-sm">
                {displayedUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-white/5 transition group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                            user.is_deleted
                              ? "bg-gray-500/20 text-gray-400"
                              : isUserBanned(user)
                              ? "bg-red-500/20 text-red-500"
                              : "bg-[#C89B3C]/20 text-[#C89B3C]"
                          }`}
                        >
                          {user.full_name ? (
                            user.full_name.charAt(0)
                          ) : (
                            <UserCheck size={18} />
                          )}
                        </div>

                        <div>
                          <div className="font-bold text-white flex items-center gap-2">
                            {user.full_name || "مستخدم بدون اسم"}

                            {user.is_deleted && (
                              <span className="text-[10px] bg-gray-700 text-gray-300 px-2 py-0.5 rounded border border-gray-600 font-bold">
                                مؤرشف
                              </span>
                            )}

                            {user.is_provider && (
                              <span className="text-[10px] bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded border border-purple-500/20">
                                مزود
                              </span>
                            )}
                          </div>

                          <div className="text-xs text-white/40 font-mono">
                            ID: {user.id.slice(0, 6)}...
                          </div>

                          {user.is_provider && (
                            <div className="mt-2 text-xs">
                              {maintenanceCodes[user.id] ? (
                                <div className="inline-flex items-center gap-2 bg-black/25 border border-white/10 rounded-lg px-2 py-1 text-white/70">
                                  <Wrench size={12} className="text-[#C89B3C]" />
                                  <span>رقم الصيانة:</span>
                                  <span className="font-mono text-[#C89B3C] tracking-wider">
                                    {maintenanceCodes[user.id]}
                                  </span>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleCreateMaintenanceCode(user.id)}
                                  disabled={actionLoading === user.id}
                                  className="inline-flex items-center gap-1 rounded-lg bg-[#C89B3C]/10 border border-[#C89B3C]/30 text-[#C89B3C] px-2 py-1 hover:bg-[#C89B3C] hover:text-black transition disabled:opacity-50"
                                >
                                  {actionLoading === user.id ? (
                                    <Loader2 size={12} className="animate-spin" />
                                  ) : (
                                    <Wrench size={12} />
                                  )}
                                  إنشاء رقم صيانة
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4 space-y-1">
                      <div className="flex items-center gap-2 text-white/80 text-xs">
                        <Mail size={14} className="text-[#C89B3C]" />
                        {user.email}
                      </div>
                      <div className="flex items-center gap-2 text-white/60 text-xs">
                        <Phone size={14} />
                        {user.phone || "-"}
                      </div>
                    </td>

                    <td className="px-6 py-4 text-white/50 text-xs">
                      <div className="flex items-center gap-2">
                        <Calendar size={14} />
                        {new Date(user.created_at).toLocaleDateString("ar-SA")}
                      </div>
                    </td>

                    <td className="px-6 py-4 text-white/50 text-xs">
                      <div className="flex items-center gap-2">
                        <Clock size={14} className="text-white/30" />
                        {user.last_sign_in_at
                          ? new Date(user.last_sign_in_at).toLocaleDateString(
                              "ar-SA"
                            )
                          : "غير معروف"}
                      </div>
                    </td>

                    <td className="px-6 py-4">{renderStatusBadge(user)}</td>

                    <td className="px-6 py-4">{renderActionButtons(user)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedUser && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#252525] w-full max-w-2xl rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <User size={20} className="text-[#C89B3C]" />
                تفاصيل المستخدم
              </h3>
              <button
                onClick={() => setSelectedUser(null)}
                className="text-white/50 hover:text-white"
              >
                <XCircle size={24} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-full bg-[#C89B3C]/20 flex items-center justify-center text-[#C89B3C] text-2xl font-bold">
                  {selectedUser.full_name ? selectedUser.full_name.charAt(0) : "م"}
                </div>
                <div>
                  <h4 className="text-xl font-bold">
                    {selectedUser.full_name || "بدون اسم"}
                  </h4>
                  <p className="text-sm text-white/50">
                    {selectedUser.is_provider ? "مزود خدمة" : "سائح/زائر"}
                  </p>
                  <div className="mt-2">{renderStatusBadge(selectedUser)}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-black/30 p-3 rounded-lg border border-white/5">
                  <label className="text-xs text-white/40 block mb-1">
                    البريد الإلكتروني
                  </label>
                  <div className="text-sm select-all dir-ltr text-left">
                    {selectedUser.email}
                  </div>
                </div>

                <div className="bg-black/30 p-3 rounded-lg border border-white/5">
                  <label className="text-xs text-white/40 block mb-1">
                    رقم الجوال
                  </label>
                  <div className="text-sm select-all dir-ltr text-left">
                    {selectedUser.phone || "غير مسجل"}
                  </div>
                </div>

                <div className="bg-black/30 p-3 rounded-lg border border-white/5">
                  <label className="text-xs text-white/40 block mb-1">
                    تاريخ الانضمام
                  </label>
                  <div className="text-sm">
                    {new Date(selectedUser.created_at).toLocaleDateString("ar-SA")}
                  </div>
                </div>

                <div className="bg-black/30 p-3 rounded-lg border border-white/5">
                  <label className="text-xs text-white/40 block mb-1">
                    آخر ظهور
                  </label>
                  <div className="text-sm">
                    {selectedUser.last_sign_in_at
                      ? new Date(selectedUser.last_sign_in_at).toLocaleDateString(
                          "ar-SA"
                        )
                      : "غير معروف"}
                  </div>
                </div>

                {selectedUser.deleted_at && (
                  <div className="bg-black/30 p-3 rounded-lg border border-white/5 md:col-span-2">
                    <label className="text-xs text-white/40 block mb-1">
                      تاريخ الأرشفة
                    </label>
                    <div className="text-sm">
                      {new Date(selectedUser.deleted_at).toLocaleDateString("ar-SA")}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 bg-white/5 border-t border-white/10 flex flex-wrap justify-end gap-2">
              <button
                onClick={() => setSelectedUser(null)}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition"
              >
                إغلاق
              </button>

              <button
                onClick={() =>
                  handleDirectEmail(
                    selectedUser.email,
                    selectedUser.full_name || "العميل"
                  )
                }
                disabled={Boolean(selectedUser.is_deleted)}
                className="px-4 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded-lg text-sm transition border border-indigo-500/20 flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Send size={14} />
                مراسلة
              </button>

              {!selectedUser.is_deleted && (
                <button
                  onClick={() =>
                    handleToggleBan(
                      selectedUser.id,
                      isUserBanned(selectedUser),
                      selectedUser.full_name || "المستخدم"
                    )
                  }
                  className={`px-4 py-2 rounded-lg text-sm transition border flex items-center gap-1 ${
                    isUserBanned(selectedUser)
                      ? "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/20"
                      : "bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border-orange-500/20"
                  }`}
                >
                  {isUserBanned(selectedUser) ? (
                    <>
                      <CheckCircle size={14} />
                      فك الإيقاف
                    </>
                  ) : (
                    <>
                      <Ban size={14} />
                      إيقاف
                    </>
                  )}
                </button>
              )}

              {!selectedUser.is_deleted ? (
                <button
                  onClick={() => handleArchiveUser(selectedUser)}
                  className="px-4 py-2 bg-gray-500/10 hover:bg-gray-500/20 text-gray-300 rounded-lg text-sm transition border border-gray-500/20 flex items-center gap-1"
                >
                  <Archive size={14} />
                  أرشفة
                </button>
              ) : (
                <>
                  <button
                    onClick={() => handleRestoreUser(selectedUser)}
                    className="px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg text-sm transition border border-emerald-500/20 flex items-center gap-1"
                  >
                    <RotateCcw size={14} />
                    استعادة
                  </button>

                  <button
                    onClick={() => handlePermanentDelete(selectedUser)}
                    className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg text-sm transition border border-red-500/20 flex items-center gap-1"
                  >
                    <Trash2 size={14} />
                    حذف نهائي
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
