use anyhow::Result;
use clap::{command, Parser};
use config::File;
use fogo_paymaster::config_manager::config::Config;
use std::path::PathBuf;

#[derive(Debug, Parser)]
#[command(version, about = "Convert TOML paymaster config to JSON files (one per transaction variation)")]
pub struct Cli {
    /// Path to input TOML config file
    #[arg(short, long)]
    pub input: String,

    /// Directory to output JSON files
    #[arg(short, long)]
    pub output_dir: String,
}

fn main() -> Result<()> {
    let opts = Cli::parse();

    let config: Config = config::Config::builder()
        .add_source(File::with_name(&opts.input))
        .build()?
        .try_deserialize()?;

    let output_dir = PathBuf::from(&opts.output_dir);
    std::fs::create_dir_all(&output_dir)?;

    let input_path = PathBuf::from(&opts.input);
    let base_name = input_path
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("config");

    config.domains.iter().for_each(|domain| {
        let domain_url = url::Url::parse(&domain.domain).expect("Invalid domain url: {domain.domain}");
        let domain_name = domain_url
            .host_str()
            .expect("Domain does not have a host: {domain.domain}")
            .replace('.', "-");

        domain.tx_variations.iter().for_each(|variation| {
            let variation_name = variation.name().replace(' ', "-").to_lowercase();
            let output_path = output_dir.join(format!(
                "{}-{}-{}.json",
                base_name, domain_name, variation_name
            ));

            let output = serde_json::to_value(variation).expect("Failed to serialize variation");
            let json = serde_json::to_string_pretty(&output).expect("Failed to serialize JSON");

            std::fs::write(&output_path, json).expect("Failed to write JSON file");
            println!("Wrote: {}", output_path.display());
        });
    });

    Ok(())
}
