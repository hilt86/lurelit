<p align="center">
  <img src="public/favicon.svg" alt="Lurelit" width="80" />
</p>

<h1 align="center">Lurelit</h1>

<p align="center">
  <strong>An agentic screenshot analyzer that lights up phishing and smishing lures.</strong>
</p>

<p align="center">
  <em>Named for the anglerfish's bioluminescent lure — Lurelit illuminates the deceptive glow of phishing attacks, making the invisible threat visible.</em>
</p>

---

## Features

- **AI-Powered Classification** — Claude Opus 4.7 vision analyzes screenshots to classify phishing, smishing, spam, or legitimate messages
- **IOC Extraction & Enrichment** — Automatically extracts URLs, domains, IPs, and hashes, then enriches via VirusTotal and urlscan.io
- **Environment Threat Hunting** — ES|QL queries hunt your Elasticsearch data for evidence of extracted IOCs in your org's logs
- **Human-in-the-Loop Approval** — Configurable approval gates before high-cost threat hunting operations
- **Real-Time Progress Tracking** — Live workflow timeline with step-by-step progress and elapsed timers
- **Bulk Analysis** — Submit multiple screenshots in parallel for batch processing
- **Slack Notifications** — Formatted Block Kit reports delivered to your team's Slack channel
- **Cost Tracking** — Token usage and estimated costs displayed for each AI operation
- **History & Metrics** — Full execution history with filtering, stats cards, and trend dashboards

## Screenshots

### Upload & Submission

[![Upload hero — Light up the lures](examples/screenshots/upload-hero.png)](examples/screenshots/upload-hero.png)

[![Multi-file upload](examples/screenshots/multi-file-upload.png)](examples/screenshots/multi-file-upload.png)

### Analysis In Progress

[![Analysis in progress with live step timeline](examples/screenshots/analysis-in-progress.png)](examples/screenshots/analysis-in-progress.png)

[![Active analyses bar](examples/screenshots/active-analyses-bar.png)](examples/screenshots/active-analyses-bar.png)

### Results & Verdicts

[![Results verdict header](examples/screenshots/results-verdict-header.png)](examples/screenshots/results-verdict-header.png)

[![Analysis complete with hunt results](examples/screenshots/analysis-complete-with-hunt-results.png)](examples/screenshots/analysis-complete-with-hunt-results.png)

[![Result — spam, no threat](examples/screenshots/result-spam-no-threat.png)](examples/screenshots/result-spam-no-threat.png)

### Sample Inputs — Phishing & Smishing

[![Phishing email — Microsoft 365](examples/screenshots/phishing-email-microsoft365.png)](examples/screenshots/phishing-email-microsoft365.png)

[![Phishing email with real IOCs — Microsoft 365](examples/screenshots/phishing-email-real-ioc-microsoft365.png)](examples/screenshots/phishing-email-real-ioc-microsoft365.png)

[![Smishing SMS — EZPass toll](examples/screenshots/smishing-sms-ezpass-toll.png)](examples/screenshots/smishing-sms-ezpass-toll.png)

[![Smishing with real IOCs — EZPass](examples/screenshots/smishing-real-ioc-ezpass.png)](examples/screenshots/smishing-real-ioc-ezpass.png)

[![Smishing SMS — USPS delivery](examples/screenshots/smishing-sms-usps-delivery.png)](examples/screenshots/smishing-sms-usps-delivery.png)

[![Smishing with real IOCs — USPS](examples/screenshots/smishing-real-ioc-usps.png)](examples/screenshots/smishing-real-ioc-usps.png)

### Sample Inputs — Benign & Spam

[![Benign email — Microsoft sign-in](examples/screenshots/benign-email-microsoft-signin.png)](examples/screenshots/benign-email-microsoft-signin.png)

[![Benign SMS — Amazon delivery](examples/screenshots/benign-sms-amazon-delivery.png)](examples/screenshots/benign-sms-amazon-delivery.png)

