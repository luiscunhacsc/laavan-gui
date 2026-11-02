"""Serve a portable Forma bundle on its stable, private browser origin."""
import argparse
import functools
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import threading
import webbrowser

class Handler(SimpleHTTPRequestHandler):
    extensions_map = {**SimpleHTTPRequestHandler.extensions_map,
                      '.wasm': 'application/wasm', '.mjs': 'text/javascript',
                      '.data': 'application/octet-stream',
                      '.webmanifest': 'application/manifest+json'}

    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache')
        self.send_header('X-Content-Type-Options', 'nosniff')
        super().end_headers()

    def do_GET(self):
        # This static server has no upload, evidence or analysis endpoint.
        super().do_GET()

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--no-open', action='store_true', help='Do not open a browser')
    args = parser.parse_args()
    root = Path(__file__).resolve().parent / 'web'
    if not (root / 'release.json').is_file():
        parser.error('The web folder is missing. Extract the complete Forma ZIP first.')
    try:
        server = ThreadingHTTPServer(('127.0.0.1', 8765), functools.partial(Handler, directory=str(root)))
    except OSError as error:
        parser.exit(1, f'Cannot start Forma on port 8765: {error}\nClose the other server and try again.\n')
    url = 'http://127.0.0.1:8765/'
    print(f'Forma is ready: {url}\nKeep this terminal open. Press Ctrl+C to close.\n', flush=True)
    if not args.no_open:
        threading.Timer(.4, lambda: webbrowser.open(url)).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()

if __name__ == '__main__':
    main()
