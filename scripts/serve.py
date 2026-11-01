"""Loopback-only static development server with a bounded benchmark evidence sink."""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)
    def do_GET(self):
        if self.path == '/__evidence/':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers(); self.wfile.write(b'{"enabled":true}'); return
        super().do_GET()
    def do_POST(self):
        match = re.fullmatch(r'/__evidence/([\dTZ-]+)/([a-z-]+\.json)', self.path)
        if not match or match[2] not in {'benchmark.json', 'progress.json', 'results.json', 'parameter-tables.json'}:
            self.send_error(404); return
        if self.headers.get('Origin') != 'http://127.0.0.1:8000':
            self.send_error(403); return
        length = int(self.headers.get('Content-Length', '0'))
        if not 0 < length < 8_000_000:
            self.send_error(413); return
        dest = ROOT / 'evidence' / 'browser' / match[1] / match[2]
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(self.rfile.read(length))
        self.send_response(201); self.end_headers()

if __name__ == '__main__':
    print('Phase 0 lab: http://127.0.0.1:8000/spike/ (Ctrl+C to stop)', flush=True)
    ThreadingHTTPServer(('127.0.0.1', 8000), Handler).serve_forever()
