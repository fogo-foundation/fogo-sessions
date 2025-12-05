FROM --platform=linux/amd64 mcr.microsoft.com/devcontainers/base:ubuntu

# ensure core deps are up-to-date
RUN apt-get update && apt-get install -y \
  build-essential \
  curl \
  file \
  git \
  procps \
  && rm -rf /var/lib/apt/lists/*

# Install Homebrew as the vscode user (non-root)
USER vscode
RUN NONINTERACTIVE=1 /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Add Homebrew to PATH for both ARM and x86 architectures
ENV PATH="/home/linuxbrew/.linuxbrew/bin:/home/linuxbrew/.linuxbrew/sbin:/opt/homebrew/bin:/opt/homebrew/sbin:${PATH}"

# install the absolute latest version of git
RUN brew cleanup
RUN brew update
RUN brew install git

# ensure mise installed tools are available globally
ENV PATH="/home/vscode/.local/share/mise/shims:${PATH}"

# ensure anchor, once it gets installed, is in the PATH
ENV PATH="/home/vscode/.cargo/bin:${PATH}"
