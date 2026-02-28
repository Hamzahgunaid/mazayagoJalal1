//app/s/new/page.tsx  
import { currentUser } from "@/lib/session";
import NewServiceClient from "@/components/service/NewServiceClient";

export const dynamic = "force-dynamic";

export default async function NewServicePage(){
  const user = await currentUser();
  if(!user) return <div className="p-6">Please sign in to create a service.</div>;
  return <NewServiceClient />;
}
