"""Retain actual native adapter output for meaningful TypeScript/UI checks."""
import json
from pathlib import Path
root=Path(__file__).resolve().parents[1]
value=json.loads((root/'evidence/phase-2/native-analysis.json').read_text(encoding='utf-8'))
(root/'app/tests/fixtures/analysis.json').write_text(json.dumps(value,ensure_ascii=False,indent=2),encoding='utf-8')
print('Retained native analysis/import fixtures for frontend tests.')
