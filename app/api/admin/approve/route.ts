import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { checkAdminPermission } from '@/lib/adminGuard'; // ✅ 1. استدعاء الحارس

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export async function POST(req: Request) {
  try {
    // ✅ 2. استقبال requesterId من الواجهة الأمامية
    const { requestId, requesterId } = await req.json();

    // ✅ 3. التحقق الأمني: هل يملك هذا الأدمن صلاحية قبول الطلبات؟
    const permissionCheck = await checkAdminPermission(requesterId, 'requests_approve');
    
    if (!permissionCheck.success) {
        // إذا لم يكن لديه صلاحية، نوقف العملية فوراً ونرجع خطأ
        return NextResponse.json({ error: permissionCheck.message }, { status: 403 });
    }

    // --- بداية الكود الأصلي (كما هو) ---

    // 1. جلب بيانات الطلب
    const { data: requestData, error: fetchError } = await supabaseAdmin
      .from('provider_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (fetchError || !requestData) {
      return NextResponse.json({ error: "الطلب غير موجود" }, { status: 404 });
    }

    // 2. التحقق مما إذا كان المستخدم موجوداً
    const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = users.find(u => u.email === requestData.email);

    let userId = "";
    let tempPassword = null;

    if (!existingUser) {
        // --- (أ) مستخدم جديد ---
        const randomNum = Math.floor(1000 + Math.random() * 9000);
        tempPassword = `Sayyir@${randomNum}`; 

        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email: requestData.email,
            password: tempPassword,
            email_confirm: true,
            user_metadata: { 
                full_name: requestData.name, 
                is_provider: true 
            }
        });

        if (createError) throw createError;
        if (!newUser.user) throw new Error("فشل إنشاء المستخدم");
        
        userId = newUser.user.id;

        await supabaseAdmin.auth.admin.updateUserById(userId, { email_confirm: true });

        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .update({ is_provider: true })
            .eq('id', userId);
            
        if (profileError) { 
             console.log("Profile update failed, attempting insert...");
             await supabaseAdmin.from('profiles').upsert({
                 id: userId,
                 email: requestData.email,
                 full_name: requestData.name,
                 is_provider: true
             });
        }

    } else {
        // --- (ب) مستخدم موجود ---
        userId = existingUser.id;
        
        await supabaseAdmin.auth.admin.updateUserById(userId, { 
            user_metadata: { ...existingUser.user_metadata, is_provider: true } 
        });
        
        await supabaseAdmin
            .from('profiles')
            .update({ is_provider: true })
            .eq('id', userId);
    }

    // 3. تحديث حالة الطلب
    await supabaseAdmin
      .from('provider_requests')
      .update({ status: 'approved' })
      .eq('id', requestId);

    // 4. إرسال الإيميل
    const loginLink = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/login`;
    
    try {
      await transporter.sendMail({
        from: `"منصة سيّر" <${process.env.GMAIL_USER}>`,
        to: requestData.email,
        subject: '🎉 تمت الموافقة على طلبك - منصة سيّر',
        html: `
          <div dir="rtl" style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; background-color: #f9f9f9; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 30px; border-radius: 10px; border: 1px solid #e0e0e0;">
                <h2 style="color: #C89B3C; text-align: center;">مرحباً ${requestData.name}</h2>
                <p>تم قبول طلبك للانضمام كشريك نجاح.</p>
                
                ${tempPassword ? `
                <div style="background-color: #fff8e1; border: 1px solid #ffe0b2; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 0; font-weight: bold; color: #f57c00;">بيانات الدخول:</p>
                    <p style="margin: 5px 0;">البريد: ${requestData.email}</p>
                    <p style="margin: 5px 0;">كلمة المرور: <code>${tempPassword}</code></p>
                </div>
                ` : `<p style="color: green;">تم ترقية حسابك الحالي.</p>`}

                <div style="text-align: center; margin-top: 30px;">
                    <a href="${loginLink}" style="background-color: #C89B3C; color: #fff; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">دخول</a>
                </div>
            </div>
          </div>
        `,
      });
    } catch (e) {
      console.error("Email error:", e);
    }

    return NextResponse.json({ success: true, message: "تمت الموافقة وتعيين الصلاحيات بنجاح" });

  } catch (error: any) {
    console.error("Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}