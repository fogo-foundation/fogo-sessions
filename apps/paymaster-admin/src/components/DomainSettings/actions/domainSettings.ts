"use server";

import { verifyLogInToken } from "@fogo/sessions-sdk";
import { revalidateTag } from "next/cache";
import { connection } from "../../../fogo-connection";
import {
  fetchUserPaymasterData,
  updateDomainSettings as updateDomainSettingsPaymaster,
} from "../../../server/paymaster";

export const updateDomainSettings = async ({
  domainConfigId,
  enableSessionManagement,
  enablePreflightSimulation,
  sessionToken,
}: {
  domainConfigId: string;
  enableSessionManagement: boolean;
  enablePreflightSimulation: boolean;
  sessionToken: string;
}) => {
  const sessionAccount = await verifyLogInToken(sessionToken, connection);
  const userAddress = sessionAccount?.user.toString();
  if (!userAddress) {
    throw new Error("User not found");
  }
  await updateDomainSettingsPaymaster(
    userAddress,
    domainConfigId,
    enableSessionManagement,
    enablePreflightSimulation,
  );

  revalidateTag("user-data", "max");

  return fetchUserPaymasterData(userAddress);
};
