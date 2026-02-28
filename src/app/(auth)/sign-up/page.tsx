import SignUpClient from "./SignUpClient";
import { getOAuthErrorMessage } from "@/lib/oauthErrors";

type SearchParams = { [key: string]: string | string[] | undefined };

export default function SignUpPage({ searchParams }: { searchParams: SearchParams }) {
  const errorParam = typeof searchParams?.error === "string" ? searchParams.error : null;
  const detailParam = typeof searchParams?.detail === "string" ? searchParams.detail : null;
  const initialError = getOAuthErrorMessage(errorParam, detailParam);

  return <SignUpClient initialError={initialError} />;
}
