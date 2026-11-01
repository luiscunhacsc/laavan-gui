import json,sys
from pathlib import Path
root=Path(__file__).resolve().parents[1]
native=json.loads((root/'evidence/phase-3/native-editing.json').read_text(encoding='utf-8'))
wasm=json.loads((root/'evidence/phase-3/wasm-editing.json').read_text(encoding='utf-8'))
def without_versions(value):
    if isinstance(value,dict):return {k:without_versions(v) for k,v in value.items() if k!='versions'}
    if isinstance(value,list):return [without_versions(v) for v in value]
    return value
assert without_versions(native)==without_versions(wasm),'Native and WASM editing results differ'
result=dict(roundTripModels=len(native['roundtrips']),nativeWasmExact=True,environment='Native R versus Node.js webR/WASM; not a browser UI check')
(root/'evidence/phase-3/comparison.json').write_text(json.dumps(result,indent=2),encoding='utf-8')
(root/'app/tests/fixtures/editing.json').write_text(json.dumps(native,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(result,indent=2))
