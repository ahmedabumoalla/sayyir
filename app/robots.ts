import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/api/'], // نمنع جوجل من أرشفة لوحة الأدمن والـ API
    },
    sitemap: 'https://sayyir.sa/sitemap.xml',
  };
}