"use client";
import { useState } from "react";
export default function LogoutPage(){
  const [msg,setMsg]=useState("");
  async function doLogout(){
    const r=await fetch("/api/auth/logout",{method:"POST"});
    if(r.ok){ setMsg("Logged out"); setTimeout(()=>location.href="/",800);} else { setMsg("Failed to logout"); }
  }
  return (<div className="max-w-md mx-auto space-y-4">
    <h1 className="text-2xl font-bold">Logout</h1>
    <button onClick={doLogout} className="btn btn-primary w-full">Logout</button>
    {msg && <p className="text-sm text-slate-600">{msg}</p>}
  </div>);
}
