"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { Tajawal } from "next/font/google";
import {
  ArrowRight,
  Banknote,
  Briefcase,
  Calculator,
  CreditCard,
  DollarSign,
  Download,
  FileText,
  Loader2,
  Search,
  ShieldCheck,
  TrendingUp,
  Wallet,
  X,
  Printer,
  Copy,
  FileSpreadsheet,
  CalendarDays,
} from "lucide-react";

const tajawal = Tajawal({
  subsets: ["arabic"],
  weight: ["400", "500", "700"],
});

interface ProviderAccountSummary {
  provider_id: string;
  provider_name: string | null;
  provider_email: string | null;
  paid_bookings_count: number;
  total_sales_including_vat: number;
  total_vat_amount: number;
  total_sales_excluding_vat: number;
  platform_total_commission: number;
  provider_total_earnings: number;
  pending_payment_count: number;
  pending_approval_count: number;
  cancelled_or_rejected_count: number;
  approved_payouts?: number;
  pending_payouts?: number;
  rejected_payouts?: number;
  available_balance?: number;
}

interface ProviderStatementRow {
  id: string;
  date: string;
  reference: string;
  type: "booking_credit" | "payout_debit" | "pending_payout";
  description: string;
  debit: number;
  credit: number;
  balance: number;
  status: string;
}

