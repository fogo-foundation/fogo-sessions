import { Suspense } from "react";
import { PublicPage } from "../../../components/Public/PublicPage";

type Props = {
  params: Promise<{ username: string; slug: string }>;
};

async function PageContent({ params }: Props) {
  const { username, slug } = await params;
  return <PublicPage username={username} slug={slug} />;
}

export default function Page({ params }: Props) {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PageContent params={params} />
    </Suspense>
  );
}

