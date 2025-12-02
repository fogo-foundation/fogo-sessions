{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs";
    flake-utils.url = "github:numtide/flake-utils";
    mkCli.url = "github:cprussin/mkCli";
    solana-nix.url = "github:cprussin/solana-nix";
    rust-overlay = {
      url = "github:oxalica/rust-overlay";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs = {
    nixpkgs,
    flake-utils,
    mkCli,
    solana-nix,
    rust-overlay,
    ...
  }: let
    cli-overlay = nixpkgs.lib.composeExtensions mkCli.overlays.default (
      final: _: {
        cli = final.lib.mkCli "cli" {
          _noAll = true;

          start = "${final.lib.getExe final.tilt} up";
          start-testnet = "NETWORK=testnet pnpm turbo --filter @fogo/sessions-demo start:dev";
          start-mainnet = "NETWORK=mainnet pnpm turbo --filter @fogo/sessions-demo start:dev";
          start-portfolio = "pnpm turbo --filter @fogo/portfolio start:dev";
          clean = "${final.lib.getExe final.git} clean -fdx";

          test = {
            nix = {
              lint = "${final.statix}/bin/statix check --ignore node_modules .";
              dead-code = "${final.deadnix}/bin/deadnix --exclude ./node_modules .";
              format = "${final.alejandra}/bin/alejandra --exclude ./node_modules --check .";
            };
            turbo = "pnpm turbo test -- --ui stream";
            rust = {
              format = "cargo fmt --verbose --check";
              lint = "cargo clippy";
            };
          };

          fix = {
            nix = {
              lint = "${final.statix}/bin/statix fix --ignore node_modules .";
              dead-code = "${final.deadnix}/bin/deadnix --exclude ./node_modules -e .";
              format = "${final.alejandra}/bin/alejandra --exclude ./node_modules .";
            };
            turbo = "pnpm turbo fix -- --ui stream";
            rust = {
              format = "cargo fmt --verbose";
              lint = "cargo clippy --fix";
            };
          };
        };
      }
    );

    project-shell-overlay = system:
      nixpkgs.lib.composeExtensions rust-overlay.overlays.default (
        final: _: let
          spl-token-cli = final.rustPlatform.buildRustPackage (finalAttrs: {
            pname = "spl-token-cli";
            version = "5.3.0";

            src = final.fetchCrate {
              inherit (finalAttrs) pname version;
              hash = "sha256-sUrmtE0xFBTzPRSliVT9UJpPqbGhIBAHTB2XDk7mzw0=";
            };

            cargoHash = "sha256-W6nioqctxSBsujax1sILHqu/d3I0qEPRQc+hl2gep24=";

            nativeBuildInputs = [
              final.pkg-config
              final.perl
              final.protobuf
            ];
            buildInputs = [
              final.openssl
              final.udev
            ];
            doCheck = false;
          });
        in {
          project-shell = final.mkShell {
            FORCE_COLOR = 1;
            PUPPETEER_SKIP_DOWNLOAD = 1;
            PUPPETEER_EXECUTABLE_PATH = final.lib.optionalString (!final.stdenv.isDarwin) (
              final.lib.getExe final.chromium
            );
            name = "project-shell";
            buildInputs =
              [
                final.cli
                final.git
                final.libusb1
                final.nodejs
                final.pnpm
                final.python3
                final.tilt
                final.openssl
                final.pkg-config
              ]
              ++ final.lib.optionals (!final.stdenv.isDarwin) [
                (final.rust-bin.nightly.latest.default.override {extensions = ["rust-analyzer"];})
                solana-nix.packages."${system}".solana-cli
                solana-nix.packages."${system}".anchor-cli
                solana-nix.packages."${system}".solana-rust
                spl-token-cli
              ]
              ++ final.lib.optionals final.stdenv.isDarwin [
                final.rustup
                final.anchor
                final.libiconv
              ];
          };
        }
      );
  in
    (flake-utils.lib.eachDefaultSystem (
      system: let
        pkgs = import nixpkgs {
          inherit system;
          overlays = [
            cli-overlay
            (project-shell-overlay system)
          ];
          config = {};
        };
      in {
        packages = {
          inherit (pkgs) cli project-shell;
        };
        devShells.default = pkgs.project-shell;
        formatter = pkgs.alejandra;
      }
    ))
    // {
      overlays = {
        cli = cli-overlay;
        project-shell = project-shell-overlay;
      };
    };
}
