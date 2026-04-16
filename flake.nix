{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs?rev=bca67f2ca172f4b4e8d9930122e74f20f6753865";
    flake-utils.url = "github:numtide/flake-utils";
    mkCli.url = "github:cprussin/mkCli";
    solana-nix.url = "github:cprussin/solana-nix";
  };

  outputs = {
    nixpkgs,
    flake-utils,
    mkCli,
    solana-nix,
    ...
  }: let
    biome = {
      fetchFromGitHub,
      prev,
    }:
      prev.biome.overrideAttrs (finalAttrs: previousAttrs: let
        version = "2.4.12";
      in {
        inherit version;
        src = fetchFromGitHub {
          owner = "biomejs";
          repo = "biome";
          rev = "@biomejs/biome@${version}";
          hash = "sha256-PVax57P496gDksvyGskW3MeR9YDZFE0E8yiv2zW6L/o=";
        };
        doCheck = false;
        cargoDeps = previousAttrs.cargoDeps.overrideAttrs (previousAttrs: {
          vendorStaging = previousAttrs.vendorStaging.overrideAttrs {
            inherit (finalAttrs) src;
            outputHash = "sha256-638M2/qRXTZSD4/2/PWkfo5DbsLzWlhwwSBGlkUaLBc=";
          };
        });
      });

    cli = {
      lib,
      git,
      direnv,
      statix,
      deadnix,
      alejandra,
      tilt,
      pnpm,
      ...
    }:
      lib.mkCli "cli" {
        _noAll = true;

        start = "${lib.getExe tilt} up";
        start-testnet = "NETWORK=testnet ${lib.getExe pnpm} turbo --filter @fogo/sessions-demo start:dev";
        start-mainnet = "NETWORK=mainnet ${lib.getExe pnpm} turbo --filter @fogo/sessions-demo start:dev";
        start-portfolio = "${lib.getExe pnpm} turbo --filter @fogo/portfolio start:dev";
        clean = "${lib.getExe git} clean -fdx && ${lib.getExe direnv} reload";

        test = {
          nix = {
            lint = "${lib.getExe statix} check --ignore node_modules .";
            dead-code = "${lib.getExe deadnix} --exclude ./node_modules .";
            format = "${lib.getExe alejandra} --exclude ./node_modules --check .";
          };
          turbo = "${lib.getExe pnpm} turbo test -- --ui stream";
          rust = {
            format = "cargo fmt --verbose --check";
            lint = "cargo clippy";
          };
        };

        fix = {
          nix = {
            lint = "${lib.getExe statix} fix --ignore node_modules .";
            dead-code = "${lib.getExe deadnix} --exclude ./node_modules -e .";
            format = "${lib.getExe alejandra} --exclude ./node_modules .";
          };
          turbo = "${lib.getExe pnpm} turbo fix -- --ui stream";
          rust = {
            format = "cargo fmt --verbose";
            lint = "cargo clippy --fix";
          };
        };
      };

    spl-token-cli = {
      rustPlatform,
      fetchCrate,
      pkg-config,
      perl,
      protobuf,
      openssl,
      udev,
      ...
    }:
      rustPlatform.buildRustPackage (finalAttrs: {
        pname = "spl-token-cli";
        version = "5.3.0";

        src = fetchCrate {
          inherit (finalAttrs) pname version;
          hash = "sha256-sUrmtE0xFBTzPRSliVT9UJpPqbGhIBAHTB2XDk7mzw0=";
        };

        cargoHash = "sha256-W6nioqctxSBsujax1sILHqu/d3I0qEPRQc+hl2gep24=";

        nativeBuildInputs = [pkg-config perl protobuf];
        buildInputs = [openssl udev];
        doCheck = false;
      });

    knope = {
      rustPlatform,
      fetchCrate,
      ...
    }:
      rustPlatform.buildRustPackage (finalAttrs: {
        pname = "knope";
        version = "0.22.4";

        src = fetchCrate {
          inherit (finalAttrs) pname version;
          hash = "sha256-Q71L5zy29Hnk1VSvEZqJUXEbenFN3+rSngccy+An7x0=";
        };

        cargoHash = "sha256-zX7QSXAHgsPykntE/xy8ylfw0Cr9seAXXl+Ge5OBmws=";
        doCheck = false;
      });

    solana-cli = {system, ...}: solana-nix.packages."${system}".solana-cli;
    anchor-cli = {system, ...}: solana-nix.packages."${system}".anchor-cli;
    solana-rust = {system, ...}: solana-nix.packages."${system}".solana-rust;

    dev-shell = {
      anchor-cli,
      biome,
      chromium,
      cli,
      git,
      jq,
      knope,
      lib,
      libusb1,
      mkShell,
      nodejs,
      openssl,
      pkg-config,
      pnpm,
      python3,
      solana-cli,
      solana-rust,
      spl-token-cli,
      tilt,
      ...
    }:
      mkShell {
        FORCE_COLOR = 1;
        PUPPETEER_SKIP_DOWNLOAD = 1;
        PUPPETEER_EXECUTABLE_PATH = lib.getExe chromium;
        BIOME_BINARY = lib.getExe biome;
        name = "project-shell";
        nativeBuildInputs = [pkg-config];
        buildInputs = [
          anchor-cli
          biome
          cli
          git
          jq
          knope
          libusb1
          nodejs
          openssl.dev
          pnpm
          python3
          solana-cli
          solana-rust
          spl-token-cli
          tilt
        ];
      };

    overlays = let
      mkOverlay = pkg-name: pkg: composedOverlays:
        nixpkgs.lib.composeManyExtensions (composedOverlays
          ++ [
            (final: prev: {"${pkg-name}" = final.callPackage pkg {inherit prev;};})
          ]);
    in {
      biome = mkOverlay "biome" biome [];
      cli = mkOverlay "cli" cli [mkCli.overlays.default];
      spl-token-cli = mkOverlay "spl-token-cli" spl-token-cli [];
      knope = mkOverlay "knope" knope [];
      solana-cli = mkOverlay "solana-cli" solana-cli [];
      anchor-cli = mkOverlay "anchor-cli" anchor-cli [];
      solana-rust = mkOverlay "solana-rust" solana-rust [];
      dev-shell = mkOverlay "dev-shell" dev-shell [
        overlays.anchor-cli
        overlays.biome
        overlays.cli
        overlays.knope
        overlays.solana-cli
        overlays.solana-rust
        overlays.spl-token-cli
      ];
    };
  in
    (flake-utils.lib.eachDefaultSystem
      (
        system: let
          pkg-from-overlay = overlay-name:
            (import nixpkgs {
              inherit system;
              overlays = [overlays."${overlay-name}"];
              config = {};
            })."${overlay-name}";
        in {
          packages = nixpkgs.lib.mapAttrs (name: _: pkg-from-overlay name) overlays;
          devShells.default = pkg-from-overlay "dev-shell";
        }
      ))
    // {
      inherit overlays;
    };
}
