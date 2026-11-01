"""Read-only readiness check for the packaged app on the workspace server."""
from html.parser import HTMLParser
from urllib.parse import urljoin
from urllib.request import urlopen

base='http://127.0.0.1:8000/app/dist/'
class Assets(HTMLParser):
    def __init__(self):
        super().__init__(); self.urls=[]
    def handle_starttag(self,tag,attrs):
        values=dict(attrs)
        value=values.get('src') or values.get('href') or ''
        if value.startswith('./assets/'): self.urls.append(value)

with urlopen(base,timeout=5) as response:
    print(f'Static review build: HTTP {response.status}')
    parser=Assets();parser.feed(response.read().decode('utf-8'))
assert parser.urls,'Packaged assets were not found'
for relative in parser.urls:
    with urlopen(urljoin(base,relative),timeout=5) as response:
        print(f'{relative}: HTTP {response.status}')
with urlopen('http://127.0.0.1:8000/docs/phase-1-gallery.html',timeout=5) as response:
    print(f'Seven-model gallery: HTTP {response.status}')
