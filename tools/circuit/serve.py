"""A local server that behaves like GitHub Pages for measurement: gzip on
text responses, cache-control max-age=600, correct types for .webp/.mjs.
Usage: /usr/local/bin/python3 tools/circuit/serve.py [port]   (default 8647)"""
import gzip, io, os, sys, mimetypes
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
mimetypes.add_type('image/webp', '.webp'); mimetypes.add_type('text/javascript', '.mjs'); mimetypes.add_type('text/javascript', '.js')
TEXT = ('text/', 'application/javascript', 'application/json', 'image/svg+xml')

class H(SimpleHTTPRequestHandler):
    def __init__(self, *a, **k): super().__init__(*a, directory=ROOT, **k)
    def log_message(self, *a): pass
    def end_headers(self):
        self.send_header('Cache-Control', 'max-age=600'); super().end_headers()
    def send_head(self):
        path = self.translate_path(self.path)
        if os.path.isdir(path): path = os.path.join(path, 'index.html')
        if not os.path.isfile(path): return super().send_head()
        ctype = self.guess_type(path)
        accept = self.headers.get('Accept-Encoding', '')
        if ctype.startswith(TEXT) and 'gzip' in accept:
            data = open(path, 'rb').read(); gz = gzip.compress(data, 6)
            self.send_response(200)
            self.send_header('Content-Type', ctype); self.send_header('Content-Encoding', 'gzip')
            self.send_header('Content-Length', str(len(gz))); self.send_header('Vary', 'Accept-Encoding')
            self.end_headers(); return io.BytesIO(gz)
        return super().send_head()

if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8647
    ThreadingHTTPServer(('0.0.0.0', port), H).serve_forever()
