-- تنظيف اختياري وآمن لجدول المعالم فقط.
-- لا تشغله إلا بعد التأكد من أن الواجهة رجعت تعرض المعالم بدون أسعار وبدون حجز.
-- لا يلمس الصور، ولا يلمس services، ولا الحجوزات.

update public.places
set price = null
where is_active = true
  and price is not null
returning id, name, price;
