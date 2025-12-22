import { Suspense } from "react";

import { Domain } from "../../../components/Domain";
import { PaymasterLoading } from "../../../components/loading";

export default function AppIdPage() {
  // suspense is required here because of useParams()
  return (
    <Suspense fallback={<PaymasterLoading />}>
      <Domain />
    </Suspense>
  );
}
