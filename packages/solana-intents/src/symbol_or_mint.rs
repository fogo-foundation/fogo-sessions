use std::str::FromStr;

use solana_program::pubkey::Pubkey;

#[derive(PartialEq, Debug)]
pub enum SymbolOrMint {
    Symbol(String),
    Mint(Pubkey),
}

impl FromStr for SymbolOrMint {
    type Err = ();

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        Ok(Pubkey::from_str(s)
            .map(SymbolOrMint::Mint)
            .unwrap_or(SymbolOrMint::Symbol(s.to_string())))
    }
}

#[cfg(test)]
mod tests {
    mod from_str {
        use super::super::*;

        #[test]
        fn test_mint() {
            let mint = "So11111111111111111111111111111111111111112";
            assert_eq!(
                mint.parse::<SymbolOrMint>().unwrap(),
                SymbolOrMint::Mint(Pubkey::from_str(mint).unwrap())
            );
        }

        #[test]
        fn test_symbol() {
            assert_eq!(
                "FOGO".parse::<SymbolOrMint>().unwrap(),
                SymbolOrMint::Symbol(String::from("FOGO"))
            );
        }
    }
}
