"use client";

import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { useEffect, useState } from "react";

const icon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25,41], iconAnchor:[12,41]
});

function Events({ onPick }:{ onPick:(lat:number,lng:number)=>void }){
  useMapEvents({
    click(e){ onPick(e.latlng.lat, e.latlng.lng); }
  });
  return null;
}

export default function MapInner({
  position,
  onPick
}:{ position:{lat:number; lng:number} | null; onPick:(lat:number,lng:number)=>void }){
  const [pos, setPos] = useState<{lat:number; lng:number} | null>(position);
  useEffect(()=>setPos(position),[position]);

  return (
    <MapContainer center={pos || {lat:24.7136, lng:46.6753}} zoom={pos?13:5} style={{height:300}}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <Events onPick={(lat,lng)=>{ setPos({lat,lng}); onPick(lat,lng); }} />
      {pos && <Marker position={pos} icon={icon} draggable
        eventHandlers={{
          dragend:(e:any)=>{
            const m = e.target as L.Marker;
            const latlng = m.getLatLng(); onPick(latlng.lat, latlng.lng);
          }
        }}
      />}
    </MapContainer>
  );
}
