// test-sms.js
require('dotenv').config({ path: '.env.local' }); // تأكد أنك مثبت مكتبة dotenv
const client = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

client.messages
  .create({
     body: 'تست تست.. هل تسمعني؟ 📡',
     from: process.env.TWILIO_PHONE_NUMBER, // رقمك الأمريكي
     to: '+966579889822' // 🛑 حط رقم جوالك هنا مع مفتاح الدولة
   })
  .then(message => console.log("✅ نجح الإرسال! SID:", message.sid))
  .catch(error => console.error("❌ فشل:", error));
