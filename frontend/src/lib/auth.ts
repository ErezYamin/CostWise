import { fetchAuthSession } from "aws-amplify/auth";

export async function getToken(): Promise<string> {
  const session = await fetchAuthSession();
  return session.tokens?.idToken?.toString() ?? "";
}
