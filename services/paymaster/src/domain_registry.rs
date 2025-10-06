use anchor_lang::solana_program::hash::hashv;
use solana_pubkey::Pubkey;

/// TODO: inherit everything from sdk
const DOMAIN_REGISTRY_PROGRAM_ID: Pubkey = Pubkey::from_str_const("DomaLfEueNY6JrQSEFjuXeUDiohFmSrFeTNTPamS2yog");
const DOMAIN_RECORD_SEED: &[u8] = b"domain-record";

fn get_seeds(domain_name: &str) -> Vec<Vec<u8>> {
    let hash = hashv(&[domain_name.as_bytes()]);
    let seeds = [DOMAIN_RECORD_SEED, hash.as_ref()];
    let bump = Pubkey::find_program_address(&seeds, &DOMAIN_REGISTRY_PROGRAM_ID).1;
    let mut result = vec![];
    result.extend(seeds.iter().map(|seed| seed.to_vec()));
    result.push(vec![bump]);
    result
}

pub fn get_domain_record_address(domain_name: &str) -> Pubkey {
    let seeds = get_seeds(domain_name);
    Pubkey::create_program_address(
        &seeds
            .iter()
            .map(|seed| seed.as_slice())
            .collect::<Vec<&[u8]>>(),
        &DOMAIN_REGISTRY_PROGRAM_ID,
    )
    .expect("We pre-computed the bump so this address should be off-curve")
}
