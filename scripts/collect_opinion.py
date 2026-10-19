"""下载公众态度原始资料，提取网页表格与 PDF 数据。依赖 requests、beautifulsoup4、pypdf。"""

import argparse
import hashlib
import json
import re
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import requests
from bs4 import BeautifulSoup
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[1]  # 项目根目录
SOURCE_DIR = ROOT / "public/data/sources/opinion"  # 原始资料目录
SOURCES = {
    "quinnipiac-2026-09-30.html": "https://poll.qu.edu/poll-release?releaseid=3969",
    "quinnipiac-2026-09-30.pdf": "https://poll.qu.edu/images/polling/us/us09302026_uruk99.pdf",
    "ipsos-ai-monitor-2025.pdf": "https://www.ipsos.com/sites/default/files/ct/publication/documents/2025-06/Ipsos-AI-Monitor-2025.pdf",
    "pew-americans-ai-2026.html": "https://www.pewresearch.org/internet/2026/06/17/americans-and-ai-2026-chatbots-smart-devices-and-views-on-impact/",
    "pew-americans-ai-2026-topline.pdf": "https://www.pewresearch.org/wp-content/uploads/sites/20/2026/06/PI_2026.06.17_Americans-and-AI_TOPLINE.pdf",
}


def download(item):
    name, url = item
    response = requests.get(url, timeout=60)
    response.raise_for_status()
    (SOURCE_DIR / name).write_bytes(response.content)


def read_html(name):
    return BeautifulSoup((SOURCE_DIR / name).read_text(encoding="utf-8"), "html.parser")


def poll_rows(soup, marker, labels):
    table = next(block.get_text() for block in soup.find_all("pre") if marker in block.get_text())
    rows = []
    for original, label in labels:
        line = re.search(r"^" + re.escape(original) + r"\s+(.+)$", table, re.MULTILINE).group(1)
        values = [int(number) for number in re.findall(r"\d+", line)]
        rows.append({"label": label, "value": values[0], "groups": dict(zip(
            ["总体", "男性", "女性", "18—34岁", "35—49岁", "50—64岁", "65岁及以上"], values
        ))})
    return rows


