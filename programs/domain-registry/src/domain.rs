use anchor_lang::prelude::*;
use anchor_lang::solana_program::hash::{hashv, HASH_BYTES};
use anchor_lang::solana_program::pubkey::Pubkey;

const DOMAIN_RECORD_SEED: &[u8] = b"domain-record";
#[derive(AnchorSerialize, AnchorDeserialize, PartialEq, Debug)]
pub struct Domain(String);

impl Domain {
    pub fn new_checked(domain: &str) -> Result<Self> {
        // TODO: Restrict the characters that can be used in the domain
        Ok(Self(domain.to_string()))
    }

    pub fn get_domain_id(&self) -> [u8; HASH_BYTES] {
        hashv(&[self.0.as_bytes()])
            .as_ref()
            .try_into()
            .expect("The output of hashv is 32 bytes")
    }

    pub(crate) fn get_seeds(&self) -> Vec<Vec<u8>> {
        let hash = self.get_domain_id();
        let seeds = [DOMAIN_RECORD_SEED, hash.as_ref()];
        let bump = Pubkey::find_program_address(&seeds, &crate::ID).1;
        let mut result = vec![];
        result.extend(seeds.iter().map(|seed| seed.to_vec()));
        result.push(vec![bump]);
        result
    }

    pub fn get_domain_record_address(&self) -> Pubkey {
        let seeds = self.get_seeds();
        Pubkey::create_program_address(
            &seeds
                .iter()
                .map(|seed| seed.as_slice())
                .collect::<Vec<&[u8]>>(),
            &crate::ID,
        )
        .expect("We pre-computed the bump so this address should be off-curve")
    }
}
