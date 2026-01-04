// مثال لكيفية جلب البيانات في صفحة إضافة المعلم أو الفلترة
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export function useLookups() {
  const [cities, setCities] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      // جلب المدن
      const { data: citiesData } = await supabase.from('cities').select('name').order('name');
      if (citiesData) setCities(citiesData.map(c => c.name));

      // جلب التصنيفات
      const { data: catData } = await supabase.from('categories').select('name').eq('type', 'place').order('name');
      if (catData) setCategories(catData.map(c => c.name));
    };
    fetchData();
  }, []);

  return { cities, categories };
}