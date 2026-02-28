/*src/components/me/SectionCard*/
export default function SectionCard({ title, actions, children }:{ title:string; actions?:React.ReactNode; children:React.ReactNode }){
  return (
    <section className="bg-white rounded-2xl border p-4 md:p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base md:text-lg font-semibold">{title}</h2>
        {actions}
      </div>
      {children}
    </section>
  );
}
