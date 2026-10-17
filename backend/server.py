"""Ellie MVP server.

Serves the web app (app/) and one endpoint, POST /api/check, that scores a pasted
message (SMS, WhatsApp, email) or a call transcript with Claude, using the same
prompt as the call scorer. Without an API key the web app falls back to its
built-in rules, so the page always works.

Run:
  pip install anthropic
  python backend/server.py            # then open http://localhost:8000
"""
import json
import os
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend" / "scoring"))
import score  # noqa: E402

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


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=str(ROOT / "app"), **kw)

    def do_POST(self):
        if self.path != "/api/check":
            self.send_error(404)
            return
        try:
            body = json.loads(self.rfile.read(int(self.headers.get("Content-Length", 0))) or b"{}")
            text = str(body.get("text", ""))[:6000]
            if not text.strip():
                raise ValueError("empty")
            if not os.environ.get("ANTHROPIC_API_KEY"):
                raise RuntimeError("no key")
            c = score.claude_score("Message or call transcript received by the user:\n\n" + text)
            out = {
                "score": round(float(c.get("probability", 0)) * 100),
                "reason": c.get("reason", ""),
                "advice": c.get("advice", ""),
                "scenario": c.get("scenario", "other"),
                "warning": c.get("warning", ""),
                "tactics": [{"id": t.get("id"), "name": NAMES.get(t.get("id"), t.get("id")),
                             "evidence": t.get("evidence", "")} for t in c.get("tactics", [])],
            }
            data = json.dumps(out).encode()
            self.send_response(200)
        except Exception as e:  # the page falls back to rules on any error
            data = json.dumps({"error": str(e)}).encode()
            self.send_response(503)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)


if __name__ == "__main__":
    score.load_env()
    port = int(os.environ.get("PORT", 8000))
    print(f"Ellie on http://localhost:{port}  (Claude: {'on' if os.environ.get('ANTHROPIC_API_KEY') else 'off, rules only'})")
    ThreadingHTTPServer(("", port), Handler).serve_forever()
