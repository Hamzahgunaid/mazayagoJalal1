
'use client';
export default function AdminTabs({ value, onChange }:{ value: string, onChange:(v:string)=>void }){
  const tabs = [
    {k:'overview', t:'نظرة عامة'},
    {k:'codes', t:'الأكواد'},
    {k:'rounds', t:'الجولات/المهام'},
    {k:'entries', t:'المشاركات'},
    {k:'judges', t:'التحكيم'},
    {k:'prizes', t:'الجوائز والإصدار'},
    {k:'analytics', t:'التحليلات'},
    {k:'restrictions', t:'القيود'},
    {k:'transparency', t:'الشفافية'}
  ];
  return (
    <div className="flex gap-2 flex-wrap">
      {tabs.map(tb=> (
        <button key={tb.k}
          className={"px-3 py-2 rounded-xl border " + (value===tb.k ? "bg-black text-white border-black" : "bg-white border-gray-200")}
          onClick={()=>onChange(tb.k)}>{tb.t}</button>
      ))}
    </div>
  );
}
