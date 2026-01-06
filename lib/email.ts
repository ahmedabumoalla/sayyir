import { Resend } from 'resend';

// تأكد من وضع المفتاح في ملف .env
// RESEND_API_KEY=re_123456...
const resend = new Resend(process.env.RESEND_API_KEY);

// الدالة الأساسية للإرسال
export const sendEmail = async (to: string, subject: string, html: string) => {
  if (!process.env.RESEND_API_KEY) {
    console.log("⚠️ Resend Key missing, logging email instead:");
    console.log(`To: ${to}, Subject: ${subject}`);
    return { success: true };
  }

  try {
    const data = await resend.emails.send({
      from: 'Sayyir App <onboarding@resend.dev>', // استبدله بدومينك الحقيقي إذا فعلته
      to,
      subject,
      html,
    });
    return data;
  } catch (error) {
    console.error('Email error:', error);
    return { error };
  }
};

// --- الدالة الناقصة 1: إيميل القبول ---
export const sendWelcomeProviderEmail = async (email: string, name: string) => {
  const subject = '🎉 مبروك! تم قبول طلبك في تطبيق سَير';
  const html = `
    <div style="direction: rtl; font-family: Arial, sans-serif; color: #333;">
      <h2 style="color: #C89B3C;">أهلاً بك يا ${name}!</h2>
      <p>يسعدنا إبلاغك بأنه تمت الموافقة على طلبك للانضمام كمزود خدمة في منصة سَير.</p>
      <p>يمكنك الآن الدخول إلى لوحة التحكم الخاصة بك والبدء في إضافة خدماتك واستقبال الحجوزات.</p>
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/provider" style="background-color: #C89B3C; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 20px;">الذهاب للوحة التحكم</a>
      <br/><br/>
      <p>نتمنى لك رحلة موفقة معنا!</p>
      <p>فريق سَير</p>
    </div>
  `;
  return await sendEmail(email, subject, html);
};

// --- الدالة الناقصة 2: إيميل الرفض ---
export const sendRejectionEmail = async (email: string, name: string, reason: string) => {
  const subject = 'تحديث بخصوص طلب الانضمام لتطبيق سَير';
  const html = `
    <div style="direction: rtl; font-family: Arial, sans-serif; color: #333;">
      <h2>مرحباً ${name}</h2>
      <p>شكراً لاهتمامك بالانضمام إلينا.</p>
      <p>نعتذر منك، لم يتم قبول طلبك في الوقت الحالي للأسباب التالية:</p>
      <blockquote style="background: #f9f9f9; border-right: 4px solid #cc0000; padding: 10px; margin: 20px 0;">
        ${reason}
      </blockquote>
      <p>يمكنك معالجة الملاحظات والتقديم مرة أخرى مستقبلاً.</p>
      <br/>
      <p>فريق سَير</p>
    </div>
  `;
  return await sendEmail(email, subject, html);
};