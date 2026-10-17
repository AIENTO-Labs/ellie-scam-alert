# Claude endpoint for the public pages (n8n)

The GitHub Pages site is static, so it cannot hold an API key. This n8n workflow gives the pages an HTTPS endpoint that calls Claude with the scorer prompt and returns the verdict with CORS enabled.

1. In n8n: Workflows → Import from file → `ellie-score-webhook.json`.
2. Open the **Claude** node and attach your Anthropic credential (type "Anthropic").
3. Activate the workflow. The endpoint is `POST https://<your-n8n>/webhook/ellie-score` with `{"text": "...", "channel": "call|sms|whatsapp|email"}`.
4. Open the pages with `?api=https://<your-n8n>/webhook/ellie-score`, or set `ELLIE_API` at the top of `app/live.html` and `app/index.html`.

Response: `{score, probability, scenario, tactics[], reason, advice, warning, engine}`. The `warning` is what Ellie says out loud, written by Claude for the scam pattern it recognised (fake police, bank fraud, grandchild trick, tech support, tax office, parcel, investment).
