"use client";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useState } from "react";
import L from "leaflet";

const icon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25,41], iconAnchor:[12,41]
});

function Clicker({ onPick }:{ onPick:(lat:number,lng:number)=>void }){
  useMapEvents({
    click(e){ onPick(e.latlng.lat, e.latlng.lng); }
  });
  return null;
}

export default function LocationPicker({ nodeId, lat, lng }:{ nodeId:string; lat?:number; lng?:number; }){
  const [pos, setPos] = useState<[number,number]>([lat||24.7136, lng||46.6753]); // default Riyadh
  async function save(){
    const fd = new FormData();
    fd.append("node_id", nodeId);
    fd.append("lat", String(pos[0]));
    fd.append("lng", String(pos[1]));
    const r = await fetch("/api/me/nodes/location", { method:"POST", body: fd });
    if(r.ok) alert("Saved"); else alert("Failed");
  }
  return (
    <div className="space-y-3">
      <div className="text-sm text-slate-600">Click on the map to set the exact location. Current: {pos[0].toFixed(5)}, {pos[1].toFixed(5)}</div>
      <MapContainer center={pos} zoom={12} style={{height: "420px", borderRadius: "12px", overflow:"hidden"}}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Marker position={pos} icon={icon} />
        <Clicker onPick={(a,b)=> setPos([a,b])} />
      </MapContainer>
      <button onClick={save} className="px-4 h-10 rounded-lg bg-slate-900 text-white">Save location</button>
    </div>
  );
}
