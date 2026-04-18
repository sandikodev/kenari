#!/usr/bin/env bash
# kenari-cli install script
# Usage: curl -fsSL https://raw.githubusercontent.com/sandikodev/kenari/main/scripts/install-cli.sh | sh
set -e

REPO="sandikodev/kenari"
INSTALL_DIR="/usr/local/bin"

echo "🐦 Kenari CLI Installer"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

OS=$(uname -s | tr '[:upper:]' '[:lower:]')
ARCH=$(uname -m)

case "$ARCH" in
  x86_64)  ARCH_NAME="x86_64" ;;
  aarch64|arm64) ARCH_NAME="arm64" ;;
  armv7l)  ARCH_NAME="armv7" ;;
  *) echo "✗ Unsupported architecture: $ARCH" && exit 1 ;;
esac

case "$OS" in
  linux)  BINARY="kenari-linux-${ARCH_NAME}" ;;
  darwin) BINARY="kenari-macos-${ARCH_NAME}" ;;
  *) echo "✗ Unsupported OS: $OS" && exit 1 ;;
esac

echo "→ Detected: $OS/$ARCH_NAME"

LATEST=$(curl -fsSL "https://api.github.com/repos/$REPO/releases/latest" | grep '"tag_name"' | cut -d'"' -f4)
[ -z "$LATEST" ] && echo "✗ Could not fetch latest release" && exit 1

echo "→ Latest: $LATEST"
echo "→ Downloading $BINARY..."

curl -fsSL "https://github.com/$REPO/releases/download/$LATEST/$BINARY" -o /tmp/kenari
chmod +x /tmp/kenari

if [ -w "$INSTALL_DIR" ]; then
  mv /tmp/kenari "$INSTALL_DIR/kenari"
else
  sudo mv /tmp/kenari "$INSTALL_DIR/kenari"
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✓ Installed to $INSTALL_DIR/kenari"
echo ""
echo "  kenari register   Set up this host"
echo "  kenari doctor     Diagnose & fix"
echo ""
