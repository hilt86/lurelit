#!/usr/bin/env bash
#
# seed-test-data.sh
#
# Injects test documents into Elasticsearch that match IOCs from the Smish Analyzer
# test screenshots. This makes the "Environment Threat Hunt" step find real hits.
#
# Usage:
#   ./scripts/seed-test-data.sh [ELASTICSEARCH_URL] [USERNAME] [PASSWORD]
#
# Defaults to http://localhost:9200 with elastic/changeme if not provided.
#

ES_URL="${1:-http://localhost:9200}"
ES_USER="${2:-elastic}"
ES_PASS="${3:-changeme}"
AUTH="-u ${ES_USER}:${ES_PASS}"

TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")
YESTERDAY=$(date -u -v-1d +"%Y-%m-%dT%H:%M:%S.000Z" 2>/dev/null || date -u -d "yesterday" +"%Y-%m-%dT%H:%M:%S.000Z")
TWO_DAYS=$(date -u -v-2d +"%Y-%m-%dT%H:%M:%S.000Z" 2>/dev/null || date -u -d "2 days ago" +"%Y-%m-%dT%H:%M:%S.000Z")

echo "=== Smish Analyzer Test Data Seeder ==="
echo "Target: ${ES_URL}"
echo "Timestamp: ${TIMESTAMP}"
echo ""

# ──────────────────────────────────────────────────────────
# IOCs from test screenshots (with real VT-flagged URLs)
# ──────────────────────────────────────────────────────────
# USPS smish:   usps-redelivery.info/track        (VT: 2 mal)
# E-ZPass smish: ezpass.com-licy.win/us            (VT: 13 mal)
# M365 phish:   loginmicrosoftonline.uk            (VT: 12 mal)
#               brewasigfi1978.workers.dev          (VT: 13 mal)
#               mail-service-update.com             (VT: 8 mal)
# ──────────────────────────────────────────────────────────

inject() {
  local idx="$1" doc="$2" label="$3"
  result=$(curl -s -w "\n%{http_code}" $AUTH -X POST "${ES_URL}/${idx}/_doc" \
    -H 'Content-Type: application/json' -d "$doc")
  code=$(echo "$result" | tail -1)
  if [ "$code" = "201" ] || [ "$code" = "200" ]; then
    echo "  [OK]  ${label}"
  else
    echo "  [ERR] ${label} (HTTP ${code})"
  fi
}

IDX="logs-endpoint.events.network-default"

echo "── USPS Smishing IOCs ──"
inject "$IDX" "{
  \"@timestamp\": \"${YESTERDAY}\",
  \"event\": { \"category\": [\"network\"], \"type\": [\"protocol\"], \"action\": \"lookup_result\" },
  \"dns\": { \"question\": { \"name\": \"usps-redelivery.info\", \"type\": \"A\" }, \"answers\": [{ \"data\": \"185.234.72.19\" }] },
  \"source\": { \"ip\": \"10.0.1.45\" },
  \"host\": { \"name\": \"WORKSTATION-14\", \"os\": { \"family\": \"windows\" } },
  \"user\": { \"name\": \"jsmith\" },
  \"network\": { \"protocol\": \"dns\" }
}" "DNS resolve usps-redelivery.info -> WORKSTATION-14"

inject "$IDX" "{
  \"@timestamp\": \"${YESTERDAY}\",
  \"event\": { \"category\": [\"network\"], \"type\": [\"connection\"], \"action\": \"http_request\", \"outcome\": \"success\" },
  \"url\": { \"full\": \"https://usps-redelivery.info/track\", \"domain\": \"usps-redelivery.info\", \"path\": \"/track\", \"scheme\": \"https\" },
  \"destination\": { \"domain\": \"usps-redelivery.info\", \"ip\": \"185.234.72.19\", \"port\": 443 },
  \"source\": { \"ip\": \"10.0.1.45\" },
  \"host\": { \"name\": \"WORKSTATION-14\", \"os\": { \"family\": \"windows\" } },
  \"user\": { \"name\": \"jsmith\" },
  \"http\": { \"request\": { \"method\": \"GET\" }, \"response\": { \"status_code\": 200 } },
  \"user_agent\": { \"original\": \"Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/125.0\" }
}" "HTTP GET usps-redelivery.info/track -> WORKSTATION-14"

