"""下载候选一手文档并保存正文；人工核验后用 --assemble 生成图表数据。"""

import argparse
import hashlib
import io
import json
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import requests
from bs4 import BeautifulSoup
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[1]  # 项目根目录
ARCHIVE = ROOT / 'public/data/sources/safety-assessments'
BRANDS = ['OpenAI', 'Anthropic', 'Meta', 'Grok', 'Gemini', 'DeepSeek', 'Kimi', 'Qwen', 'GLM']


def read_json(name):
    return json.loads((ARCHIVE / name).read_text(encoding='utf-8'))


def download(record):
    path = ARCHIVE / record['id']
    if path.with_suffix('.txt').exists():
        return {'id': record['id'], 'status': 'cached'}
    try:
        response = requests.get(record['url'], timeout=20, headers={'User-Agent': 'Mozilla/5.0'})
        response.raise_for_status()
        raw = response.content
        pdf = raw.startswith(b'%PDF')
        path.with_suffix('.pdf' if pdf else '.html').write_bytes(raw)
        if pdf:
            text = '\n'.join(page.extract_text() or '' for page in PdfReader(io.BytesIO(raw)).pages)
        else:
            soup = BeautifulSoup(raw, 'html.parser')
            for element in soup.select('script,style,nav,footer'):
                element.decompose()
            text = soup.get_text(' ', strip=True)
        path.with_suffix('.txt').write_text(text, encoding='utf-8')
        return {'id': record['id'], 'status': response.status_code, 'sha256': hashlib.sha256(raw).hexdigest(), 'textLength': len(text)}
    except (requests.RequestException, ValueError) as error:
        return {'id': record['id'], 'status': 'failed', 'error': str(error)}


def assemble():
    records = read_json('verified-records.json')
    catalog = json.loads((ROOT / 'public/data/sources/model-releases/catalog.json').read_text(encoding='utf-8'))
    releases = [
        {'brand': group['brand'], 'name': name, 'year': group['year'], 'url': group['url']}
        for group in catalog['groups'] for name in group['names']
    ]
    assert len({record['id'] for record in records}) == len(records)
    assert len({record['url'] for record in records}) == len(records)
    assert all(record['brand'] in BRANDS and '2023-01' <= record['date'][:7] <= '2026-10' and record['evidence'] for record in records)
    assert len({(release['brand'], release['name'].casefold()) for release in releases}) == len(releases)
    assert all(release['brand'] in BRANDS and 2023 <= release['year'] <= 2026 and release['url'].startswith('https://') for release in releases)
    result = {
        'title': '九品牌模型的公开安全评估',
        'start': '2023-01-01', 'end': '2026-10-20',
        'brands': BRANDS, 'years': [2023, 2024, 2025, 2026],
        'unit': '份已核实文档',
        'note': '柱长表示已核实安全评估报告份数，右侧为“报告份数 / 模型发布数”。报告按文档公开年份计数，修订与镜像不重复；模型按主要命名版本首次公开年份（含预览）计数，不拆参数规模、量化版或日期快照，同名正式版与别名不重计。两项均为已核实清单数量，0 表示未收录；一份报告可覆盖多个模型，不能据此计算披露率或判断安全水平。2026 年截至 10 月 20 日。',
        'records': sorted(records, key=lambda record: (BRANDS.index(record['brand']), record['date'])),
        'modelReleases': sorted(releases, key=lambda release: (BRANDS.index(release['brand']), release['year'], release['name'])),
        'modelReleaseScope': catalog['scope'],
    }
    (ROOT / 'public/data/safety-assessments.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    for brand in BRANDS:
        print(brand, {year: sum(r['brand'] == brand and r['date'].startswith(str(year)) for r in records) for year in result['years']})


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--assemble', action='store_true')
    args = parser.parse_args()
    if args.assemble:
        assemble()
    else:
        with ThreadPoolExecutor(max_workers=6) as pool:
            results = list(pool.map(download, read_json('candidates.json')))
        (ARCHIVE / 'download-log.json').write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding='utf-8')
        print('saved', sum(r['status'] != 'failed' for r in results), 'failed', sum(r['status'] == 'failed' for r in results))
