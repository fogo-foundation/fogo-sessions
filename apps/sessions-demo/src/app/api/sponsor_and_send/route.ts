import { createPaymasterEndpoint } from "@fogo/sessions-sdk/paymaster";

import { SPONSOR_KEY, RPC } from "../../../config/server";

export const POST = await createPaymasterEndpoint({
  sponsor: SPONSOR_KEY,
  rpc: RPC,
});
