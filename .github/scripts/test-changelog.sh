#!/bin/bash
# Test the changelog generator locally
# Usage: ./test-changelog.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🧪 Testing Changelog Generator"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "📝 Testing Android Production Changelog:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
bash "${SCRIPT_DIR}/generate-changelog.sh" android production
echo ""

echo "📝 Testing Android Preview Changelog:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
bash "${SCRIPT_DIR}/generate-changelog.sh" android preview
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Test Complete!"
echo ""
echo "💡 Tips:"
echo "   • Make commits using conventional commit format"
echo "   • Valid types: feat, fix, perf, refactor"
echo "   • Include scope: feat(client): or feat(shared):"
echo "   • Mobile apps use (client) and (shared) scopes"
echo ""
echo "📚 Examples:"
echo "   feat(client): add tournament mode"
echo "   fix(shared): correct coral placement logic"
echo "   perf(client): improve rendering performance"
echo "   feat(client)!: redesign game board (breaking change)"