export default function ProviderAccountsPage() {
  const [loading, setLoading] = useState(true);
  const [providers, setProviders] = useState<ProviderAccountSummary[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const [selectedProvider, setSelectedProvider] =
    useState<ProviderAccountSummary | null>(null);
  const [statementRows, setStatementRows] = useState<ProviderStatementRow[]>([]);
  const [statementLoading, setStatementLoading] = useState(false);

  useEffect(() => {
    fetchProviderAccounts();
  }, []);

  const formatMoney = (value: number | string | null | undefined) => {
    const amount = Number(value || 0);
    return amount.toLocaleString("ar-SA", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const fetchProviderAccounts = async () => {
    setLoading(true);
    setErrorMessage("");

    try {
      const { data: summaries, error: summaryError } = await supabase
        .from("provider_account_summary")
        .select("*");

      if (summaryError) {
        throw summaryError;
      }

      const { data: payouts, error: payoutsError } = await supabase
        .from("payout_requests")
        .select("provider_id, amount, status");

      if (payoutsError) {
        throw payoutsError;
      }

      const payoutsByProvider = (payouts || []).reduce((acc: any, item: any) => {
        const providerId = item.provider_id;
        const amount = Number(item.amount || 0);

        if (!acc[providerId]) {
          acc[providerId] = {
            approved: 0,
            pending: 0,
            rejected: 0,
          };
        }

        if (item.status === "approved") acc[providerId].approved += amount;
        if (item.status === "pending") acc[providerId].pending += amount;
        if (item.status === "rejected") acc[providerId].rejected += amount;

        return acc;
      }, {});

      const formatted = (summaries || []).map((provider: any) => {
        const payoutInfo = payoutsByProvider[provider.provider_id] || {
          approved: 0,
          pending: 0,
          rejected: 0,
        };

        const providerTotalEarnings = Number(
          provider.provider_total_earnings || 0
        );
        const approvedPayouts = Number(payoutInfo.approved || 0);
        const pendingPayouts = Number(payoutInfo.pending || 0);

        return {
          ...provider,
          paid_bookings_count: Number(provider.paid_bookings_count || 0),
          total_sales_including_vat: Number(
            provider.total_sales_including_vat || 0
          ),
          total_vat_amount: Number(provider.total_vat_amount || 0),
          total_sales_excluding_vat: Number(
            provider.total_sales_excluding_vat || 0
          ),
          platform_total_commission: Number(
            provider.platform_total_commission || 0
          ),
          provider_total_earnings: providerTotalEarnings,
          pending_payment_count: Number(provider.pending_payment_count || 0),
          pending_approval_count: Number(provider.pending_approval_count || 0),
          cancelled_or_rejected_count: Number(
            provider.cancelled_or_rejected_count || 0
          ),
          approved_payouts: approvedPayouts,
          pending_payouts: pendingPayouts,
          rejected_payouts: Number(payoutInfo.rejected || 0),
          available_balance: Math.max(
            0,
            providerTotalEarnings - approvedPayouts - pendingPayouts
          ),
        };
      });

      formatted.sort(
        (a: any, b: any) =>
          Number(b.provider_total_earnings || 0) -
          Number(a.provider_total_earnings || 0)
      );

      setProviders(formatted);
    } catch (error: any) {
      console.error("Provider accounts error:", error);
      setErrorMessage(
        error?.message ||
          "حدث خطأ أثناء تحميل حسابات المزودين. تأكد أن provider_account_summary موجود."
      );
    } finally {
      setLoading(false);
    }
  };

  const filteredProviders = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    if (!term) return providers;

    return providers.filter((provider) => {
      return (
        provider.provider_name?.toLowerCase().includes(term) ||
        provider.provider_email?.toLowerCase().includes(term) ||
        provider.provider_id?.toLowerCase().includes(term)
      );
    });
  }, [providers, searchTerm]);

  const totals = useMemo(() => {
    return filteredProviders.reduce(
      (acc, provider) => {
        acc.totalSalesIncludingVat += provider.total_sales_including_vat;
        acc.totalVat += provider.total_vat_amount;
        acc.totalSalesExcludingVat += provider.total_sales_excluding_vat;
        acc.platformCommission += provider.platform_total_commission;
        acc.providerEarnings += provider.provider_total_earnings;
        acc.approvedPayouts += provider.approved_payouts || 0;
        acc.pendingPayouts += provider.pending_payouts || 0;
        acc.availableBalance += provider.available_balance || 0;
        acc.paidBookings += provider.paid_bookings_count;
        return acc;
      },
      {
        totalSalesIncludingVat: 0,
        totalVat: 0,
        totalSalesExcludingVat: 0,
        platformCommission: 0,
        providerEarnings: 0,
        approvedPayouts: 0,
        pendingPayouts: 0,
        availableBalance: 0,
        paidBookings: 0,
      }
    );
  }, [filteredProviders]);

  const exportToCSV = () => {
    const headers = [
      "اسم المزود",
      "البريد",
      "عدد الحجوزات المدفوعة",
      "إجمالي المبيعات شامل الضريبة",
      "ضريبة القيمة المضافة",
      "صافي المبيعات بدون الضريبة",
      "عمولة المنصة",
      "مستحق المزود",
      "المحول للمزود",
      "طلبات سحب معلقة",
      "الرصيد المتاح",
    ];

    const rows = filteredProviders.map((provider) => [
      provider.provider_name || "غير معروف",
      provider.provider_email || "-",
      provider.paid_bookings_count,
      provider.total_sales_including_vat,
      provider.total_vat_amount,
      provider.total_sales_excluding_vat,
      provider.platform_total_commission,
      provider.provider_total_earnings,
      provider.approved_payouts || 0,
      provider.pending_payouts || 0,
      provider.available_balance || 0,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" +
      headers.join(",") +
      "\n" +
      rows.map((row) => row.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "sayyir_provider_accounts.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const openProviderStatement = async (provider: ProviderAccountSummary) => {
    setSelectedProvider(provider);
    setStatementLoading(true);
    setStatementRows([]);

    try {
      const { data: bookingRows, error: bookingError } = await supabase
        .from("finance_booking_report")
        .select(
          "id, created_at, service_title, payment_status, status, gross_amount, vat_amount, net_amount_excluding_vat, platform_fee_excluding_vat, provider_net_earnings"
        )
        .eq("provider_id", provider.provider_id)
        .eq("payment_status", "paid");

      if (bookingError) throw bookingError;

      const { data: payoutRows, error: payoutError } = await supabase
        .from("payout_requests")
        .select("id, created_at, amount, status, bank_name")
        .eq("provider_id", provider.provider_id);

      if (payoutError) throw payoutError;

      const transactions: Omit<ProviderStatementRow, "balance">[] = [];

      (bookingRows || []).forEach((booking: any) => {
        transactions.push({
          id: booking.id,
          date: booking.created_at,
          reference: `BOOK-${String(booking.id).slice(0, 8).toUpperCase()}`,
          type: "booking_credit",
          description: `مستحق مزود عن حجز مدفوع - ${
            booking.service_title || "خدمة"
          }`,
          debit: 0,
          credit: Number(booking.provider_net_earnings || 0),
          status: "مدفوع",
        });
      });

      (payoutRows || []).forEach((payout: any) => {
        if (payout.status === "approved") {
          transactions.push({
            id: payout.id,
            date: payout.created_at,
            reference: `PAY-${String(payout.id).slice(0, 8).toUpperCase()}`,
            type: "payout_debit",
            description: `تحويل بنكي معتمد للمزود${
              payout.bank_name ? ` - ${payout.bank_name}` : ""
            }`,
            debit: Number(payout.amount || 0),
            credit: 0,
            status: "معتمد",
          });
        }

        if (payout.status === "pending") {
          transactions.push({
            id: payout.id,
            date: payout.created_at,
            reference: `PENDING-${String(payout.id)
              .slice(0, 8)
              .toUpperCase()}`,
            type: "pending_payout",
            description: `طلب سحب معلق قيد المراجعة${
              payout.bank_name ? ` - ${payout.bank_name}` : ""
            }`,
            debit: Number(payout.amount || 0),
            credit: 0,
            status: "معلق",
          });
        }
      });

      const sortedAsc = transactions.sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      let runningBalance = 0;

      const withBalance = sortedAsc.map((item) => {
        if (item.type === "booking_credit") {
          runningBalance += item.credit;
        }

        if (item.type === "payout_debit") {
          runningBalance -= item.debit;
        }

        if (item.type === "pending_payout") {
          runningBalance -= item.debit;
        }

        return {
          ...item,
          balance: runningBalance,
        };
      });

      setStatementRows(
        withBalance.sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        )
      );
    } catch (error: any) {
      console.error("Provider statement error:", error);
      alert("حدث خطأ أثناء تحميل كشف الحساب: " + error.message);
    } finally {
      setStatementLoading(false);
    }
  };

  const exportStatementCSV = () => {
    if (!selectedProvider) return;

    const headers = [
      "التاريخ",
      "المرجع",
      "الوصف",
      "مدين",
      "دائن",
      "الرصيد",
      "الحالة",
    ];

    const rows = statementRows.map((row) => [
      new Date(row.date).toLocaleDateString("ar-SA"),
      row.reference,
      row.description,
      row.debit.toFixed(2),
      row.credit.toFixed(2),
      row.balance.toFixed(2),
      row.status,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" +
      [`كشف حساب المزود: ${selectedProvider.provider_name || "غير معروف"}`].join(
        ","
      ) +
      "\n" +
      headers.join(",") +
      "\n" +
      rows.map((row) => row.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `provider_statement_${selectedProvider.provider_id}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const copyStatementToClipboard = async () => {
    if (!selectedProvider) return;

    const text = `
كشف حساب مزود الخدمة
اسم المزود: ${selectedProvider.provider_name || "غير معروف"}
البريد: ${selectedProvider.provider_email || "-"}
تاريخ الإصدار: ${new Date().toLocaleDateString("ar-SA")}

إجمالي المبيعات شامل الضريبة: ${formatMoney(
      selectedProvider.total_sales_including_vat
    )} ريال
ضريبة القيمة المضافة: ${formatMoney(selectedProvider.total_vat_amount)} ريال
صافي المبيعات بدون الضريبة: ${formatMoney(
      selectedProvider.total_sales_excluding_vat
    )} ريال
عمولة المنصة: ${formatMoney(selectedProvider.platform_total_commission)} ريال
مستحق المزود: ${formatMoney(selectedProvider.provider_total_earnings)} ريال
الرصيد المتاح: ${formatMoney(selectedProvider.available_balance)} ريال

الحركات:
${statementRows
  .map(
    (row) =>
      `${new Date(row.date).toLocaleDateString("ar-SA")} | ${
        row.reference
      } | ${row.description} | مدين: ${row.debit.toFixed(
        2
      )} | دائن: ${row.credit.toFixed(2)} | الرصيد: ${row.balance.toFixed(
        2
      )} | ${row.status}`
  )
  .join("\n")}
`;

    await navigator.clipboard.writeText(text);
    alert("تم نسخ كشف الحساب بنجاح");
  };

  const printStatement = () => {
    setTimeout(() => {
      window.print();
    }, 100);
  };

  if (loading) {
    return (
      <div
        className={`min-h-screen bg-[#121212] flex items-center justify-center text-[#C89B3C] ${tajawal.className}`}
        dir="rtl"
      >
        <Loader2 className="animate-spin w-12 h-12" />
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen bg-[#121212] text-white p-4 md:p-8 ${tajawal.className}`}
      dir="rtl"
    >
      <style jsx global>{`
  @media print {
    @page {
      size: A4;
      margin: 12mm;
    }

    html,
    body {
      background: #ffffff !important;
      color: #111111 !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    body * {
      visibility: hidden !important;
    }

    .print-statement,
    .print-statement * {
      visibility: visible !important;
    }

    .print-statement {
      display: block !important;
      position: absolute !important;
      inset: 0 !important;
      width: 100% !important;
      background: #ffffff !important;
      color: #111111 !important;
      padding: 0 !important;
      margin: 0 !important;
      font-family: ${tajawal.style.fontFamily}, Arial, sans-serif !important;
    }

    .print-page {
      width: 100% !important;
      max-width: 190mm !important;
      margin: 0 auto !important;
      background: #ffffff !important;
      color: #111111 !important;
    }

    .print-header {
      border-bottom: 2px solid #111111 !important;
      padding-bottom: 10px !important;
      margin-bottom: 14px !important;
      display: flex !important;
      justify-content: space-between !important;
      align-items: flex-start !important;
      gap: 12px !important;
    }

    .print-title {
      font-size: 20px !important;
      font-weight: 800 !important;
      color: #111111 !important;
      margin: 0 0 6px 0 !important;
    }

    .print-subtitle {
      font-size: 10px !important;
      color: #555555 !important;
      margin: 0 !important;
      line-height: 1.7 !important;
    }

    .print-badge {
      border: 1px solid #111111 !important;
      padding: 7px 10px !important;
      border-radius: 8px !important;
      font-size: 10px !important;
      font-weight: 700 !important;
      text-align: center !important;
      color: #111111 !important;
      white-space: nowrap !important;
    }

    .print-section {
      border: 1px solid #d0d0d0 !important;
      border-radius: 10px !important;
      padding: 10px !important;
      margin-bottom: 12px !important;
      break-inside: avoid !important;
      page-break-inside: avoid !important;
    }

    .print-section-title {
      font-size: 12px !important;
      font-weight: 800 !important;
      margin: 0 0 8px 0 !important;
      color: #111111 !important;
    }

    .print-grid {
      display: grid !important;
      grid-template-columns: repeat(3, 1fr) !important;
      gap: 8px !important;
    }

    .print-metric {
      border: 1px solid #e0e0e0 !important;
      border-radius: 8px !important;
      padding: 8px !important;
      background: #fafafa !important;
      break-inside: avoid !important;
    }

    .print-label {
      font-size: 9px !important;
      color: #666666 !important;
      margin-bottom: 4px !important;
      display: block !important;
    }

    .print-value {
      font-size: 13px !important;
      font-weight: 800 !important;
      color: #111111 !important;
      word-break: break-word !important;
    }

    .print-table {
      width: 100% !important;
      border-collapse: collapse !important;
      font-size: 9px !important;
      color: #111111 !important;
      table-layout: fixed !important;
    }

    .print-table thead {
      display: table-header-group !important;
    }

    .print-table th {
      background: #f0f0f0 !important;
      color: #111111 !important;
      border: 1px solid #cfcfcf !important;
      padding: 6px 5px !important;
      font-weight: 800 !important;
      text-align: right !important;
      vertical-align: middle !important;
    }

    .print-table td {
      border: 1px solid #dddddd !important;
      padding: 6px 5px !important;
      color: #111111 !important;
      vertical-align: top !important;
      line-height: 1.5 !important;
      word-break: break-word !important;
    }

    .print-table tr {
      break-inside: avoid !important;
      page-break-inside: avoid !important;
    }

    .print-ref {
      direction: ltr !important;
      text-align: left !important;
      font-family: Arial, sans-serif !important;
      font-size: 8px !important;
    }

    .print-money {
      direction: ltr !important;
      text-align: left !important;
      font-family: Arial, sans-serif !important;
      white-space: nowrap !important;
      font-weight: 700 !important;
    }

    .print-description {
      width: 34% !important;
    }

    .print-footer {
      margin-top: 14px !important;
      border-top: 1px solid #d0d0d0 !important;
      padding-top: 8px !important;
      font-size: 9px !important;
      color: #555555 !important;
      line-height: 1.8 !important;
      break-inside: avoid !important;
    }

    .print-signature {
      margin-top: 18px !important;
      display: grid !important;
      grid-template-columns: repeat(2, 1fr) !important;
      gap: 18px !important;
      font-size: 10px !important;
      break-inside: avoid !important;
    }

    .print-signature-box {
      border-top: 1px solid #111111 !important;
      padding-top: 6px !important;
      color: #111111 !important;
    }

    .print-hidden {
      display: none !important;
    }
  }

  @media screen {
    .print-statement {
      display: none;
    }
  }
`}</style>
      <div className="max-w-7xl mx-auto space-y-8 print:hidden">
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <Link
              href="/admin/finance"
              className="inline-flex items-center gap-2 text-white/60 hover:text-[#C89B3C] text-sm mb-4 transition"
            >
              <ArrowRight size={18} />
              العودة إلى المالية
            </Link>

            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Briefcase className="text-[#C89B3C]" />
              حسابات المزودين
            </h1>

            <p className="text-white/50 text-sm mt-2">
              ملخص آمن لمبيعات كل مزود، ضريبة القيمة المضافة، عمولة المنصة،
              والمستحقات.
            </p>
          </div>

          <button
            onClick={exportToCSV}
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-3 rounded-xl font-bold flex items-center gap-2 transition w-fit"
          >
            <Download size={18} />
            تصدير CSV
          </button>
        </header>

        {errorMessage && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl p-5 text-sm font-bold">
            {errorMessage}
          </div>
        )}

        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <p className="text-xs text-white/50 mb-2 flex items-center gap-2">
              <DollarSign size={15} />
              إجمالي المبيعات شامل الضريبة
            </p>
            <h2 className="text-2xl font-bold text-[#C89B3C]">
              {formatMoney(totals.totalSalesIncludingVat)} ﷼
            </h2>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <p className="text-xs text-white/50 mb-2 flex items-center gap-2">
              <FileText size={15} />
              ضريبة القيمة المضافة
            </p>
            <h2 className="text-2xl font-bold text-blue-400">
              {formatMoney(totals.totalVat)} ﷼
            </h2>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <p className="text-xs text-white/50 mb-2 flex items-center gap-2">
              <Calculator size={15} />
              صافي المبيعات بدون الضريبة
            </p>
            <h2 className="text-2xl font-bold text-white">
              {formatMoney(totals.totalSalesExcludingVat)} ﷼
            </h2>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <p className="text-xs text-white/50 mb-2 flex items-center gap-2">
              <Wallet size={15} />
              الرصيد المتاح للمزودين
            </p>
            <h2 className="text-2xl font-bold text-emerald-400">
              {formatMoney(totals.availableBalance)} ﷼
            </h2>
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-5">
            <p className="text-xs text-emerald-300 mb-2 flex items-center gap-2">
              <TrendingUp size={15} />
              عمولة المنصة الصافية بدون ضريبة
            </p>
            <h2 className="text-2xl font-bold text-emerald-400">
              {formatMoney(totals.platformCommission)} ﷼
            </h2>
          </div>

          <div className="bg-[#C89B3C]/10 border border-[#C89B3C]/20 rounded-2xl p-5">
            <p className="text-xs text-[#C89B3C] mb-2 flex items-center gap-2">
              <Banknote size={15} />
              إجمالي مستحقات المزودين
            </p>
            <h2 className="text-2xl font-bold text-[#C89B3C]">
              {formatMoney(totals.providerEarnings)} ﷼
            </h2>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <p className="text-xs text-white/50 mb-2 flex items-center gap-2">
              <CreditCard size={15} />
              محول / معلق
            </p>
            <h2 className="text-xl font-bold text-white">
              {formatMoney(totals.approvedPayouts)} ﷼
              <span className="text-white/30 mx-2">/</span>
              <span className="text-amber-400">
                {formatMoney(totals.pendingPayouts)} ﷼
              </span>
            </h2>
          </div>
        </section>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
          <div className="relative">
            <Search className="absolute right-3 top-3 text-white/40" size={20} />
            <input
              type="text"
              placeholder="بحث باسم المزود أو البريد..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="w-full bg-black/20 border border-white/10 rounded-xl py-2.5 pr-10 pl-4 text-white focus:border-[#C89B3C] outline-none"
            />
          </div>
        </div>

        <section className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-right min-w-[1250px]">
              <thead className="bg-black/20 text-white/50 text-xs uppercase">
                <tr>
                  <th className="px-5 py-4">المزود</th>
                  <th className="px-5 py-4">الحجوزات</th>
                  <th className="px-5 py-4">المبيعات شامل الضريبة</th>
                  <th className="px-5 py-4">ضريبة القيمة المضافة</th>
                  <th className="px-5 py-4">صافي المبيعات</th>
                  <th className="px-5 py-4">عمولة المنصة</th>
                  <th className="px-5 py-4">مستحق المزود</th>
                  <th className="px-5 py-4">السحوبات</th>
                  <th className="px-5 py-4">المتاح</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-white/5 text-sm">
                {filteredProviders.map((provider) => (
                  <tr
                    key={provider.provider_id}
                    className="hover:bg-white/5 transition"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#C89B3C]/15 text-[#C89B3C] flex items-center justify-center font-bold">
                          {provider.provider_name?.charAt(0) || "م"}
                        </div>
                        <div>
                          <button
                            onClick={() => openProviderStatement(provider)}
                            className="font-bold text-white hover:text-[#C89B3C] transition text-right underline-offset-4 hover:underline"
                          >
                            {provider.provider_name || "مزود غير معروف"}
                          </button>
                          <p className="text-xs text-white/40 font-mono">
                            {provider.provider_email || "-"}
                          </p>
                          <p className="text-[10px] text-white/25 font-mono mt-1">
                            ID: {provider.provider_id?.slice(0, 8)}...
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <p className="font-bold text-white">
                        {provider.paid_bookings_count} مدفوعة
                      </p>
                      <p className="text-xs text-amber-400 mt-1">
                        {provider.pending_payment_count} بانتظار الدفع
                      </p>
                      <p className="text-xs text-blue-400 mt-1">
                        {provider.pending_approval_count} بانتظار الموافقة
                      </p>
                    </td>

                    <td className="px-5 py-4 font-mono text-[#C89B3C] font-bold">
                      {formatMoney(provider.total_sales_including_vat)} ﷼
                    </td>

                    <td className="px-5 py-4 font-mono text-blue-400 font-bold">
                      {formatMoney(provider.total_vat_amount)} ﷼
                    </td>

                    <td className="px-5 py-4 font-mono text-white font-bold">
                      {formatMoney(provider.total_sales_excluding_vat)} ﷼
                    </td>

                    <td className="px-5 py-4">
                      <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-3 py-1 rounded-lg font-mono font-bold text-xs">
                        {formatMoney(provider.platform_total_commission)} ﷼
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <span className="bg-[#C89B3C]/10 border border-[#C89B3C]/20 text-[#C89B3C] px-3 py-1 rounded-lg font-mono font-bold text-xs">
                        {formatMoney(provider.provider_total_earnings)} ﷼
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <p className="text-xs text-emerald-400">
                        محول: {formatMoney(provider.approved_payouts)} ﷼
                      </p>
                      <p className="text-xs text-amber-400 mt-1">
                        معلق: {formatMoney(provider.pending_payouts)} ﷼
                      </p>
                      <p className="text-xs text-red-400 mt-1">
                        مرفوض: {formatMoney(provider.rejected_payouts)} ﷼
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <span className="bg-white/10 border border-white/10 text-white px-3 py-1 rounded-lg font-mono font-bold text-xs">
                        {formatMoney(provider.available_balance)} ﷼
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredProviders.length === 0 && (
              <div className="p-20 text-center text-white/40">
                لا توجد حسابات مزودين مطابقة.
              </div>
            )}
          </div>
        </section>

        <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-5 text-sm text-blue-200 leading-relaxed">
          <div className="flex items-start gap-3">
            <ShieldCheck className="text-blue-400 shrink-0 mt-0.5" size={20} />
            <p>
              يتم حساب مستحق المزود من صافي المبلغ بعد فصل ضريبة القيمة
              المضافة، ثم خصم عمولة المنصة. الرصيد المتاح = مستحق المزود ناقص
              التحويلات المعتمدة وطلبات السحب المعلقة.
            </p>
          </div>
        </div>
      </div>

      {selectedProvider && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 print:static print:bg-white print:p-0">
          <div className="bg-[#161616] border border-white/10 rounded-3xl w-full max-w-6xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col print:max-h-none print:rounded-none print:border-none print:shadow-none print:bg-white print:text-black">
            <div className="p-6 border-b border-white/10 flex flex-col md:flex-row md:items-center md:justify-between gap-4 print:border-black">
              <div>
                <p className="text-xs text-[#C89B3C] font-bold mb-1">
                  SAYYIR PROVIDER ACCOUNT STATEMENT
                </p>
                <h2 className="text-2xl font-bold text-white print:text-black">
                  كشف حساب مزود الخدمة
                </h2>
                <p className="text-white/50 text-sm mt-1 print:text-black/60">
                  تاريخ الإصدار: {new Date().toLocaleDateString("ar-SA")}
                </p>
              </div>

              <div className="flex flex-wrap gap-2 print:hidden">
                <button
                  onClick={exportStatementCSV}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2"
                >
                  <FileSpreadsheet size={16} />
                  Excel / CSV
                </button>

                <button
                  onClick={copyStatementToClipboard}
                  className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2"
                >
                  <Copy size={16} />
                  نسخ
                </button>

                <button
                  onClick={printStatement}
                  className="bg-[#C89B3C] hover:bg-[#b38a35] text-black px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2"
                >
                  <Printer size={16} />
                  PDF / طباعة
                </button>

                <button
                  onClick={() => setSelectedProvider(null)}
                  className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2"
                >
                  <X size={16} />
                  إغلاق
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar print:overflow-visible">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-5 print:bg-white print:border-black">
                  <p className="text-xs text-white/50 print:text-black/60 mb-1">
                    اسم المزود
                  </p>
                  <h3 className="font-bold text-white print:text-black">
                    {selectedProvider.provider_name || "غير معروف"}
                  </h3>
                  <p className="text-xs text-white/40 print:text-black/60 mt-1">
                    {selectedProvider.provider_email || "-"}
                  </p>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-2xl p-5 print:bg-white print:border-black">
                  <p className="text-xs text-white/50 print:text-black/60 mb-1">
                    رقم المزود
                  </p>
                  <h3 className="font-mono text-sm text-[#C89B3C] print:text-black break-all">
                    {selectedProvider.provider_id}
                  </h3>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-2xl p-5 print:bg-white print:border-black">
                  <p className="text-xs text-white/50 print:text-black/60 mb-1">
                    عدد الحجوزات المدفوعة
                  </p>
                  <h3 className="text-2xl font-bold text-white print:text-black">
                    {selectedProvider.paid_bookings_count}
                  </h3>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-[#C89B3C]/10 border border-[#C89B3C]/20 rounded-2xl p-5 print:bg-white print:border-black">
                  <p className="text-xs text-[#C89B3C] print:text-black/60 mb-1">
                    المبيعات شامل الضريبة
                  </p>
                  <h3 className="text-xl font-bold text-[#C89B3C] print:text-black">
                    {formatMoney(selectedProvider.total_sales_including_vat)} ﷼
                  </h3>
                </div>

                <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-5 print:bg-white print:border-black">
                  <p className="text-xs text-blue-300 print:text-black/60 mb-1">
                    ضريبة القيمة المضافة
                  </p>
                  <h3 className="text-xl font-bold text-blue-400 print:text-black">
                    {formatMoney(selectedProvider.total_vat_amount)} ﷼
                  </h3>
                </div>

                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-5 print:bg-white print:border-black">
                  <p className="text-xs text-emerald-300 print:text-black/60 mb-1">
                    عمولة المنصة
                  </p>
                  <h3 className="text-xl font-bold text-emerald-400 print:text-black">
                    {formatMoney(selectedProvider.platform_total_commission)} ﷼
                  </h3>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-2xl p-5 print:bg-white print:border-black">
                  <p className="text-xs text-white/50 print:text-black/60 mb-1">
                    الرصيد المتاح
                  </p>
                  <h3 className="text-xl font-bold text-white print:text-black">
                    {formatMoney(selectedProvider.available_balance)} ﷼
                  </h3>
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden print:bg-white print:border-black">
                <div className="p-4 border-b border-white/10 flex items-center gap-2 print:border-black">
                  <CalendarDays size={18} className="text-[#C89B3C]" />
                  <h3 className="font-bold text-white print:text-black">
                    حركة الحساب
                  </h3>
                </div>

                {statementLoading ? (
                  <div className="p-20 flex justify-center text-[#C89B3C]">
                    <Loader2 className="animate-spin w-10 h-10" />
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-right min-w-[950px] text-sm">
                      <thead className="bg-black/20 text-white/50 print:bg-gray-200 print:text-black">
                        <tr>
                          <th className="px-4 py-3">التاريخ</th>
                          <th className="px-4 py-3">المرجع</th>
                          <th className="px-4 py-3">الوصف</th>
                          <th className="px-4 py-3">مدين</th>
                          <th className="px-4 py-3">دائن</th>
                          <th className="px-4 py-3">الرصيد</th>
                          <th className="px-4 py-3">الحالة</th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-white/5 print:divide-gray-300">
                        {statementRows.map((row) => (
                          <tr key={`${row.type}-${row.id}`}>
                            <td className="px-4 py-3">
                              {new Date(row.date).toLocaleDateString("ar-SA")}
                            </td>
                            <td className="px-4 py-3 font-mono text-xs">
                              {row.reference}
                            </td>
                            <td className="px-4 py-3">{row.description}</td>
                            <td className="px-4 py-3 font-mono text-red-400 print:text-black">
                              {row.debit > 0
                                ? `${formatMoney(row.debit)} ﷼`
                                : "-"}
                            </td>
                            <td className="px-4 py-3 font-mono text-emerald-400 print:text-black">
                              {row.credit > 0
                                ? `${formatMoney(row.credit)} ﷼`
                                : "-"}
                            </td>
                            <td className="px-4 py-3 font-mono font-bold text-white print:text-black">
                              {formatMoney(row.balance)} ﷼
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`px-2 py-1 rounded text-xs font-bold ${
                                  row.status === "مدفوع"
                                    ? "bg-emerald-500/20 text-emerald-400"
                                    : row.status === "معلق"
                                    ? "bg-amber-500/20 text-amber-400"
                                    : "bg-blue-500/20 text-blue-400"
                                }`}
                              >
                                {row.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {statementRows.length === 0 && (
                      <div className="p-12 text-center text-white/40 print:text-black/50">
                        لا توجد حركات مالية لهذا المزود.
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-6 bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 text-xs text-blue-200 leading-relaxed print:bg-white print:border-black print:text-black">
                هذا الكشف صادر من لوحة إدارة منصة سَيّر بناءً على الحجوزات
                المدفوعة وطلبات السحب المسجلة في النظام. المبالغ المعروضة تفصل
                ضريبة القيمة المضافة عن صافي المبيعات ثم تحتسب عمولة المنصة
                ومستحق المزود.
              </div>
            </div>
          </div>
        </div>
      )}
      {selectedProvider && (
  <div className="print-statement">
    <div className="print-page">
      <div className="print-header">
        <div>
          <h1 className="print-title">كشف حساب مزود الخدمة</h1>
          <p className="print-subtitle">
            منصة سَيّر | Provider Account Statement
            <br />
            تاريخ الإصدار: {new Date().toLocaleDateString("ar-SA")}
          </p>
        </div>

        <div className="print-badge">
          نسخة مالية رسمية
          <br />
          SAYYIR FINANCE
        </div>
      </div>

      <div className="print-section">
        <h2 className="print-section-title">بيانات المزود</h2>

        <div className="print-grid">
          <div className="print-metric">
            <span className="print-label">اسم المزود</span>
            <div className="print-value">
              {selectedProvider.provider_name || "غير معروف"}
            </div>
          </div>

          <div className="print-metric">
            <span className="print-label">البريد الإلكتروني</span>
            <div className="print-value">
              {selectedProvider.provider_email || "-"}
            </div>
          </div>

          <div className="print-metric">
            <span className="print-label">عدد الحجوزات المدفوعة</span>
            <div className="print-value">
              {selectedProvider.paid_bookings_count}
            </div>
          </div>
        </div>

        <div className="print-metric" style={{ marginTop: 8 }}>
          <span className="print-label">رقم المزود</span>
          <div className="print-value" style={{ direction: "ltr", textAlign: "left" }}>
            {selectedProvider.provider_id}
          </div>
        </div>
      </div>

      <div className="print-section">
        <h2 className="print-section-title">الملخص المالي</h2>

        <div className="print-grid">
          <div className="print-metric">
            <span className="print-label">إجمالي المبيعات شامل الضريبة</span>
            <div className="print-value">
              {formatMoney(selectedProvider.total_sales_including_vat)} ر.س
            </div>
          </div>

          <div className="print-metric">
            <span className="print-label">ضريبة القيمة المضافة</span>
            <div className="print-value">
              {formatMoney(selectedProvider.total_vat_amount)} ر.س
            </div>
          </div>

          <div className="print-metric">
            <span className="print-label">صافي المبيعات بدون الضريبة</span>
            <div className="print-value">
              {formatMoney(selectedProvider.total_sales_excluding_vat)} ر.س
            </div>
          </div>

          <div className="print-metric">
            <span className="print-label">عمولة المنصة</span>
            <div className="print-value">
              {formatMoney(selectedProvider.platform_total_commission)} ر.س
            </div>
          </div>

          <div className="print-metric">
            <span className="print-label">إجمالي مستحق المزود</span>
            <div className="print-value">
              {formatMoney(selectedProvider.provider_total_earnings)} ر.س
            </div>
          </div>

          <div className="print-metric">
            <span className="print-label">الرصيد المتاح</span>
            <div className="print-value">
              {formatMoney(selectedProvider.available_balance)} ر.س
            </div>
          </div>
        </div>
      </div>

      <div className="print-section">
        <h2 className="print-section-title">حركة الحساب</h2>

        <table className="print-table">
          <thead>
            <tr>
              <th style={{ width: "11%" }}>التاريخ</th>
              <th style={{ width: "15%" }}>المرجع</th>
              <th className="print-description">الوصف</th>
              <th style={{ width: "10%" }}>مدين</th>
              <th style={{ width: "10%" }}>دائن</th>
              <th style={{ width: "10%" }}>الرصيد</th>
              <th style={{ width: "10%" }}>الحالة</th>
            </tr>
          </thead>

          <tbody>
            {statementRows.length > 0 ? (
              statementRows.map((row) => (
                <tr key={`print-${row.type}-${row.id}`}>
                  <td>{new Date(row.date).toLocaleDateString("ar-SA")}</td>

                  <td className="print-ref">
                    {row.reference}
                  </td>

                  <td>
                    {row.description}
                  </td>

                  <td className="print-money">
                    {row.debit > 0 ? `${formatMoney(row.debit)} ر.س` : "-"}
                  </td>

                  <td className="print-money">
                    {row.credit > 0 ? `${formatMoney(row.credit)} ر.س` : "-"}
                  </td>

                  <td className="print-money">
                    {formatMoney(row.balance)} ر.س
                  </td>

                  <td>
                    {row.status}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: 16 }}>
                  لا توجد حركات مالية لهذا المزود
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="print-footer">
        هذا الكشف صادر من لوحة إدارة منصة سَيّر بناءً على الحجوزات المدفوعة وطلبات السحب المسجلة في النظام.
        يتم فصل ضريبة القيمة المضافة عن صافي المبيعات ثم احتساب عمولة المنصة ومستحق المزود.
      </div>

      <div className="print-signature">
        <div className="print-signature-box">
          إعداد الإدارة المالية
        </div>

        <div className="print-signature-box">
          اعتماد الإدارة
        </div>
      </div>
    </div>
  </div>
)}
    </div>
  );
}