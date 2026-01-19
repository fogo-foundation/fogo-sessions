import { cacheLife, cacheTag } from 'next/cache';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { fetchDomainVariations } from '../../../../server/paymaster';

const fetchData = async (
  walletAddress: string,
  domainConfigId: string
): Promise<ReturnType<typeof fetchDomainVariations>> => {
  'use cache';
  cacheTag('domain-variations', domainConfigId);
  cacheLife('seconds');
  return await fetchDomainVariations(walletAddress, domainConfigId);
};

export const GET = async (request: NextRequest) => {
  const walletAddress = request.headers.get('x-authenticated-user');
  const domainConfigId = request.nextUrl.searchParams.get('domainConfigId');
  if (!domainConfigId) {
    throw new Error(
      'Domain config ID is required. Failed to get domain config ID from request URL.'
    );
  }
  if (!walletAddress) {
    throw new Error(
      'Unauthorized. Failed to get wallet address from request headers.'
    );
  }
  const domainVariations = await fetchData(walletAddress, domainConfigId);
  if (!domainVariations) {
    return new Response('Domain not found', { status: 404 });
  }
  return NextResponse.json(domainVariations);
};
