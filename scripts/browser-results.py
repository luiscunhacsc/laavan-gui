"""Import a browser download and summarise actual browser feasibility evidence.

This never treats the Node.js experiment as a browser run. Numerical agreement
is checked by the same independent comparison used for the original spike.
"""
from argparse import ArgumentParser
from pathlib import Path
import json
import re
import statistics
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
BROWSER = ROOT / 'evidence' / 'browser'

def browser_name(agent):
    if 'Electron/' in agent:
        return 'Embedded Chromium / Electron'
    if re.search(r'Edg(?:e|A|iOS)?/', agent): return 'Edge'
    if re.search(r'(Firefox|FxiOS)/', agent): return 'Firefox'
    if re.search(r'(Chrome|CriOS)/', agent): return 'Chrome'
    if 'Safari/' in agent and 'Version/' in agent: return 'Safari'
    return 'Other browser / embedded webview'

def load(path):
    return json.loads(path.read_text(encoding='utf-8'))

def import_bundle(path):
    bundle = load(path)
    benchmark = bundle['benchmark']
    run_id = benchmark['runId']
    if not re.fullmatch(r'[\dTZ-]{20,40}', run_id):
        raise ValueError('Invalid browser run ID')
    if not isinstance(benchmark.get('userAgent'), str):
        raise ValueError('Downloaded evidence has no browser user agent')
    files = {'benchmark.json': benchmark, 'results.json': bundle['results'],
             'parameter-tables.json': bundle['parameterTables']}
    destination = BROWSER / run_id
    destination.mkdir(parents=True, exist_ok=True)
    for name, data in files.items():
        target = destination / name
        if target.exists() and load(target) != data:
            raise ValueError(f'Conflicting evidence already exists: {target}')
        target.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding='utf-8')
    print(f'Imported browser evidence: {destination.relative_to(ROOT)}')

def summarise():
    runs = []
    for directory in sorted(BROWSER.glob('*')):
        if not directory.is_dir(): continue
        benchmark_file = directory / 'benchmark.json'
        if not benchmark_file.is_file():
            runs.append({'runId': directory.name, 'status': 'incomplete', 'verified': False})
            continue
        benchmark = load(benchmark_file)
        agent = benchmark.get('userAgent', '')
        row = {'runId': directory.name, 'browser': browser_name(agent), 'userAgent': agent,
               'status': benchmark.get('status'), 'verified': False,
               'timingsMs': benchmark.get('timingsMs', {}),
               'cacheCondition': benchmark.get('cacheCondition', 'not recorded')}
        if not agent or benchmark.get('environment', '').startswith('Node'):
            row['diagnostic'] = 'No browser user agent; not browser evidence'
        elif row['status'] == 'complete':
            result = subprocess.run([sys.executable, str(ROOT / 'scripts' / 'compare.py'),
                                     str(directory.relative_to(ROOT))],
                                    cwd=ROOT, capture_output=True, text=True)
            row['verified'] = result.returncode == 0
            if not row['verified']:
                row['diagnostic'] = (result.stderr or result.stdout)[-2000:]
        else:
            row['diagnostic'] = benchmark.get('error', 'Workload did not complete')
        runs.append(row)
    verified = [r for r in runs if r['verified']]
    named = {r['browser'] for r in verified}
    required = {'Chrome', 'Edge', 'Firefox', 'Safari'}
    summary = {'phase0BrowserGate': 'pass' if required & named else ('browser-engine-only' if verified else 'unverified'),
               'verifiedRuns': len(verified), 'targetBrowsersWithNumericalPass': sorted(required & named),
               'targetBrowsersOutstanding': sorted(required - named),
               'measurementScope': 'Numerical browser workload; embedded Chromium does not count as standalone Chrome',
               'runs': runs}
    summary_dir = ROOT / 'evidence'
    (summary_dir / 'browser-summary.json').write_text(json.dumps(summary, indent=2), encoding='utf-8')
    lines = ['# Browser feasibility measurements', '',
             f'Phase 0 browser gate: **{summary["phase0BrowserGate"]}**.', '',
             'Only completed browser runs that pass the native-R comparison count below. '
             'Node.js measurements are excluded. A verified run in one target desktop '
             'browser completes the Phase 0 numerical spike. Embedded Chromium is '
             'reported separately and does not count as standalone Chrome. Full '
             'application compatibility in all four browsers remains a v1 release requirement.', '',
             '| Browser | Verified runs | Median reported total (s) |',
             '|---|---:|---:|']
    for name in sorted(named):
        group = [r for r in verified if r['browser'] == name]
        timings = [r['timingsMs']['total'] / 1000 for r in group if 'total' in r['timingsMs']]
        value = f'{statistics.median(timings):.3f}' if timings else 'not recorded'
        lines.append(f'| {name} | {len(group)} | {value} |')
    if not verified: lines.append('| No verified browser run recorded | 0 | unmeasured |')
    lines += ['', 'Cache conditions must be recorded before interpreting cold/warm differences. '
              'An ordinary reload is not evidence of a cold cache.', '',
              'Target browsers without a numerical measurement: ' + ', '.join(summary['targetBrowsersOutstanding']) + '.', '',
              'Numerical agreement does not establish compatibility of the future converter UI or exports.', '']
    (ROOT / 'docs' / 'browser-measurements.md').write_text('\n'.join(lines), encoding='utf-8')
    print(f'Phase 0 browser gate: {summary["phase0BrowserGate"]}; verified browser runs: {len(verified)}')

if __name__ == '__main__':
    parser = ArgumentParser(description=__doc__)
    parser.add_argument('--import', dest='bundle', type=Path, help='JSON downloaded by the browser lab')
    args = parser.parse_args()
    if args.bundle: import_bundle(args.bundle)
    summarise()
