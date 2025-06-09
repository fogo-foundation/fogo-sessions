import NodeWallet from '@coral-xyz/anchor/dist/cjs/nodewallet'
import {
  Connection,
  Keypair,
  VersionedTransaction,
} from '@solana/web3.js'
import type { NextApiRequest, NextApiResponse } from 'next'
import { AnchorProvider } from '@coral-xyz/anchor'
import { SPONSOR_KEY, SOLANA_RPC } from '@/config/server'
import bs58 from 'bs58'

const payer = Keypair.fromSecretKey(
  Uint8Array.from(JSON.parse(SPONSOR_KEY))
)
const wallet = new NodeWallet(payer);
const provider = new AnchorProvider(
  new Connection(SOLANA_RPC),
  wallet,
  {}
)

export default async function handlerSponsorAndSend(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const data = req.body
  let transaction: VersionedTransaction;
  try {
    transaction =
      VersionedTransaction.deserialize(new Uint8Array(Buffer.from(data)))
  } catch {
    return res.status(400).json({
      error: 'Failed to deserialize transactions',
    })
  }

  const signedTransaction = await wallet.signTransaction(transaction)
  await provider.connection.sendRawTransaction(signedTransaction.serialize(), {skipPreflight: true})

  return res.status(200).json({
    signature: bs58.encode(signedTransaction.signatures[0]!)
  })
}