[![Spam email — cold outreach](examples/screenshots/spam-email-cold-outreach.png)](examples/screenshots/spam-email-cold-outreach.png)

[![Spam SMS — marketing](examples/screenshots/spam-sms-marketing.png)](examples/screenshots/spam-sms-marketing.png)

### IOC Enrichment

[![IOC enrichment results](examples/screenshots/ioc-enrichment-results.png)](examples/screenshots/ioc-enrichment-results.png)

[![Enrichment summary with hunt recommendations](examples/screenshots/enrichment-summary-hunt-recommendations.png)](examples/screenshots/enrichment-summary-hunt-recommendations.png)

### Threat Hunting

[![Threat hunt results](examples/screenshots/threat-hunt-results.png)](examples/screenshots/threat-hunt-results.png)

### Human-in-the-Loop

[![HITL approval — full view](examples/screenshots/hitl-approval-full.png)](examples/screenshots/hitl-approval-full.png)

[![HITL approval — header](examples/screenshots/hitl-approval-header.png)](examples/screenshots/hitl-approval-header.png)

[![HITL approval — prompt UI](examples/screenshots/hitl-approval-prompt-ui.png)](examples/screenshots/hitl-approval-prompt-ui.png)

[![HITL approval — step card](examples/screenshots/hitl-approval-step-card.png)](examples/screenshots/hitl-approval-step-card.png)

[![HITL trigger — approved hunt](examples/screenshots/hitl-trigger-approved-hunt.png)](examples/screenshots/hitl-trigger-approved-hunt.png)

[![HITL trigger — no hunt (loyalty reward)](examples/screenshots/hitl-trigger-no-hunt-loyalty-reward.png)](examples/screenshots/hitl-trigger-no-hunt-loyalty-reward.png)

### Dashboard & Metrics

[![Dashboard metrics with Sankey diagram](examples/screenshots/dashboard-metrics-sankey.png)](examples/screenshots/dashboard-metrics-sankey.png)

[![Cost breakdown panel](examples/screenshots/cost-breakdown-panel.png)](examples/screenshots/cost-breakdown-panel.png)

[![History — verdicts & activity](examples/screenshots/history-verdicts-activity.png)](examples/screenshots/history-verdicts-activity.png)

### Notifications

[![Slack notification with Kibana link](examples/screenshots/slack-notification-kibana.png)](examples/screenshots/slack-notification-kibana.png)

---

## Quick Start

### From Source

```bash
git clone https://github.com/jamesspi/lurelit.git
cd lurelit
npm install
npm run dev
# Open http://localhost:5001
# Admin key shown in terminal
```

### With Docker

```bash
git clone https://github.com/jamesspi/lurelit.git
cd lurelit
docker compose up
# Open http://localhost:5001
# Admin key shown in container logs: docker compose logs lurelit
```

### With Docker + env vars (skip setup wizard)

```bash
docker compose up -e KIBANA_URL=https://your-kibana:5601 -e WORKFLOW_ID=your-workflow-id -e CONFIG_SECRET=your-secret
# Goes straight to login, no setup wizard needed
```

Both methods run on port **5001**. On first launch (without env vars), the setup wizard guides you through connecting to Kibana and configuring your workflow.

### First-Time Setup Walkthrough

On first launch, Lurelit has no configuration and will guide you through an interactive setup wizard:

