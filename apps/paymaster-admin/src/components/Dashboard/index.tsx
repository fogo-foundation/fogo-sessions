import { cookies } from "next/headers";
import { getHost } from "../../server/get-host";

export const Dashboard = async ({ children }: { children: React.ReactNode }) => {
  const host = await getHost();
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("sessionToken");
  const url = new URL(`/api/info`, host);
  url.searchParams.set("sessionToken", sessionToken?.value ?? "");
  const response = await fetch(url.toString());
  const data = await response.json();
  return <code>{JSON.stringify(data, null, 2)}</code>;
};
