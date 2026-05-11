#!/usr/bin/env bash
#
# cleanup-test-data.sh
#
# Removes test documents injected by seed-test-data.sh
#
# Usage:
#   ./scripts/cleanup-test-data.sh [ELASTICSEARCH_URL] [USERNAME] [PASSWORD]
#

ES_URL="${1:-http://localhost:9200}"
ES_USER="${2:-elastic}"
ES_PASS="${3:-changeme}"
AUTH="-u ${ES_USER}:${ES_PASS}"

DOMAINS=(
  "usps-redelivery.info"
  "ezpass.com-licy.win"
  "loginmicrosoftonline.uk"
  "brewasigfi1978.workers.dev"
  "mail-service-update.com"
)

echo "=== Cleaning up Smish Analyzer test data ==="

for domain in "${DOMAINS[@]}"; do
  echo -n "  ${domain}: "
  result=$(curl -s $AUTH -X POST "${ES_URL}/logs-endpoint.events.network-default/_delete_by_query" \
    -H 'Content-Type: application/json' -d "{
    \"query\": {
      \"bool\": {
        \"should\": [
          { \"match_phrase\": { \"dns.question.name\": \"${domain}\" } },
          { \"match_phrase\": { \"destination.domain\": \"${domain}\" } },
          { \"match_phrase\": { \"url.domain\": \"${domain}\" } },
          { \"match_phrase\": { \"tls.client.server_name\": \"${domain}\" } }
        ],
        \"minimum_should_match\": 1
      }
    }
  }")
  deleted=$(echo "$result" | python3 -c "import sys,json; print(json.load(sys.stdin).get('deleted',0))" 2>/dev/null || echo "?")
  echo "${deleted} docs deleted"
done

echo ""
echo "=== Cleanup complete ==="
