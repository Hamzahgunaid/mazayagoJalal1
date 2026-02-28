
'use client';
import { useEffect, useState } from 'react';

export default function EntriesReview({ contestId }:{contestId:string}){
  const [items,setItems]=useState<any[]>([]);
  const [status,setStatus]=useState<string>('');
  async function load(){
    const r= await fetch(`/api/owner/contests/${contestId}/entries`,{credentials:'include'});
    const d= await r.json(); setItems(d.items||[]);
  }
  useEffect(()=>{ load(); },[]);

  async function setReview(id:string, newStatus:'CORRECT'|'INCORRECT'|'DISQUALIFIED'){
    await fetch(`/api/owner/contests/${contestId}/entries/${id}/review`,{method:'POST', headers:{'Content-Type':'application/json'}, credentials:'include', body: JSON.stringify({ status: newStatus })});
    load();
  }

  const filtered = status? items.filter(x=>x.status===status): items;
  return (
    <div className="space-y-3">
      <div className="flex gap-2 items-center">
        <select className="border p-2 rounded-xl" value={status} onChange={e=>setStatus(e.target.value)}>
          <option value="">كل الحالات</option>
          <option value="PENDING">PENDING</option>
          <option value="NEEDS_REVIEW">NEEDS_REVIEW</option>
          <option value="CORRECT">CORRECT</option>
          <option value="INCORRECT">INCORRECT</option>
          <option value="DISQUALIFIED">DISQUALIFIED</option>
        </select>
        <button className="px-3 py-2 rounded-xl bg-gray-100" onClick={load}>تحديث</button>
      </div>
      <div className="overflow-auto border rounded-xl">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-2">المستخدم</th>
              <th className="p-2">النوع</th>
              <th className="p-2">الإجابة/الكود</th>
              <th className="p-2">النقاط</th>
              <th className="p-2">الحالة</th>
              <th className="p-2">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((e:any)=>(
              <tr key={e.id} className="border-t">
                <td className="p-2">{e.user_id}</td>
                <td className="p-2">{e.entry_type}</td>
                <td className="p-2">{e.answer_text || e.code_submitted || e.asset_url || '-'}</td>
                <td className="p-2">{e.score}</td>
                <td className="p-2">{e.status}</td>
                <td className="p-2 flex gap-2">
                  <button onClick={()=>setReview(e.id,'CORRECT')} className="px-2 py-1 rounded bg-green-600 text-white">صحيح</button>
                  <button onClick={()=>setReview(e.id,'INCORRECT')} className="px-2 py-1 rounded bg-yellow-600 text-white">خطأ</button>
                  <button onClick={()=>setReview(e.id,'DISQUALIFIED')} className="px-2 py-1 rounded bg-red-600 text-white">استبعاد</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
