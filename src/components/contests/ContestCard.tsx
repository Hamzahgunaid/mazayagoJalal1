import Link from 'next/link';

export default function ContestCard({ contest, hrefBase = '/offers' }: { contest: any, hrefBase?: string }){
  return (
    <div className="border rounded-lg p-4 shadow-sm hover:shadow transition bg-white">
      <div className="text-lg font-bold">{contest.title}</div>
      <div className="text-sm text-gray-500">{contest.type} • {contest.status}</div>
      <div className="mt-2 text-sm text-gray-600">{contest.description}</div>
      <div className="mt-3">
        <Link className="text-blue-600 hover:underline" href={`${hrefBase}/${contest.slug}`}>عرض التفاصيل</Link>
      </div>
    </div>
  );
}
