"""Exercise launcher discovery, HTTP startup, repeated starts and OS wrappers."""
import importlib.util
import json
import os
import platform
from pathlib import Path
import shutil
import socket
import subprocess
import sys
import tempfile
import time
import unittest
from urllib.error import HTTPError, URLError
from urllib.request import ProxyHandler, Request, build_opener

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location('forma_launcher', ROOT / 'scripts/release-serve.py')
launcher = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(launcher)
NO_WINDOW = subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0


class LauncherTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix='Forma launcher space ')
        self.addCleanup(self.temporary.cleanup)
        self.folder = Path(self.temporary.name)
        self.opener = build_opener(ProxyHandler({}))

    def portable(self, name='portable', build='test-build'):
        folder = self.folder / name
        web = folder / 'web'
        web.mkdir(parents=True)
        (web / 'index.html').write_text('<!doctype html><title>Forma test</title>', encoding='utf-8')
        (web / 'release.json').write_text(json.dumps({'application': 'Forma', 'build': build}), encoding='utf-8')
        shutil.copy2(ROOT / 'scripts/release-serve.py', folder / 'serve.py')
        for name in ('Start-Forma.cmd', 'Start-Forma.sh', 'Start-Forma.command'):
            shutil.copy2(ROOT / name, folder / name)
        return folder

    def free_port(self):
        with socket.socket() as probe:
            probe.bind(('127.0.0.1', 0))
            return probe.getsockname()[1]

    def run_launcher(self, folder, *args):
        return subprocess.run([sys.executable, str(folder / 'serve.py'), *args],
                              cwd=self.folder, capture_output=True, text=True, timeout=10,
                              creationflags=NO_WINDOW)

    def start_server(self, folder):
        port = self.free_port()
        server = subprocess.Popen([sys.executable, str(folder / 'serve.py'), '--no-open', '--port', str(port)],
                                  cwd=self.folder, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                                  creationflags=NO_WINDOW)
        def stop():
            if server.poll() is None:
                server.terminate()
            server.communicate(timeout=10)
        self.addCleanup(stop)
        url = f'http://127.0.0.1:{port}/'
        for _ in range(50):
            if server.poll() is not None:
                self.fail(server.communicate()[0].decode('utf-8', errors='replace'))
            try:
                with self.opener.open(url + 'release.json', timeout=.2) as response:
                    json.load(response)
                return port, url
            except (OSError, URLError):
                time.sleep(.05)
        self.fail('Launcher server did not become ready')

    def test_discovers_portable_build_from_any_working_directory(self):
        folder = self.portable()
        self.assertEqual(launcher.find_web_root(folder / 'serve.py'), folder / 'web')

    def test_discovers_checkout_build(self):
        scripts = self.folder / 'source with spaces' / 'scripts'
        scripts.mkdir(parents=True)
        web = scripts.parent / 'app' / 'dist'
        web.mkdir(parents=True)
        (web / 'index.html').write_text('Forma', encoding='utf-8')
        (web / 'release.json').write_text('{}', encoding='utf-8')
        self.assertEqual(launcher.find_web_root(scripts / 'release-serve.py'), web)

    def test_missing_build_explains_how_to_start(self):
        with self.assertRaisesRegex(FileNotFoundError, 'npm run build'):
            launcher.find_web_root(self.folder / 'serve.py')

    def test_rejects_invalid_ports_before_starting(self):
        result = self.run_launcher(self.portable(), '--no-open', '--port', '0')
        self.assertEqual(result.returncode, 2)
        self.assertIn('between 1 and 65535', result.stderr)

    def test_serves_app_modules_and_wasm_and_reuses_running_build(self):
        folder = self.portable()
        (folder / 'web' / 'engine.js').write_text('export const ready = true;', encoding='utf-8')
        (folder / 'web' / 'engine.wasm').write_bytes(b'\x00asm')
        port, url = self.start_server(folder)
        for name, content_type in [('index.html', 'text/html'), ('engine.js', 'text/javascript'), ('engine.wasm', 'application/wasm')]:
            with self.opener.open(url + name, timeout=2) as response:
                self.assertEqual(response.read(), (folder / 'web' / name).read_bytes())
                self.assertEqual(response.headers.get_content_type(), content_type)
                self.assertEqual(response.headers['Cache-Control'], 'no-cache')
        with self.assertRaises(HTTPError) as denied:
            self.opener.open(Request(url, data=b'test', method='POST'), timeout=2)
        self.assertEqual(denied.exception.code, 501)
        denied.exception.close()
        again = self.run_launcher(folder, '--no-open', '--port', str(port))
        self.assertEqual(again.returncode, 0, again.stderr)
        self.assertIn('already running', again.stdout)
        other = self.run_launcher(self.portable('other', 'different-build'), '--no-open', '--port', str(port))
        self.assertEqual(other.returncode, 1)
        self.assertIn('Another Forma build', other.stderr)

    def test_busy_port_reports_error_without_opening_another_application(self):
        folder = self.portable()
        with socket.socket() as occupied:
            occupied.bind(('127.0.0.1', 0))
            occupied.listen()
            result = self.run_launcher(folder, '--no-open', '--port', str(occupied.getsockname()[1]))
        self.assertEqual(result.returncode, 1)
        self.assertIn('Close the application using that port', result.stderr)

    @unittest.skipUnless(os.name == 'nt', 'Windows command launcher')
    def test_windows_launcher_handles_spaces_and_forwards_arguments(self):
        folder = self.portable()
        result = subprocess.run([os.environ.get('COMSPEC', 'cmd.exe'), '/d', '/c',
                                 str(folder / 'Start-Forma.cmd'), '--help'],
                                cwd=self.folder, input='\n', capture_output=True, text=True,
                                timeout=20, creationflags=NO_WINDOW)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn('--no-open', result.stdout)
        self.assertIn('--port', result.stdout)

    @unittest.skipIf(os.name == 'nt', 'POSIX launchers run on Linux/macOS')
    def test_posix_launchers_handle_spaces_and_forward_arguments(self):
        folder = self.portable()
        for name in ('Start-Forma.sh', 'Start-Forma.command'):
            with self.subTest(launcher=name):
                result = subprocess.run(['/bin/sh', str(folder / name), '--help'], cwd=self.folder,
                                        capture_output=True, text=True, timeout=10)
                self.assertEqual(result.returncode, 0, result.stderr)
                self.assertIn('--no-open', result.stdout)


if __name__ == '__main__':
    record = '--record' in sys.argv
    if record:
        sys.argv.remove('--record')
    result = unittest.main(verbosity=2, exit=False).result
    if record:
        report = {'passed': result.wasSuccessful(), 'platform': platform.system(),
                  'tests': result.testsRun, 'failures': len(result.failures),
                  'errors': len(result.errors), 'skipped': [reason for _, reason in result.skipped],
                  'checks': ['checkout and portable build discovery', 'missing-build guidance',
                             'port validation and collision handling', 'actual loopback HTTP startup',
                             'JavaScript/WebAssembly MIME types', 'same-build reuse and different-build guard',
                             'platform launcher argument forwarding from a folder with spaces']}
        (ROOT/'evidence/release/launcher-check.json').write_text(json.dumps(report, indent=2)+'\n', encoding='utf-8')
    raise SystemExit(0 if result.wasSuccessful() else 1)