def collect():
    quinnipiac = read_html("quinnipiac-2026-09-30.html")
    common = {
        "sourceName": "Quinnipiac University Poll",
        "sourceUrl": SOURCES["quinnipiac-2026-09-30.html"],
        "localSource": "/data/sources/opinion/quinnipiac-2026-09-30.pdf",
        "date": "2026-09-30",
        "sample": "美国成年人 1,202 人；调查于 2026 年 9 月 24—27 日进行；总体误差 ±3.5 个百分点",
        "unit": "%",
    }
    pace = {
        **common, "id": "ai-development-pace", "title": "公众希望 AI 以怎样的速度发展？",
        "note": "问题 25。暂停与减速均以完成安全评估为条件；总体比例合计 100%，分组可能因四舍五入存在差异。",
        "rows": poll_rows(quinnipiac, "Stop ", [
            ("Stop", "暂停研发"), ("Slow down", "放慢研发"), ("Current pace", "保持速度"),
            ("Move faster", "加快研发"), ("DK/NA", "不知道／未回答"),
        ]),
    }
    risk = {
        **common, "id": "ai-risk-source", "title": "人们更担心哪一种 AI 风险？",
        "note": "问题 30。完整选项原始比例合计 99%，由整数四舍五入造成；不要自动补成 100%。",
        "rows": poll_rows(quinnipiac, "NO HARM(VOL)", [
            ("Humans", "人类利用 AI 造成伤害"), ("Autonomous AI", "自主 AI 智能体造成伤害"),
            ("NO HARM(VOL)", "不会造成伤害（自发回答）"), ("DK/NA", "不知道／未回答"),
        ]),
    }
    pew = read_html("pew-americans-ai-2026.html")
    privacy_table = next(t for t in pew.find_all("table") if "Less secure" in t.get_text())
    privacy = int(privacy_table.select("tbody td")[1].get_text().strip("%"))
    trust_table = next(t for t in pew.find_all("table") if "regulate use of AI" in t.get_text())
    trust = [
        [cell.get_text(strip=True) for cell in row.find_all("td")]
        for row in trust_table.select("tbody tr")
    ]
    current = [row for row in trust if row[1] == "2026"]
    concerns = {
        "id": "pew-ai-concerns", "title": "隐私与治理信心：美国公众的三项担忧",
        "sourceName": "Pew Research Center", "sourceUrl": SOURCES["pew-americans-ai-2026.html"],
        "localSource": "/data/sources/opinion/pew-americans-ai-2026-topline.pdf",
        "date": "2026-06-17", "sample": "美国成年人 5,119 人；American Trends Panel；调查于 2026 年 2 月 17—23 日进行",
        "unit": "%", "note": "三项属于不同问题，并非互斥选项，不能相加。信心不足包括信心不太足和完全没有信心。",
        "rows": [
            {"label": "认为个人信息更不安全", "value": privacy},
            {"label": "对政府有效监管缺乏信心", "value": int(current[0][2].strip("%")), "republican": int(current[0][3].strip("%")), "democrat": int(current[0][4].strip("%"))},
            {"label": "对企业负责任使用缺乏信心", "value": int(current[1][2].strip("%")), "republican": int(current[1][3].strip("%")), "democrat": int(current[1][4].strip("%"))},
        ],
    }
    country_names = {
        "30-country average": "30 国平均", "Singapore": "新加坡", "Indonesia": "印度尼西亚",
        "Malaysia": "马来西亚", "Thailand": "泰国", "Chile": "智利", "Mexico": "墨西哥",
        "Colombia": "哥伦比亚", "India": "印度", "Poland": "波兰", "Argentina": "阿根廷",
        "Peru": "秘鲁", "Spain": "西班牙", "Switzerland": "瑞士", "South Africa": "南非",
        "Italy": "意大利", "Belgium": "比利时", "Ireland": "爱尔兰", "Germany": "德国",
        "Netherlands": "荷兰", "Türkiye": "土耳其", "Brazil": "巴西", "South Korea": "韩国",
        "Australia": "澳大利亚", "Sweden": "瑞典", "France": "法国", "Canada": "加拿大",
        "Great Britain": "英国", "Hungary": "匈牙利", "Japan": "日本", "United States": "美国",
    }
    page = PdfReader(SOURCE_DIR / "ipsos-ai-monitor-2025.pdf").pages[22].extract_text(extraction_mode="layout")
    country_rows = []
    for english, chinese in country_names.items():
        match = re.search(re.escape(english) + r"\s+(\d+)%\s+(\d+)%\s+(\d+)%", page)
        agree, other, disagree = map(int, match.groups())
        country_rows.append({"label": chinese, "country": english, "value": agree, "disagree": disagree, "other": other})
    ipsos = {
        "id": "ipsos-government-trust", "title": "公众信任本国政府负责任监管 AI 的程度",
        "sourceName": "Ipsos AI Monitor 2025", "sourceUrl": SOURCES["ipsos-ai-monitor-2025.pdf"],
        "localSource": "/data/sources/opinion/ipsos-ai-monitor-2025.pdf", "sourcePage": 23,
        "date": "2025-06", "sample": "30 个国家，23,216 名受访者；2025 年 3 月 21 日—4 月 4 日；各国年龄范围见报告第 56 页",
        "unit": "%", "note": "30 国平均为各国结果的未按人口加权平均，并非全球人口比例。部分国家样本更偏城市、高学历或高收入群体；印度包含面访。原报告未覆盖中国，未纳入稿件中的中国 67%。",
        "rows": country_rows,
    }
    assert sum(row["value"] for row in pace["rows"]) == 100
    assert len(country_rows) == 31
    assert [row["value"] for row in concerns["rows"]] == [71, 67, 59]
    return {
        "retrievedAt": "2026-10-20", "datasets": [pace, risk, concerns, ipsos],
        "verificationNotes": [
            "Quinnipiac 网页问卷第 25、30 题与下载的官方 PDF 交叉核验；不是根据稿件手工补值。",
            "Pew 数据自动读取官方网页表格，原始 topline PDF 已一并保存。",
            "Ipsos 数据从 PDF 第 23 页自动提取，并与该页渲染图片核对。报告的 30 国调查不含中国，因此未采用稿件中的中国 67%。",
            "不同调查的时间、问题措辞与样本不同；不得将 Quinnipiac、Pew、Ipsos 的数字当成同一调查或时间序列。",
        ],
        "sources": [{"url": url, "file": f"/data/sources/opinion/{name}", "sha256": hashlib.sha256((SOURCE_DIR / name).read_bytes()).hexdigest()} for name, url in SOURCES.items()],
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--offline", action="store_true", help="使用已下载的原始文件重新提取")
    args = parser.parse_args()
    SOURCE_DIR.mkdir(parents=True, exist_ok=True)
    if not args.offline:
        with ThreadPoolExecutor(max_workers=5) as pool:
            list(pool.map(download, SOURCES.items()))
    result = collect()
    (ROOT / "public/data/opinion.json").write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("Collected 4 datasets from 5 archived primary sources.")