echo ""
echo "── E-ZPass Smishing IOCs ──"
inject "$IDX" "{
  \"@timestamp\": \"${TIMESTAMP}\",
  \"event\": { \"category\": [\"network\"], \"type\": [\"protocol\"], \"action\": \"lookup_result\" },
  \"dns\": { \"question\": { \"name\": \"ezpass.com-licy.win\", \"type\": \"A\" }, \"answers\": [{ \"data\": \"104.21.33.87\" }] },
  \"source\": { \"ip\": \"10.0.2.12\" },
  \"host\": { \"name\": \"LAPTOP-MARKETING-03\", \"os\": { \"family\": \"windows\" } },
  \"user\": { \"name\": \"agarcia\" },
  \"network\": { \"protocol\": \"dns\" }
}" "DNS resolve ezpass.com-licy.win -> LAPTOP-MARKETING-03"

inject "$IDX" "{
  \"@timestamp\": \"${TIMESTAMP}\",
  \"event\": { \"category\": [\"network\"], \"type\": [\"connection\"], \"action\": \"http_request\", \"outcome\": \"success\" },
  \"url\": { \"full\": \"https://ezpass.com-licy.win/us\", \"domain\": \"ezpass.com-licy.win\", \"path\": \"/us\", \"scheme\": \"https\" },
  \"destination\": { \"domain\": \"ezpass.com-licy.win\", \"ip\": \"104.21.33.87\", \"port\": 443 },
  \"source\": { \"ip\": \"10.0.2.12\" },
  \"host\": { \"name\": \"LAPTOP-MARKETING-03\", \"os\": { \"family\": \"windows\" } },
  \"user\": { \"name\": \"agarcia\" },
  \"http\": { \"request\": { \"method\": \"GET\" }, \"response\": { \"status_code\": 302 } },
  \"user_agent\": { \"original\": \"Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) Safari/605\" }
}" "HTTP GET ezpass.com-licy.win/us -> LAPTOP-MARKETING-03"

echo ""
echo "── M365 Phishing IOCs ──"
inject "$IDX" "{
  \"@timestamp\": \"${TWO_DAYS}\",
  \"event\": { \"category\": [\"network\"], \"type\": [\"protocol\"], \"action\": \"lookup_result\" },
  \"dns\": { \"question\": { \"name\": \"loginmicrosoftonline.uk\", \"type\": \"A\" }, \"answers\": [{ \"data\": \"45.33.32.156\" }] },
  \"source\": { \"ip\": \"10.0.3.8\" },
  \"host\": { \"name\": \"DESKTOP-FINANCE-07\", \"os\": { \"family\": \"windows\" } },
  \"user\": { \"name\": \"bwilson\" },
  \"network\": { \"protocol\": \"dns\" }
}" "DNS resolve loginmicrosoftonline.uk -> DESKTOP-FINANCE-07"

inject "$IDX" "{
  \"@timestamp\": \"${TWO_DAYS}\",
  \"event\": { \"category\": [\"network\"], \"type\": [\"connection\"], \"action\": \"http_request\", \"outcome\": \"success\" },
  \"url\": { \"full\": \"https://loginmicrosoftonline.uk/auth?id=jspiteri&session=verify\", \"domain\": \"loginmicrosoftonline.uk\", \"path\": \"/auth\", \"query\": \"id=jspiteri&session=verify\", \"scheme\": \"https\" },
  \"destination\": { \"domain\": \"loginmicrosoftonline.uk\", \"ip\": \"45.33.32.156\", \"port\": 443 },
  \"source\": { \"ip\": \"10.0.3.8\" },
  \"host\": { \"name\": \"DESKTOP-FINANCE-07\", \"os\": { \"family\": \"windows\" } },
  \"user\": { \"name\": \"bwilson\" },
  \"http\": { \"request\": { \"method\": \"GET\" }, \"response\": { \"status_code\": 200 } },
  \"user_agent\": { \"original\": \"Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/125.0\" }
}" "HTTP GET loginmicrosoftonline.uk/auth -> DESKTOP-FINANCE-07"

