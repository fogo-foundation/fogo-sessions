import { Suspense } from "react";

import { Domain } from "../../../components/DomainVariations";
import { PaymasterLoading } from "../../../components/loading";

export default function DomainIdPage() {
    return (
      <Suspense fallback={<PaymasterLoading />}>
        <Domain />
      </Suspense>
    );
}