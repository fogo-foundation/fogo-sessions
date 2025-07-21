{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs";
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
    cli-overlay = nixpkgs.lib.composeExtensions mkCli.overlays.default (final: _: {
      cli = final.lib.mkCli "cli" {
        _noAll = true;

        start = "${final.lib.getExe final.tilt} up";
        clean = "${final.lib.getExe final.git} clean -fdx";

        test = {
          nix = {
            lint = "${final.statix}/bin/statix check --ignore node_modules .";
            dead-code = "${final.deadnix}/bin/deadnix --exclude ./node_modules .";
            format = "${final.alejandra}/bin/alejandra --exclude ./node_modules --check .";
          };
          turbo = "${final.lib.getExe final.pnpm} turbo test -- --ui stream";
        };

        fix = {
          nix = {
            lint = "${final.statix}/bin/statix fix --ignore node_modules .";
            dead-code = "${final.deadnix}/bin/deadnix --exclude ./node_modules -e .";
            format = "${final.alejandra}/bin/alejandra --exclude ./node_modules .";
          };
          turbo = "${final.lib.getExe final.pnpm} turbo fix -- --ui stream";
        };
      };
    });

    project-shell-overlay = system: final: _: let
      spl-token-cli = final.rustPlatform.buildRustPackage (finalAttrs: {
        pname = "spl-token-cli";
        version = "5.3.0";

        src = final.fetchCrate {
          inherit (finalAttrs) pname version;
          hash = "sha256-sUrmtE0xFBTzPRSliVT9UJpPqbGhIBAHTB2XDk7mzw0=";
        };

        cargoHash = "sha256-W6nioqctxSBsujax1sILHqu/d3I0qEPRQc+hl2gep24=";

        nativeBuildInputs = [final.pkg-config final.perl final.protobuf];
        buildInputs = [final.openssl final.udev];
        doCheck = false;
      });
    in {
      project-shell = final.mkShell {
        FORCE_COLOR = 1;
        PUPPETEER_SKIP_DOWNLOAD = 1;
        PUPPETEER_EXECUTABLE_PATH = final.lib.getExe final.chromium;
        name = "project-shell";
        buildInputs = [
          final.cli
          final.git
          final.libusb1
          final.nodejs
          final.pnpm
          final.python3
          final.tilt
          solana-nix.packages."${system}".solana-cli
          solana-nix.packages."${system}".anchor-cli
          solana-nix.packages."${system}".solana-rust
          spl-token-cli
        ];
      };
    };
  in
    (flake-utils.lib.eachDefaultSystem
      (
        system: let
          pkgs = import nixpkgs {
            inherit system;
            overlays = [cli-overlay (project-shell-overlay system)];
            config = {};
          };
        in {
          packages = {
            inherit (pkgs) cli project-shell;
          };
          devShells.default = pkgs.project-shell;
        }
      ))
    // {
      overlays = {
        cli = cli-overlay;
        project-shell = project-shell-overlay;
      };
    };
}
