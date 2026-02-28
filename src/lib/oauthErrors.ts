export function getOAuthErrorMessage(code?: string | null, detail?: string | null) {
  if (!code) return detail || "";
  const fallback = detail || "Something went wrong while connecting your account. Please try again.";
  switch (code) {
    case "provider_unavailable":
      return "This provider is not enabled yet.";
    case "provider_not_configured":
      return "OAuth keys are missing for this provider. Please contact support.";
    case "missing_state":
    case "state_mismatch":
    case "state_invalid":
      return "For security reasons the OAuth request expired. Please try again.";
    case "token_exchange_failed":
      return "Unable to exchange the authorization code. Please retry.";
    case "missing_access_token":
      return "Provider did not return an access token.";
    case "profile_fetch_failed":
      return "Unable to fetch your profile from the provider.";
    case "email_not_provided":
      return "We could not read your email from the provider. Please ensure your email scope is granted.";
    case "facebook_email_missing":
      return "Facebook did not return your email. Please use email login or enable email on your Facebook account and try again.";
    case "user_creation_failed":
      return "Unable to finish creating your account. Please contact support.";
    case "oauth_unexpected":
      return fallback;
    default:
      return fallback;
  }
}
