import json
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from urllib.request import Request, urlopen

BASE = Path(__file__).resolve().parent  # 原始资料保存目录
sources = json.loads((BASE / "manifest.json").read_text(encoding="utf-8"))

def download(source):
    suffix = ".pdf" if source["url"].endswith(".pdf") else ".html"
    request = Request(source["url"], headers={"User-Agent": "Mozilla/5.0"})
    try:
        with urlopen(request, timeout=30) as response:
            content = response.read()
        filename = source["id"] + suffix
        (BASE / filename).write_bytes(content)
        return {**source, "file": filename, "bytes": len(content), "downloaded": True}
    except Exception as error:
        return {**source, "downloaded": False, "error": str(error)}

if __name__ == "__main__":
    with ThreadPoolExecutor(max_workers=6) as executor:
        results = list(executor.map(download, sources))
    (BASE / "download-log.json").write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(results, ensure_ascii=False, indent=2))
