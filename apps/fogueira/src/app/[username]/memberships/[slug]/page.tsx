import { Suspense } from "react";
import { MembershipPurchasePage } from "../../../../components/Public/MembershipPurchase";

type Props = {
  params: Promise<{ username: string; slug: string }>;
};

const Page = async ({ params }: Props) => {
  const { username, slug } = await params;

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <MembershipPurchasePage username={username} slug={slug} />
    </Suspense>
  );
};

export default Page;