inject "$IDX" "{
  \"@timestamp\": \"${TWO_DAYS}\",
  \"event\": { \"category\": [\"network\"], \"type\": [\"connection\"], \"action\": \"connection_attempted\" },
  \"destination\": { \"domain\": \"brewasigfi1978.workers.dev\", \"port\": 443 },
  \"tls\": { \"client\": { \"server_name\": \"brewasigfi1978.workers.dev\" } },
  \"source\": { \"ip\": \"10.0.3.8\" },
  \"host\": { \"name\": \"DESKTOP-FINANCE-07\", \"os\": { \"family\": \"windows\" } },
  \"user\": { \"name\": \"bwilson\" }
}" "TLS to brewasigfi1978.workers.dev -> DESKTOP-FINANCE-07"

inject "$IDX" "{
  \"@timestamp\": \"${TWO_DAYS}\",
  \"event\": { \"category\": [\"network\"], \"type\": [\"protocol\"], \"action\": \"lookup_result\" },
  \"dns\": { \"question\": { \"name\": \"mail-service-update.com\", \"type\": \"MX\" } },
  \"source\": { \"ip\": \"10.0.1.2\" },
  \"host\": { \"name\": \"MAILGW-01\" },
  \"network\": { \"protocol\": \"dns\" }
}" "DNS MX lookup mail-service-update.com -> MAILGW-01"

inject "$IDX" "{
  \"@timestamp\": \"${TWO_DAYS}\",
  \"event\": { \"category\": [\"network\"], \"type\": [\"connection\"], \"action\": \"http_request\", \"outcome\": \"success\" },
  \"url\": { \"full\": \"https://brewasigfi1978.workers.dev/o365/login.php\", \"domain\": \"brewasigfi1978.workers.dev\", \"path\": \"/o365/login.php\", \"scheme\": \"https\" },
  \"destination\": { \"domain\": \"brewasigfi1978.workers.dev\", \"port\": 443 },
  \"source\": { \"ip\": \"10.0.3.8\" },
  \"host\": { \"name\": \"DESKTOP-FINANCE-07\", \"os\": { \"family\": \"windows\" } },
  \"user\": { \"name\": \"bwilson\" },
  \"http\": { \"request\": { \"method\": \"POST\" }, \"response\": { \"status_code\": 200 } },
  \"user_agent\": { \"original\": \"Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/125.0\" }
}" "HTTP POST brewasigfi1978.workers.dev/o365/login.php -> DESKTOP-FINANCE-07 (credential submit!)"

echo ""
echo "=== Done! Injected 9 test documents ==="
echo ""
echo "Affected hosts:"
echo "  WORKSTATION-14      (jsmith)   — clicked USPS smishing link"
echo "  LAPTOP-MARKETING-03 (agarcia)  — clicked E-ZPass smishing link"
echo "  DESKTOP-FINANCE-07  (bwilson)  — opened M365 phish, submitted credentials!"
echo "  MAILGW-01                      — processed phishing sender domain"
echo ""
echo "VT detection counts for embedded URLs:"
echo "  usps-redelivery.info/track            2 malicious"
echo "  ezpass.com-licy.win/us               13 malicious"
echo "  loginmicrosoftonline.uk/auth         12 malicious"
echo "  brewasigfi1978.workers.dev           13 malicious"
echo "  mail-service-update.com               8 malicious"
echo ""
echo "These docs will be found in ES|QL queries searching:"
echo "  dns.question.name, destination.domain, url.full, url.domain,"
echo "  tls.client.server_name, http.request.method"
