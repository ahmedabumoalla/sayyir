'use client';

import Map, { Marker, NavigationControl } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { MapPin } from "lucide-react";

export default function ServiceMap({ lat, lng }: { lat: number; lng: number }) {
  return (
    <div className="w-full h-full rounded-xl overflow-hidden">
      <Map
        mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
        initialViewState={{
          latitude: lat,
          longitude: lng,
          zoom: 14
        }}
        style={{ width: "100%", height: "100%" }}
        mapStyle="mapbox://styles/mapbox/streets-v12" // ستايل شوارع عادي للتفاصيل
      >
        <NavigationControl position="top-right" />
        <Marker latitude={lat} longitude={lng} anchor="bottom">
           <div className="text-red-600 drop-shadow-md">
              <MapPin size={40} fill="currentColor" />
           </div>
        </Marker>
      </Map>
    </div>
  );
}