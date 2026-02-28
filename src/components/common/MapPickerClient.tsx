"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";

const Map = dynamic(()=>import("./_MapInner"), { ssr:false });

export default function MapPickerClient({
  value,
  onChange
}:{ value:{ lat:number|null; lng:number|null }; onChange:(v:{lat:number|null; lng:number|null})=>void }){
  const [pos, setPos] = useState<{lat:number; lng:number} | null>(()=>(
    (value.lat && value.lng) ? { lat: value.lat!, lng: value.lng! } : null
  ));

  useEffect(()=>{ if(value.lat && value.lng) setPos({lat:value.lat, lng:value.lng}); }, [value.lat, value.lng]);
  function setFromMap(lat:number, lng:number){
    setPos({lat,lng});
    onChange({ lat, lng });
  }

  return (
    <div>
      <div className="text-sm mb-1">Location on map</div>
      <div className="rounded-xl overflow-hidden border">
        <Map position={pos} onPick={setFromMap} />
      </div>
      <div className="text-xs text-slate-600 mt-1">Click on the map to set the marker. Drag to adjust.</div>
    </div>
  );
}
