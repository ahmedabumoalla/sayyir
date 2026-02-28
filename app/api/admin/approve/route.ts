import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { checkAdminPermission } from '@/lib/adminGuard'; 

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(req: Request) {
  try {
    const { requestId, requesterId, customCommission } = await req.json();

    const permissionCheck = await checkAdminPermission(requesterId, 'requests_approve');
    if (!permissionCheck.success) return NextResponse.json({ error: permissionCheck.message }, { status: 403 });

    const { data: requestData } = await supabaseAdmin.from('provider_requests').select('*').eq('id', requestId).single();
    if (!requestData) return NextResponse.json({ error: "الطلب غير موجود" }, { status: 404 });

    const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = users.find(u => u.email === requestData.email);
    let userId = existingUser?.id;
    let tempPassword = null;

    if (!existingUser) {
        const randomNum = Math.floor(1000 + Math.random() * 9000);
        tempPassword = `Sayyir@${randomNum}`; 
        const { data: newUser } = await supabaseAdmin.auth.admin.createUser({
            email: requestData.email, password: tempPassword, email_confirm: true,
            user_metadata: { full_name: requestData.name, is_provider: true }
        });
        userId = newUser.user!.id;
        
        await supabaseAdmin.from('profiles').upsert({ 
            id: userId, 
            email: requestData.email, 
            full_name: requestData.name, 
            is_provider: true,
            custom_commission: customCommission !== undefined ? customCommission : null
        });
    } else {
        await supabaseAdmin.auth.admin.updateUserById(userId!, { user_metadata: { ...existingUser.user_metadata, is_provider: true } });
        
        await supabaseAdmin.from('profiles').update({ 
            is_provider: true,
            custom_commission: customCommission !== undefined ? customCommission : null
        }).eq('id', userId);
    }

    await supabaseAdmin.from('provider_requests').update({ status: 'approved' }).eq('id', requestId);

    const baseUrl = process.env.NODE_ENV === 'development' 
        ? 'http://localhost:3000' 
        : (process.env.NEXT_PUBLIC_SITE_URL || 'https://sayyir.sa');
    
    const emailResponse = await fetch(`${baseUrl}/api/emails/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            type: 'provider_approved',
            email: requestData.email,
            name: requestData.name,
            password: tempPassword || 'كلمة مرورك السابقة (لديك حساب مسبقاً)',
            clientPhone: requestData.phone 
        })
    });

    if (!emailResponse.ok) {
        console.error("فشل إرسال الإيميل للمزود:", await emailResponse.text());
    }

    return NextResponse.json({ success: true, message: "تمت الموافقة وإرسال الإشعارات بنجاح" });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}