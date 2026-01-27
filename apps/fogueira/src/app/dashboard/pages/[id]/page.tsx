import { PageBuilderPage } from "../../../../components/Dashboard/Pages/PageBuilder";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function Page({ params }: Props) {
  const { id } = await params;
  return <PageBuilderPage pageId={id} />;
}

