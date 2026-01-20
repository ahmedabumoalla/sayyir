const sharp = require('sharp');
const fs = require('fs');

async function generateIcons() {
  const inputFile = 'logo.png'; // تأكد أن اسم شعارك كذا

  if (!fs.existsSync(inputFile)) {
    console.error('❌ الخطأ: ملف logo.png غير موجود!');
    return;
  }

  console.log('🔄 جاري توليد الأيقونات...');

  try {
    // 1. icon.png (512x512 - خلفية شفافة)
    await sharp(inputFile)
      .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .toFile('icon.png');
    console.log('✅ تم إنشاء: icon.png');

    // 2. favicon.ico (32x32 - هنا بنسويها png صغيرة ونسميها ico لأن المتصفحات تقبلها)
    await sharp(inputFile)
      .resize(32, 32, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .toFile('favicon.ico');
    console.log('✅ تم إنشاء: favicon.ico');

    // 3. apple-icon.png (180x180 - خلفية بيضاء وهوامش)
    // نصغر الشعار لـ 140 عشان نترك هوامش بيضاء
    const appleLogo = await sharp(inputFile)
      .resize(140, 140, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .toBuffer();

    await sharp({
      create: {
        width: 180,
        height: 180,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 } // أبيض
      }
    })
    .composite([{ input: appleLogo, gravity: 'center' }])
    .toFile('apple-icon.png');
    console.log('✅ تم إنشاء: apple-icon.png (خلفية بيضاء)');

    // 4. opengraph-image.png (1200x630 - خلفية بيضاء وشعار بالوسط)
    const ogLogo = await sharp(inputFile)
      .resize(1200, 400, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }) // ارتفاع الشعار 400
      .toBuffer();

    await sharp({
      create: {
        width: 1200,
        height: 630,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 } // أبيض
      }
    })
    .composite([{ input: ogLogo, gravity: 'center' }])
    .toFile('opengraph-image.png');
    console.log('✅ تم إنشاء: opengraph-image.png');

  } catch (error) {
    console.error('❌ حدث خطأ:', error);
  }
}

generateIcons();