"""Vercel serverless endpoint: POST /api/check {text, channel} -> Ellie's verdict from Claude.

Deploy: import the repo in Vercel, set ANTHROPIC_API_KEY in the project's environment
variables, deploy. The repo is served as static files (see vercel.json for the short
redirects), so https://ellie.aiento.eu/app/live.html and /app/ score through Claude with
no setup. The response carries CORS headers, so the GitHub Pages copies call the same
endpoint (ELLIE_API in app/live.html and app/index.html, or ?api=... on the URL).
"""
import json
import os
import sys
from http.server import BaseHTTPRequestHandler
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend" / "scoring"))

NAMES = {
    "authority_impersonation": "Pretends to be an official or company",
    "urgency": "Pressure to act fast",
    "secrecy": "Asks you to keep it secret",
    "threat": "Threatens a loss",
    "payment_request": "Asks for money",
    "credential_request": "Asks for codes or passwords",
    "remote_access": "Asks you to install a remote access app",
    "emotional_manipulation": "Plays on your feelings",
    "isolation": "Tries to keep you on the line",
}

CORS = {"Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"}


class handler(BaseHTTPRequestHandler):
    def _send(self, code, payload):
        data = json.dumps(payload).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        for k, v in CORS.items():
            self.send_header(k, v)
        self.end_headers()
        self.wfile.write(data)

    def do_OPTIONS(self):
        self.send_response(204)
        for k, v in CORS.items():
            self.send_header(k, v)
        self.end_headers()

    def do_POST(self):
        try:
            import score
            body = json.loads(self.rfile.read(int(self.headers.get("Content-Length", 0))) or b"{}")
            text = str(body.get("text", ""))[:10000]
            channel = str(body.get("channel", "sms"))
            if not text.strip():
                return self._send(400, {"error": "text is required"})
            if not os.environ.get("ANTHROPIC_API_KEY"):
                return self._send(503, {"error": "ANTHROPIC_API_KEY is not set on the server"})
            c = score.claude_score(f"Channel: {channel}\n\nMessage or call transcript received by the user:\n\n{text}")
            self._send(200, {
                "score": round(float(c.get("probability", 0)) * 100),
                "probability": float(c.get("probability", 0)),
                "scenario": c.get("scenario", "other"),
                "reason": c.get("reason", ""),
                "advice": c.get("advice", ""),
                "warning": c.get("warning", ""),
                "tactics": [{"id": t.get("id"), "name": NAMES.get(t.get("id"), t.get("id")),
                             "evidence": t.get("evidence", "")} for t in c.get("tactics", [])],
                "engine": score.MODEL + " via vercel",
            })
        except Exception as e:  # the pages fall back to rules on any error
            self._send(503, {"error": str(e)})
