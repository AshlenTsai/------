"""下载一手研究网页并提取供 ECharts 使用的网络安全统计数据。"""

import json
import re
from html import unescape
from pathlib import Path
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]  # 项目根目录
ARCHIVE = ROOT / "public/data/sources/cyber"  # 原始来源存档
SOURCES = {
    "aisi": "https://www.aisi.gov.uk/blog/how-fast-is-autonomous-ai-cyber-capability-advancing",
    "disclosure": "https://newsletter.semianalysis.com/p/beijing-will-not-pace-the-frontier",
    "gtig": "https://cloud.google.com/blog/topics/threat-intelligence/vulnerability-discovery-and-exploitation-trends-in-the-ai-era",
}


def download(name, url):
    request = Request(url, headers={"User-Agent": "Mozilla/5.0 (research data collection)"})
    with urlopen(request, timeout=60) as response:
        html = response.read().decode("utf-8")
    (ARCHIVE / f"{name}.html").write_text(html, encoding="utf-8")
    text = unescape(re.sub(r"<[^>]+>", " ", html))
    return re.sub(r"\s+", " ", text)


def number(pattern, text):
    match = re.search(pattern, text, re.IGNORECASE)
    if not match:
        raise ValueError(f"来源内容变化，未找到数字：{pattern}")
    return float(match.group(1).replace(",", ""))


def main():
    ARCHIVE.mkdir(parents=True, exist_ok=True)
    pages = {name: download(name, url) for name, url in SOURCES.items()}
    aisi = pages["aisi"]
    disclosure = pages["disclosure"]
    gtig = pages["gtig"]
    older = number(r"November 2025 estimate of ([\d.]+) months", aisi)
    newer = number(r"doubled every ([\d.]+) months since late 2024", aisi)
    total = int(number(r"includes ([\d,]+) counted releases", disclosure))
    published = int(number(r"only ([\d,]+).{0,15}or 3.6%", disclosure))
    # 文中用英文 nine 表达发布时已披露数量，先校验再转换
    assert re.search(r"Just 9 of those|Just nine of those", disclosure, re.IGNORECASE)
    at_launch = 9
    assert total == 857 and published == 31
    jan = number(r"from ([\d,]+) in January 2026", gtig)
    july = number(r"to ([\d,]+) in July", gtig)
    august = number(r"to ([\d,]+) in August 2026", gtig)
    exploitation = re.search(r"average of ([\d.]+) per month in 2025 to an average of ([\d.]+) per month", gtig)
    zero_day = re.search(r"zero-day vulnerability exploitation grew from an average of ([\d.]+) per month in 2025 to an average of ([\d.]+) per month", gtig, re.IGNORECASE)
    assert exploitation and zero_day
    datasets = [
        {
            "id": "aisi-doubling", "title": "自主网络任务能力的翻倍周期正在缩短",
            "sourceName": "英国 AI Security Institute", "sourceUrl": SOURCES["aisi"],
            "date": "2025-11 / 2026-02（两次估计时点）",
            "sample": "AISI 窄域网络任务评测；80% 成功率；每任务 250 万 token 上限",
            "unit": "个月", "note": "展示两次研究的翻倍周期估计，而非逐月模型能力实测值。任务时长以人类专家完成时间衡量；不能外推为真实受防护网络的攻击成功率，也不是未来预测。",
            "rows": [{"label": "2025年11月估计", "value": older}, {"label": "2026年2月估计", "value": newer}],
            "localSource": "/data/sources/cyber/aisi.html",
        },
        {
            "id": "model-disclosure", "title": "857 次模型发布中的公开安全评估",
            "sourceName": "SemiAnalysis 原始调查", "sourceUrl": SOURCES["disclosure"],
            "date": "2026-10-08", "sample": "中国 9 家开发企业，2021年至2026年9月15日，857次发布（741个产品模型、116个研究模型）",
            "unit": "%", "note": "发布时或之前公开是已公开结果的子集，两项不能相加。未找到公开结果不等于未在内部测试；该调查没有同口径美国企业对照，不能解释为企业安全水平排名。",
            "rows": [
                {"label": "有公开安全结果", "value": round(published / total * 100, 2), "count": published, "total": total},
                {"label": "发布时或之前公开", "value": round(at_launch / total * 100, 2), "count": at_launch, "total": total},
            ],
            "breakdown": [
                {"label": "发布时或之前公开", "value": 9}, {"label": "发布后公开", "value": 16},
                {"label": "时点或模型匹配不明", "value": 6}, {"label": "仅声明进行过评估", "value": 10},
                {"label": "仅媒体或投资人资料", "value": 3}, {"label": "未找到安全披露", "value": 813},
            ],
            "localSource": "/data/sources/cyber/disclosure.html",
        },
        {
            "id": "gtig-disclosures", "title": "2026 年漏洞披露数量增长",
            "sourceName": "Google Threat Intelligence Group", "sourceUrl": SOURCES["gtig"],
            "date": "2026-09-30", "sample": "GTIG 2025年1月至2026年8月监测范围中的公开漏洞；此处仅列正文明确给出的3个月份",
            "unit": "项 / 月", "note": "仅使用原文给出的月份，未对缺失月份插值。披露数量受 CVE 分配、厂商发布周期和检测方式影响，不能仅据此将增长归因于 AI。",
            "rows": [{"label": "2026年1月", "value": jan}, {"label": "2026年7月", "value": july}, {"label": "2026年8月", "value": august}],
            "localSource": "/data/sources/cyber/gtig.html",
        },
        {
            "id": "gtig-exploitation", "title": "漏洞在野利用的月均变化",
            "sourceName": "Google Threat Intelligence Group", "sourceUrl": SOURCES["gtig"],
            "date": "2026-09-30", "sample": "2025年全年与2026年1—8月，GTIG观测到的实际利用；采用报告公布的月均值",
            "unit": "项 / 月", "note": "零日漏洞是全部被利用漏洞的子集，两个系列不可相加。报告月均数经过舍入；比较区间长度不同，且观测受检测覆盖影响。",
            "rows": [
                {"label": "2025年", "value": float(exploitation.group(1)), "series": "全部在野利用"},
                {"label": "2026年1—8月", "value": float(exploitation.group(2)), "series": "全部在野利用"},
                {"label": "2025年", "value": float(zero_day.group(1)), "series": "其中：零日漏洞"},
                {"label": "2026年1—8月", "value": float(zero_day.group(2)), "series": "其中：零日漏洞"},
            ],
            "localSource": "/data/sources/cyber/gtig.html",
        },
    ]
    result = {
        "retrievedAt": "2026-10-20", "datasets": datasets,
        "verificationNotes": [
            "所有数值已核对一手网页；抓取脚本保存 HTML 原文并通过正文匹配提取核心统计。",
            "本次未找到 AISI 可直接下载的逐模型数值表，因此使用正文明确给出的两次翻倍周期估计，未从图像猜测数据点。",
            "模型披露采用 SemiAnalysis 一手调查，替代 Reuters 二手引文；31例中包括6例时点或模型匹配不明的结果，沿用原调查分类。",
            "GTIG 原报告区分披露量与实际利用量；零日是实际利用的子集。没有将不同计量单位放入同一尺度。",
        ],
    }
    (ROOT / "public/data/cyber.json").write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("已下载 3 份原始网页并生成 4 组核验数据")


if __name__ == "__main__":
    main()
