import fs from "fs";

const env = {};
fs.readFileSync(".env.local", "utf8").split(/\r?\n/).forEach(line => {
  if (!line || line.trim().startsWith("#") || !line.includes("=")) return;
  const [k, ...v] = line.split("=");
  env[k.trim()] = v.join("=").trim().replace(/^["']|["']$/g, "");
});

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const headers = {
  apikey: key,
  Authorization: `Bearer ${key}`,
  Accept: "application/json"
};

async function get(path) {
  const res = await fetch(`${url}/rest/v1/${path}`, { headers });
  const text = await res.text();
  if (!res.ok) throw new Error(text);
  return JSON.parse(text);
}

const rows = await get(
  "services?select=id,title,status,service_category,sub_category,created_at,updated_at,image_url,details,pending_updates,delete_reason,stop_dates,provider_id&order=updated_at.desc&limit=1000"
);

const terms = ["قصر", "نايد", "نائد", "نزل", "nayid", "nayed", "naid", "qasr"];
const found = rows.filter(r => {
  const text = `${r.title || ""} ${r.description || ""}`.toLowerCase();
  return terms.some(t => text.includes(t.toLowerCase()));
});

console.log("\n=== النتائج المحتملة لخدمة نزل قصر نايد ===\n");

if (!found.length) {
  console.log("ما لقيت نتيجة بالاسم. جرّب تبحث بالاسم من Supabase مباشرة أو ارفع لي نتيجة الخدمات.");
} else {
  for (const s of found) {
    const images = Array.isArray(s.details?.images) ? s.details.images.length : 0;
    console.log({
      id: s.id,
      title: s.title,
      status: s.status,
      service_category: s.service_category,
      sub_category: s.sub_category,
      created_at: s.created_at,
      updated_at: s.updated_at,
      has_image_url: !!s.image_url,
      details_images_count: images,
      has_pending_updates: !!s.pending_updates,
      delete_reason: s.delete_reason || null,
      stop_dates: s.stop_dates || null
    });

    if (s.status !== "approved") {
      console.log("⚠️ سبب الاختفاء: هذه الخدمة لن تظهر في الواجهة العامة لأن status ليست approved.");
    } else {
      console.log("✅ الحالة approved، المفترض تظهر في صفحة المرافق إلا إذا المشكلة في التصنيف أو الصورة أو RLS.");
    }

    console.log("--------------------------------------------------");
  }
}
