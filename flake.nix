{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs";
    flake-utils.url = "github:numtide/flake-utils";
    mkCli.url = "github:cprussin/mkCli";
    solana-nix.url = "github:arijoon/solana-nix";
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

    project-shell-overlay = system: final: _: {
      project-shell = final.mkShell {
        FORCE_COLOR = 1;
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
