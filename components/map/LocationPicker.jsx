'use client';

import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

// التوكن الخاص بك تم وضعه مباشرة لضمان التحميل
mapboxgl.accessToken = 'pk.eyJ1IjoiYWhtZWRhYnVtb2FsbGEiLCJhIjoiY21qcmh2bWcwNDNiYjNncXoyOHF6dTF5bSJ9.hoWl2qCPvCKZVJtOEowpwA';

export default function LocationPicker({ lat, lng, onLocationChange }) {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const marker = useRef(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (map.current) return; // منع إعادة التحميل

    // إعداد الخريطة
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12', // نمط يشبه قوقل ماب
      center: [lng, lat],
      zoom: 13,
      attributionControl: false
    });

    // إضافة أزرار التحكم
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // عند تحميل الخريطة بالكامل
    map.current.on('load', () => {
      setLoaded(true);
      map.current.resize();
    });

    // إنشاء الدبوس الذهبي
    marker.current = new mapboxgl.Marker({
      draggable: true,
      color: "#C89B3C" 
    })
      .setLngLat([lng, lat])
      .addTo(map.current);

    // تحديث الموقع عند سحب الدبوس
    marker.current.on('dragend', () => {
      const lngLat = marker.current.getLngLat();
      onLocationChange(lngLat.lat, lngLat.lng);
    });

    // تحديث الموقع عند الضغط على أي مكان في الخريطة
    map.current.on('click', (e) => {
      marker.current.setLngLat(e.lngLat);
      onLocationChange(e.lngLat.lat, e.lngLat.lng);
    });

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  return (
    <div className="w-full space-y-3 text-right" dir="rtl">
      <div 
        ref={mapContainer} 
        className="w-full h-[400px] rounded-2xl border border-white/10 overflow-hidden shadow-2xl bg-[#1a1a1a] relative"
      >
        {!loaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#1a1a1a] z-10">
            <div className="flex flex-col items-center gap-2">
                <div className="w-8 h-8 border-4 border-[#C89B3C] border-t-transparent rounded-full animate-spin"></div>
                <p className="text-[#C89B3C] text-sm">جاري تحميل الخريطة...</p>
            </div>
          </div>
        )}
      </div>
      
      {/* شريط الإحداثيات السفلي بتصميم متناسق */}
      <div className="flex flex-col md:flex-row justify-between items-center bg-[#1a1a1a] p-4 rounded-xl border border-white/5 gap-3">
        <div className="flex items-center gap-2">
            <span className="text-[#C89B3C] text-lg">📍</span>
            <p className="text-white/70 text-sm font-medium">اسحب العلامة الذهبية لتحديد موقع الخدمة بدقة</p>
        </div>
        <div className="flex gap-4 font-mono text-xs">
          <div className="bg-black/40 px-3 py-1.5 rounded-lg border border-white/5">
             <span className="text-white/40 ml-2">خط العرض:</span>
             <span className="text-[#C89B3C]">{lat.toFixed(6)}</span>
          </div>
          <div className="bg-black/40 px-3 py-1.5 rounded-lg border border-white/5">
             <span className="text-white/40 ml-2">خط الطول:</span>
             <span className="text-[#C89B3C]">{lng.toFixed(6)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}