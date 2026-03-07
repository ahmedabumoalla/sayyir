"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

type Language = "ar" | "en";

interface TranslationContextType {
  language: Language;
  toggleLanguage: () => void;
  t: (key: string) => string;
}

const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

// قاموس الترجمة الشامل للوحة تحكم الإدارة
const translations: Record<string, Record<Language, string>> = {
  // General & Layout
  "welcome": { ar: "أهلاً،", en: "Welcome," },
  "admin_panel": { ar: "لوحة الإدارة", en: "Admin Panel" },
  "loading": { ar: "جاري التحميل...", en: "Loading..." },
  "success_save": { ar: "✅ تم الحفظ بنجاح!", en: "✅ Saved Successfully!" },
  "error_save": { ar: "❌ خطأ:", en: "❌ Error:" },
  "back": { ar: "رجوع", en: "Back" },
  "close": { ar: "إغلاق", en: "Close" },

  // Dashboard Stats
  "dashboard_desc": { ar: "نظرة عامة على أداء المنصة.", en: "Overview of platform performance." },
  "total_revenue": { ar: "إجمالي الأرباح", en: "Total Revenue" },
  "approved_providers": { ar: "الشركاء المعتمدين", en: "Approved Providers" },
  "pending_operations": { ar: "إجمالي العمليات المعلقة", en: "Total Pending Operations" },
  "customers_users": { ar: "المستخدمين (العملاء)", en: "Users (Customers)" },
  "currency": { ar: "﷼", en: "SAR" },

  // Activity Log
  "recent_activity_log": { ar: "سجل العمليات الحديثة", en: "Recent Activity Log" },
  "show_all": { ar: "عرض الكل", en: "Show All" },
  "show_less": { ar: "عرض أقل", en: "Show Less" },
  "no_recent_activity": { ar: "لا توجد عمليات مسجلة حديثاً.", en: "No recent activity logged." },
  "by": { ar: "بواسطة:", en: "By:" },
  "operation_type": { ar: "نوع العملية", en: "Operation Type" },
  "full_details": { ar: "التفاصيل الكاملة", en: "Full Details" },
  "executor": { ar: "المنفذ", en: "Executor" },
  "timing": { ar: "التوقيت", en: "Timing" },

  // Quick Actions
  "quick_actions": { ar: "إجراءات سريعة", en: "Quick Actions" },
  "manage_join_requests": { ar: "إدارة طلبات الانضمام", en: "Manage Join Requests" },
  "review_services": { ar: "مراجعة الخدمات", en: "Review Services" },
  "manage_landmarks": { ar: "إدارة المعالم", en: "Manage Landmarks" },
  "platform_settings": { ar: "إعدادات المنصة", en: "Platform Settings" },
  
  // Log Styles Labels
  "update_settings": { ar: "تحديث إعدادات", en: "Update Settings" },
  "financial_approval": { ar: "موافقة مالية", en: "Financial Approval" },
  "financial_rejection": { ar: "رفض مالي", en: "Financial Rejection" },
  "landmarks_management": { ar: "إدارة المعالم", en: "Landmarks Management" },
  "ban_user": { ar: "حظر مستخدم", en: "Ban User" },
  "activate_user": { ar: "تفعيل مستخدم", en: "Activate User" },
  "approved": { ar: "تمت الموافقة", en: "Approved" },
  "rejected": { ar: "تم الرفض", en: "Rejected" },
  "delete_operation": { ar: "عملية حذف", en: "Delete Operation" },
  "edit_operation": { ar: "تعديل", en: "Edit" },
  "financial_operation": { ar: "عملية مالية", en: "Financial Operation" },
  "service": { ar: "خدمة", en: "Service" },
  "new_request": { ar: "طلب جديد", en: "New Request" },
  "operation": { ar: "عملية", en: "Operation" },

  // Add more translations here for other pages...
};

export const TranslationProvider = ({ children }: { children: React.ReactNode }) => {
  const [language, setLanguage] = useState<Language>("ar");

  useEffect(() => {
    const savedLang = localStorage.getItem("admin_lang") as Language;
    if (savedLang === "ar" || savedLang === "en") {
      setLanguage(savedLang);
    }
  }, []);

  const toggleLanguage = () => {
    setLanguage((prev) => {
      const newLang = prev === "ar" ? "en" : "ar";
      localStorage.setItem("admin_lang", newLang); 
      return newLang;
    });
  };

  const t = (key: string): string => {
    return translations[key]?.[language] || key;
  };

  return (
    <TranslationContext.Provider value={{ language, toggleLanguage, t }}>
      {children}
    </TranslationContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(TranslationContext);
  if (!context) {
    throw new Error("useTranslation must be used within a TranslationProvider");
  }
  return context;
};