1. **Admin key displayed in terminal** — On first startup, Lurelit generates a one-time admin key and prints it to the server console/Docker logs. Copy it.
2. **Navigate to `http://localhost:5001/setup`** — The app redirects here automatically when unconfigured.
3. **Enter the admin key** — Paste the key from the terminal to unlock the wizard.
4. **Enter Kibana URL + credentials** — Provide your Kibana instance URL (e.g., `http://localhost:5601`) and a username/password with workflow execution privileges.
5. **Validate connection & prerequisites** — The wizard auto-checks: Kibana connectivity, version (9.4+), Workflows API, Agent Builder, and Security solution.
6. **Review connectors** — The wizard scans for required HTTP connectors (Anthropic API, VirusTotal, urlscan.io) and optional ones (Slack). Create any missing connectors directly from the wizard by entering your API keys.
7. **Select AI models** — Choose which inference endpoints to use for enrichment/hunting (primary) and report formatting (secondary) from your available connectors.
8. **Import or select workflow** — If a matching workflow already exists, select it. Otherwise, import the bundled Lurelit workflow with your configured connectors.
9. **Launch!** — Configuration is encrypted and saved. You're redirected to the login page.
10. **Login with Kibana credentials** — Use the same username/password from step 4.
11. **Start analyzing screenshots** — Upload a screenshot of a suspicious message and get an AI-powered verdict.

### Skipping the Setup Wizard

When environment variables (`KIBANA_URL` + `WORKFLOW_ID`) are set, the app goes straight to the login page — no setup wizard needed. See the "With Docker + env vars" command above. This is ideal for:
- Docker deployments with pre-configured environments
- CI/CD pipelines
- Automated provisioning

