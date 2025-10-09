import { AnchorProvider, Program } from "@coral-xyz/anchor";

import ChainIdIdlImpl from "./idl/chain-id.json" with { type: "json" };
import DomainRegistryIdlImpl from "./idl/domain-registry.json" with { type: "json" };
import ExampleIdlImpl from "./idl/example.json" with { type: "json" };
import IntentTransferIdlImpl from "./idl/intent-transfer.json" with { type: "json" };
import SessionManagerIdlImpl from "./idl/session-manager.json" with { type: "json" };
import type { ChainId } from "./types/chain-id.js";
import type { DomainRegistry } from "./types/domain-registry.js";
import type { Example } from "./types/example.js";
import type { IntentTransfer } from "./types/intent-transfer.js";
import type { SessionManager } from "./types/session-manager.js";

export type SessionManagerIdl = SessionManager;
export const SessionManagerIdl = SessionManagerIdlImpl as SessionManagerIdl;
export class SessionManagerProgram extends Program<SessionManagerIdl> {
  constructor(provider: AnchorProvider) {
    super(SessionManagerIdl, provider);
  }
}

export type ExampleIdl = Example;
export const ExampleIdl = ExampleIdlImpl as ExampleIdl;
export class ExampleProgram extends Program<ExampleIdl> {
  constructor(provider: AnchorProvider) {
    super(ExampleIdl, provider);
  }
}

export type ChainIdIdl = ChainId;
export const ChainIdIdl = ChainIdIdlImpl as ChainIdIdl;
export class ChainIdProgram extends Program<ChainIdIdl> {
  constructor(provider: AnchorProvider) {
    super(ChainIdIdl, provider);
  }
}

export type DomainRegistryIdl = DomainRegistry;
export const DomainRegistryIdl = DomainRegistryIdlImpl as DomainRegistryIdl;
export class DomainRegistryProgram extends Program<DomainRegistryIdl> {
  constructor(provider: AnchorProvider) {
    super(DomainRegistryIdl, provider);
  }
}

export type IntentTransferIdl = IntentTransfer;
export const IntentTransferIdl = IntentTransferIdlImpl as IntentTransferIdl;
export class IntentTransferProgram extends Program<IntentTransferIdl> {
  constructor(provider: AnchorProvider) {
    super(IntentTransferIdl, provider);
  }
}
