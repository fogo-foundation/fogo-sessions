import { Authenticate } from "../components/Authenticate";
import { Home } from "../components/Home";
import { getAuthenticatedUserAddress } from "../server/user";

export default async function Page() {
  const userAddress = await getAuthenticatedUserAddress();
  if (!userAddress) {
    return <Authenticate />;
  }
  return <Home />;
}