Open [http://localhost:5001](http://localhost:5001) and log in with your Kibana credentials.

## Prerequisites

| Component | Version | Notes |
|-----------|---------|-------|
| Elastic Stack | 9.4+ | Kibana with Security Workflows GA |
| Agent Builder | Accessible from left nav | Elastic AI Agent with capabilities enabled |
| Node.js | 20+ | For local development |
| Anthropic API | Claude Opus 4.7 | Vision-capable model for screenshot analysis |
| VirusTotal API | v3 | IOC enrichment (free tier works, premium recommended) |
| urlscan.io API | v1 | Domain/URL reputation |

> **Don't have an Elastic cluster yet?** Start a free [Elastic Cloud trial](https://cloud.elastic.co/registration) or use [start-local](https://www.elastic.co/docs/deploy-manage/deploy/self-managed/local-development-installation-quickstart) for quick self-managed testing (a trial license is required for Workflows and Agent Builder features).

## Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `KIBANA_URL` | Yes | Full URL to your Kibana instance (no trailing slash) |
| `WORKFLOW_ID` | Yes | Auto-generated workflow ID from Kibana (see docs) |
| `CONFIG_SECRET` | No | Encryption secret for stored config (AES-256-GCM) |

### UI-Based Setup

If env vars aren't set, configure via the Settings modal in the navigation bar. Settings are encrypted and persisted to `.smish-config.enc`.

## Securing with HTTPS

Lurelit runs on HTTP by default. For production deployments, TLS should be configured via a reverse proxy.

### Recommended: Nginx Reverse Proxy

```nginx
server {
    listen 443 ssl;
    server_name lurelit.yourdomain.com;

    ssl_certificate /etc/ssl/certs/lurelit.crt;
    ssl_certificate_key /etc/ssl/private/lurelit.key;

    location / {
        proxy_pass http://localhost:5001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Alternative: Caddy (Auto-TLS with Let's Encrypt)

```
lurelit.yourdomain.com {
    reverse_proxy localhost:5001
}
```

Caddy automatically provisions and renews certificates.

### Docker with TLS

```yaml
# docker-compose.yml with Caddy
services:
  lurelit:
    build: .
    ports:
      - "5001:5001"
    environment:
      - KIBANA_URL=https://your-kibana:5601
      - WORKFLOW_ID=your-workflow-id
  caddy:
    image: caddy:alpine
    ports:
      - "443:443"
      - "80:80"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
    depends_on:
      - lurelit
```

### Important Notes

- When running behind a proxy, session cookies are marked `secure: true` in production (`NODE_ENV=production`)
- Set `NODE_ENV=production` when deploying with TLS
- The `X-Forwarded-Proto` header ensures Lurelit knows it's behind HTTPS
- Native TLS support may be added in a future release

## Workflow Setup

The workflow YAML is included at `workflow/phishing-smishing-screenshot-analyzer.yaml`.

1. Navigate to **Security → Workflows** in Kibana
2. Create a new workflow and switch to the YAML editor
3. Paste the workflow YAML from this project
4. Update all `connector-id` references to match your own connectors
5. Save and enable the workflow
6. Copy the auto-generated **Workflow ID** from the URL and paste it into Lurelit settings

> **Note:** Connector IDs are auto-generated by Kibana. You must create connectors within the Workflows UI and update the YAML references. See the [in-app documentation](/docs) for detailed connector setup guides.

## Architecture

```
┌─────────────────────────────────────────────────────┐
│  Lurelit (Next.js 16 / React 19)                    │
│                                                     │
│  Upload → Submit → Poll Status → Render Results     │
└──────────────────────────┬──────────────────────────┘
                           │ REST API
                           ▼
┌─────────────────────────────────────────────────────┐
│  Kibana Workflows Engine (9.4+)                     │
│                                                     │
│  1. AI Analysis (Anthropic Claude Opus 4.7)         │
│  2. Parse structured classification + IOCs          │
│  3. IOC Enrichment (VirusTotal + urlscan.io)        │
│  4. Summarize enrichment (AI Agent)                 │
│  5. Environment threat hunt (AI Agent + ES|QL)      │
│  6. Final report + Slack notification               │
└─────────────────────────────────────────────────────┘
```

### Tech Stack

- **Next.js 16** — App Router with server-side API routes
- **React 19** — Client components with hooks
- **TypeScript** — Strict mode throughout
- **Tailwind CSS** — Utility classes + custom CSS properties
- **[Elastic Workflows](https://www.elastic.co/docs/solutions/security/ai/workflows)** — Agentic execution engine
- **[Agent Builder](https://www.elastic.co/docs/solutions/security/ai/agent-builder)** — AI agent orchestration for threat hunting

### API Routes

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/auth/login` | Validate credentials, create session |
| POST | `/api/auth/logout` | Destroy session cookie |
| GET | `/api/auth/me` | Check authentication status |
| POST | `/api/submit` | Submit screenshot for analysis |
| GET | `/api/status/[id]` | Poll execution status & results |
| GET | `/api/history` | List past executions |
| GET | `/api/metrics` | Aggregate threat/safe counts |
| GET/POST | `/api/settings` | Read/save configuration |
| GET | `/api/settings/test` | Test Kibana connectivity |

## Testing

### Example Screenshots

Ready-to-use PNG screenshots are provided in `examples/screenshots/` covering all analysis paths — benign messages, phishing/smishing threats, spam, and HITL trigger scenarios. Upload them directly to Lurelit to validate classification, enrichment, and threat hunting end-to-end.

Screenshots with `real-ioc` in the filename contain IOCs flagged by VirusTotal. Combine them with the seed data script (below) to produce both VT enrichment hits and environment hunt hits.

### Seed Test Data

```bash
# Inject test documents matching IOCs from test screenshots
./scripts/seed-test-data.sh [ELASTICSEARCH_URL] [USERNAME] [PASSWORD]

# Defaults to localhost:9200 with elastic/changeme
./scripts/seed-test-data.sh
```

### Demo Mode

If no Kibana URL or Workflow ID is configured, Lurelit enters demo mode with simulated workflow execution — useful for UI development without a live backend.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License — see [LICENSE](LICENSE) for details.

---

<p align="center">
  Built by <strong><a href="https://www.linkedin.com/in/jamesspiteri/">James Spiteri</a></strong> · Powered by <strong><a href="https://www.elastic.co/docs/explore-analyze/workflows">Elastic Workflows</a></strong> and <strong><a href="https://www.elastic.co/docs/explore-analyze/ai-features/elastic-agent-builder">Agent Builder</a></strong>
</p>
