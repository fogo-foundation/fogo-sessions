import { Suspense } from "react";
import { MembershipsPage } from "../../../components/Public/Memberships";

type Props = {
  params: Promise<{ username: string }>;
};

const Page = async ({ params }: Props) => {
  const { username } = await params;

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <MembershipsPage username={username} />
    </Suspense>
  );
};

export default Page;

