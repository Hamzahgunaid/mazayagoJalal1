import { redirect } from "next/navigation";

export default function ServiceIndex({ searchParams }:{ searchParams:{ node?:string } }){
  if(searchParams?.node) return redirect(`/service/${searchParams.node}`);
  return redirect(`/`);
}
