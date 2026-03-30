#!/usr/bin/env bash
# Deploy bounty contract to EVE Frontier Utopia (testnet).
# Run inside the Docker container with your deployer private key configured.
# After deploy, copy BOUNTY_PACKAGE_ID into frontend/.env.utopia
set -euo pipefail

BOUNTY_DIR=/workspace/bounty

echo ""
echo "================================================"
echo " Bounty deploy — Utopia (testnet)"
echo "================================================"

sui client switch --env testnet

cd "$BOUNTY_DIR/move"

sui client publish \
    --build-env testnet \
    --pubfile-path Pub.utopia.toml \
    --json > /tmp/bounty_utopia_publish.txt 2>&1 || {
    echo "ERROR: publish failed." >&2
    cat /tmp/bounty_utopia_publish.txt >&2
    exit 1
}

BOUNTY_PACKAGE_ID=$(python3 - <<'PYEOF'
import sys, json
with open('/tmp/bounty_utopia_publish.txt') as f:
    text = f.read()
start = text.index('{')
end = text.rindex('}')
data = json.loads(text[start:end+1])
for c in data.get('objectChanges', []):
    if c.get('type') == 'published':
        print(c['packageId'])
        break
PYEOF
)

UPGRADE_CAP=$(python3 - <<'PYEOF'
import sys, json
with open('/tmp/bounty_utopia_publish.txt') as f:
    text = f.read()
start = text.index('{')
end = text.rindex('}')
data = json.loads(text[start:end+1])
for c in data.get('objectChanges', []):
    if c.get('type') == 'created' and 'UpgradeCap' in c.get('objectType', ''):
        print(c['objectId'])
        break
PYEOF
)

if [ -z "$BOUNTY_PACKAGE_ID" ]; then
    echo "ERROR: could not extract BOUNTY_PACKAGE_ID." >&2
    cat /tmp/bounty_utopia_publish.txt >&2
    exit 1
fi

ENV_FILE="$BOUNTY_DIR/frontend/.env.utopia"
sed -i "s|^VITE_BOUNTY_PACKAGE_ID=.*|VITE_BOUNTY_PACKAGE_ID=$BOUNTY_PACKAGE_ID|" "$ENV_FILE"

echo ""
echo "================================================"
echo " Deploy complete!"
echo ""
echo " BOUNTY_PACKAGE_ID : $BOUNTY_PACKAGE_ID"
echo " UPGRADE_CAP       : $UPGRADE_CAP"
echo ""
echo " .env.utopia updated. Keep UPGRADE_CAP safe — you need it to upgrade the contract."
echo "================================================"
echo ""
