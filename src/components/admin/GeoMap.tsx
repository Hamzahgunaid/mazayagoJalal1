
"use client";
import dynamic from "next/dynamic";
import { useMemo } from "react";

const MapContainer = dynamic(() => import("react-leaflet").then(m => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then(m => m.TileLayer), { ssr: false });
const Marker = dynamic(() => import("react-leaflet").then(m => m.Marker), { ssr: false });
const Popup = dynamic(() => import("react-leaflet").then(m => m.Popup), { ssr: false });

type NodePoint = { id:string; name:string; city:string; country:string; geo_lat:number; geo_lng:number; reviews_d30:number };

export default function GeoMap({ nodes }:{ nodes: NodePoint[] }){
  const center = useMemo(() => {
    if(nodes.length) return [nodes[0].geo_lat, nodes[0].geo_lng] as [number,number];
    return [24.7136, 46.6753] as [number,number]; // default Riyadh-ish
  }, [nodes]);

  return (
    <div className="w-full h-[480px] rounded-xl overflow-hidden border">
      <MapContainer center={center} zoom={4} scrollWheelZoom style={{ height: "100%", width: "100%" }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {nodes.map(n => (
          <Marker key={n.id} position={[n.geo_lat, n.geo_lng]}>
            <Popup>
              <div className="text-sm font-medium">{n.name}</div>
              <div className="text-xs text-slate-500">{n.city}, {n.country}</div>
              <div className="text-xs">Reviews (30d): {n.reviews_d30}</div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
