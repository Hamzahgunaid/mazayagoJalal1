
'use client';
import { useEffect, useState } from 'react';

export default function JudgesManager({ contestId }:{contestId:string}){
  const [judges,setJudges]=useState<any[]>([]);
  const [userId,setUserId]=useState('');

  async function load(){
    const r = await fetch(`/api/owner/contests/${contestId}/referees`,{credentials:'include'});
    const d = await r.json(); setJudges(d.items||[]);
  }
  useEffect(()=>{ load(); },[]);

  async function add(){
    if(!userId) return;
    await fetch(`/api/owner/contests/${contestId}/referees`, { method:'POST', headers:{'Content-Type':'application/json'}, credentials:'include', body: JSON.stringify({ user_id: userId, role: 'JUDGE' }) });
    setUserId(''); load();
  }
  async function remove(uid:string){
    await fetch(`/api/owner/contests/${contestId}/referees/${uid}`, { method:'DELETE', credentials:'include' });
    load();
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input className="border p-2 rounded-xl" value={userId} onChange={e=>setUserId(e.target.value)} placeholder="معرّف المستخدم (UUID)" />
        <button className="px-4 py-2 rounded-xl bg-black text-white" onClick={add}>إضافة حكم</button>
      </div>
      <ul className="list-disc pr-6 text-sm">
        {judges.map((j:any)=>(<li key={j.user_id} className="flex items-center gap-2">{j.user_id}<button onClick={()=>remove(j.user_id)} className="text-red-600">حذف</button></li>))}
      </ul>
    </div>
  );
}
