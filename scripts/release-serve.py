"""Start Forma from a checkout or portable bundle and open the default browser."""
import argparse
import functools
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
import socket
import threading
from urllib.request import ProxyHandler, build_opener
import webbrowser

DEFAULT_PORT = 8765


class LocalServer(ThreadingHTTPServer):
    # Windows permits duplicate listeners with SO_REUSEADDR. Use an exclusive
    # socket there so a second launcher reliably reopens the existing instance.
    allow_reuse_address = not hasattr(socket, 'SO_EXCLUSIVEADDRUSE')
    allow_reuse_port = False

    def server_bind(self):
        if hasattr(socket, 'SO_EXCLUSIVEADDRUSE'):
            self.socket.setsockopt(socket.SOL_SOCKET, socket.SO_EXCLUSIVEADDRUSE, 1)
        super().server_bind()


class Handler(SimpleHTTPRequestHandler):
    extensions_map = {**SimpleHTTPRequestHandler.extensions_map,
                      '.wasm': 'application/wasm', '.mjs': 'text/javascript',
                      '.js': 'text/javascript',
                      '.data': 'application/octet-stream',
                      '.webmanifest': 'application/manifest+json'}

    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache')
        self.send_header('X-Content-Type-Options', 'nosniff')
        super().end_headers()


def find_web_root(launcher=None):
    here = Path(launcher or __file__).resolve().parent
    for candidate in (here / 'web', here.parent / 'app' / 'dist'):
        if (candidate / 'index.html').is_file() and (candidate / 'release.json').is_file():
            return candidate
    raise FileNotFoundError(
        'The built Forma application is missing.\n'
        'Portable download: extract the complete ZIP before starting.\n'
        'Source checkout: run npm ci and npm run build in the app folder first.'
    )


def existing_build(url):
    try:
        # Loopback traffic must stay local even when a proxy is configured.
        with build_opener(ProxyHandler({})).open(url + 'release.json', timeout=2) as response:
            return json.loads(response.read(65536))
    except (OSError, ValueError):
        return None


def open_browser(url):
    try:
        if webbrowser.open(url):
            return
    except webbrowser.Error:
        pass
    print(f'Open {url} in your browser to use Forma.', flush=True)


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--no-open', action='store_true', help='Do not open a browser')
    parser.add_argument('--port', type=int, default=DEFAULT_PORT,
                        help='Local port (default: 8765; changing it uses a separate browser workspace)')
    args = parser.parse_args(argv)
    if not 1 <= args.port <= 65535:
        parser.error('The port must be between 1 and 65535.')
    try:
        root = find_web_root()
        release = json.loads((root / 'release.json').read_text(encoding='utf-8'))
        if release.get('application') != 'Forma' or not release.get('build'):
            raise ValueError('The Forma release manifest is invalid. Rebuild or extract a fresh copy.')
    except (OSError, ValueError) as error:
        parser.exit(1, f'{error}\n')
    url = f'http://127.0.0.1:{args.port}/'
    try:
        server = LocalServer(('127.0.0.1', args.port), functools.partial(Handler, directory=str(root)))
    except OSError as error:
        running = existing_build(url)
        if isinstance(running, dict) and running.get('application') == 'Forma':
            if running.get('build') == release['build']:
                print(f'Forma is already running: {url}', flush=True)
                if not args.no_open:
                    open_browser(url)
                return 0
            parser.exit(1, 'Another Forma build is running. Close its server window, then start this copy again.\n')
        parser.exit(1, f'Cannot start Forma on port {args.port}: {error}\n'
                      'Close the application using that port and try again.\n')
    print(f'Forma is ready: {url}\nKeep this terminal open. Press Ctrl+C to close.\n', flush=True)
    if not args.no_open:
        timer = threading.Timer(.4, open_browser, args=(url,))
        timer.daemon = True
        timer.start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
    return 0

if __name__ == '__main__':
    raise SystemExit(main())
