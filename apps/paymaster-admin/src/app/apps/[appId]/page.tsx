import { Suspense } from "react";

import { Domain } from "../../../components/Domain";
import { PaymasterLoading } from "../../../components/loading";

export default function AppIdPage() {
  return (
    <Suspense fallback={<PaymasterLoading />}>
      <Domain />
    </Suspense>
  );
}
