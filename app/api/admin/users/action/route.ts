import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// إعداد صلاحيات السوبر أدمن للتحكم الكامل
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { action, userId, requesterId, logDetails, newStatus } = await req.json();

    // 1. التحقق من أن الطالب أدمن
    const { data: requester } = await supabaseAdmin.from('profiles').select('is_admin').eq('id', requesterId).single();
    if (!requester?.is_admin) return NextResponse.json({ error: "غير مصرح لك" }, { status: 403 });

    // ==========================================
    // حالة الحذف (الأرشفة الذكية)
    // ==========================================
    if (action === 'delete') {
      
      // أ. جلب إيميل المستخدم الحالي أولاً
      const { data: targetUser, error: fetchError } = await supabaseAdmin.auth.admin.getUserById(userId);
      if (fetchError) throw fetchError;

      const originalEmail = targetUser.user.email;
      const archivedEmail = `deleted_${Date.now()}_${originalEmail}`; // إيميل وهمي لتحرير الأصلي

      // ب. تحديث بيانات المصادقة (Auth): تغيير الإيميل وحظر الدخول
      // هذا يحرر الإيميل الأصلي فوراً
      const { error: authUpdateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        email: archivedEmail,
        ban_duration: '876000h', // حظر 100 سنة لهذا الحساب القديم
        user_metadata: { is_deleted: true, original_email: originalEmail }
      });

      if (authUpdateError) throw authUpdateError;

      // ج. تحديث ملف البروفايل (Profile): وضع علامة محذوف وتحديث الإيميل
      const { error: profileUpdateError } = await supabaseAdmin
        .from('profiles')
        .update({ 
          is_deleted: true, 
          is_blocked: true,
          email: archivedEmail, // نحدثه هنا أيضاً ليعرف الأدمن أنه محذوف
          deleted_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (profileUpdateError) throw profileUpdateError;

      return NextResponse.json({ 
        success: true, 
        message: "تم حذف المستخدم وأرشفة بياناته. يمكنه الآن التسجيل مجدداً بنفس الإيميل." 
      });
    }

    // ==========================================
    // حالة الحظر/فك الحظر (تعديل بسيط)
    // ==========================================
    if (action === 'toggle_ban') {
       // تحديث البروفايل
       const { error } = await supabaseAdmin.from('profiles').update({ is_blocked: newStatus }).eq('id', userId);
       if (error) throw error;
       
       // تحديث الـ Auth
       if (newStatus) {
         await supabaseAdmin.auth.admin.updateUserById(userId, { ban_duration: '876000h' });
       } else {
         await supabaseAdmin.auth.admin.updateUserById(userId, { ban_duration: 'none' });
       }
       
       return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "أمر غير معروف" }, { status: 400 });

  } catch (error: any) {
    console.error("Action Error:", error);
    return NextResponse.json({ error: error.message || "حدث خطأ غير متوقع" }, { status: 500 });
  }
}