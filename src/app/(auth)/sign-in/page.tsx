import SignInClient from "./SignInClient";
import { getOAuthErrorMessage } from "@/lib/oauthErrors";

type SearchParams = { [key: string]: string | string[] | undefined };

export default function SignInPage({ searchParams }: { searchParams: SearchParams }) {
  const errorParam = typeof searchParams?.error === "string" ? searchParams.error : null;
  const detailParam = typeof searchParams?.detail === "string" ? searchParams.detail : null;
  const initialError = getOAuthErrorMessage(errorParam, detailParam);
  const reviewParam = typeof searchParams?.review === "string" ? searchParams.review : "";
  const keyParam = typeof searchParams?.k === "string" ? searchParams.k : "";
  const reviewerLoginEnabled =
    reviewParam === "1" &&
    keyParam.length > 0 &&
    keyParam === process.env.REVIEW_LOGIN_SECRET;

  return <SignInClient initialError={initialError} reviewerLoginEnabled={reviewerLoginEnabled} />;
}
