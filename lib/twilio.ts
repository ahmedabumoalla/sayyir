import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioNumber = process.env.TWILIO_PHONE_NUMBER;

const client = twilio(accountSid, authToken);

interface SendSMSParams {
  to: string;
  body: string;
}

export async function sendSMS({ to, body }: SendSMSParams) {
  try {
    // تنظيف الرقم وتحويله دولي
    let cleanPhone = to.toString().trim();
    
    // إذا يبدأ بـ 05 نحوله +9665
    if (cleanPhone.startsWith('05')) {
        cleanPhone = cleanPhone.replace('05', '+9665');
    }
    // إذا نسينا المفتاح الدولي
    else if (!cleanPhone.startsWith('+')) {
        cleanPhone = `+966${cleanPhone}`;
    }

    console.log(`📤 جاري الإرسال من ${twilioNumber} إلى ${cleanPhone}`);

    const message = await client.messages.create({
      body: body,
      from: twilioNumber, // لازم يكون الرقم الأمريكي
      to: cleanPhone,
    });

    console.log(`✅ تم الإرسال بنجاح! SID: ${message.sid}`);
    return message;

  } catch (error: any) {
    console.error("❌ فشل إرسال الرسالة:", error.message);
    // كود 21608 يعني الرقم غير موثق في الحساب المجاني
    if (error.code === 21608) {
        console.error("💡 الحل: لازم توثق هذا الرقم في لوحة تحكم تويليو لأن حسابك مجاني.");
    }
    return null;
  }
}