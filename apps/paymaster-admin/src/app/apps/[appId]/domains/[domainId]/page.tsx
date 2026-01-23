import { Suspense } from "react";
import { PaymasterLoading } from "../../../../../components/loading";
import { Variation } from "../../../../../components/Variation";

export default function DomainIdPage() {
  // suspense is required here because of useParams()
  return (
    <Suspense fallback={<PaymasterLoading />}>
      <Variation />
    </Suspense>
  );
}
