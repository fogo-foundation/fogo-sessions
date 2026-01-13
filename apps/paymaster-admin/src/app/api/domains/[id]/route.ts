import { NextResponse } from "next/server";
import { fetchDomainWithVariations } from "../../../../server/paymaster";

export const GET = async (
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { id } = await params;
  const domainData = await fetchDomainWithVariations(id);

  if (!domainData) {
    return new Response("Domain not found", { status: 404 });
  }

  return NextResponse.json(domainData);
}