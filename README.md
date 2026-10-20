# 边界 · The Boundary

基于 React、TypeScript、Vite 与 Apache ECharts 的工程伦理专题网页。正文直接读取 `原始稿件/综述稿.md`，保留完整正文段落，网页不显示引用标记与参考文献列表。

## 本地启动

```powershell
pnpm.cmd install
pnpm.cmd dev
```

当前 Windows PowerShell 禁止执行 `.ps1` 脚本时，使用 `pnpm.cmd`。打开终端显示的地址即可。

## 阅读与图表

- 高对比度鲜艳配色，以留白和浅色细线组织层次，仅强调关键坐标与选中状态；以桌面长文阅读为主要场景
- 完整正文、章节导航与侧栏阅读进度；仅事件分析正文固定为 700px，与纵向时间线间隔 40px 并排，允许超出正文容器
- 9 组 ECharts 图表：事件、企业矩阵、披露、公众态度、风险与跨国信任、政策、制度比较、漏洞、多层防护
- 群体切换、图例提示、国家筛选与排序、时间轴缩放、逐项证据详情
- 图表仅提供可视化视图，保留统计口径；原始数据和采集脚本保存在项目目录中

正文容器固定为 900px。事件时间线采用单列节点，以红、蓝颜色区分越权事件与能力、治理进展；事件分析中的 10 处日期使用同色高亮，节点依据文字的实际位置逐项对齐。跨国信任、风险认知等不同调查放在同一图框的独立选项卡中，避免混用口径。

## 数据与来源

数据核验日期：2026-10-20。网页展示的不是随机模拟数据。

| 文件 | 内容 |
| --- | --- |
| `public/data/opinion.json` | Quinnipiac、Pew、Ipsos 公众调查及分组数据 |
| `public/data/cyber.json` | GTIG 漏洞数据及旧版统计归档 |
| `public/data/safety-assessments.json` | 九品牌、2023—2026 年的已核实公开安全评估文档与主要模型发布清单 |
| `public/data/governance.json` | 官方事件、政策状态、企业措施逐项证据 |
| `public/data/sources/` | 抓取的 HTML、PDF、来源清单与日志 |

每组数据保留来源 URL、日期、统计口径及限制。重要区别：

- 安全评估图的柱长按开发者公开文档计数，柱色按品牌固定，右侧显示“报告份数 / 模型发布数”；年份筛选同步作用于两项统计，“全部年份”显示合计。文档需包含内容安全、对齐或危险能力评估结果，共收录 104 份。同文档覆盖多个型号仍计一次。
- 模型数依据独立发布清单，按主要命名版本的首次公开年份（含预览）计数，不拆参数规模、量化、Base/Instruct、上下文长度或日期快照；同名预览转正式版与别名不重复计数。模型发布年份与安全报告公开年份分别记录，2026 年均截至 10 月 20 日。完整范围及逐项来源见 `public/data/sources/model-releases/catalog.json`。
- 检索未必穷尽，两项数量都是已核实清单的下限；0 表示未收录，不表示没有发布模型或进行内部评估。一份报告可能覆盖多个模型，因此两个数字不能直接解释成披露率。独立机构评估不混入开发者文档计数；Gemini 不包含 Gemma、Veo、Lyria、Imagen。
- Ipsos 原始 30 国报告**不包含中国**；未采用图表建议中的中国 67%。30 国平均不是按世界人口加权的比例。
- 事件时间线按正文顺序排列，保留原稿的日期精度与事件含义，节点间距不代表时间长短；政策区分已生效、已发布、提案。
- 企业措施矩阵是公开证据的人工归纳；制度比较与四层防护是概念图，不是实测安全评分。
- 漏洞披露增长不能直接归因于 AI，零日是全部在野利用的子集。

## 复现数据采集

网络安全统计脚本只使用 Python 标准库；公众调查与安全评估脚本需要 `requests beautifulsoup4 pypdf`。

```powershell
python scripts/collect_cyber.py
python scripts/collect_opinion.py
python scripts/collect_opinion.py --offline
python scripts/collect_safety_assessments.py
python scripts/collect_safety_assessments.py --assemble
```

治理来源的下载清单、脚本和访问状态见 `public/data/sources/governance/`。部分机构拒绝直接抓取（403），已通过官方页面核验的事实仍保留原始链接，下载日志如实记录失败。

## 检查

```powershell
pnpm.cmd exec tsc --noEmit -p tsconfig.app.json
pnpm.cmd exec playwright test
```

浏览器检查使用本机 Microsoft Edge 无头模式，需要先启动开发服务器。默认测试地址为 `http://127.0.0.1:5174`，可用 `TEST_BASE_URL` 环境变量覆盖。未执行生产构建。

安全评估资料位于 `public/data/sources/safety-assessments/`：`candidates.json` 是候选清单，`review-decisions.json` 记录纳入/排除原因，`verified-records.json` 保存核验结果，下载日志如实保留失败记录。部分 OpenAI 来源经联网工具读取官方页面核验，未成功保存本地副本，标记为 `web-primary-verified`。systemcards.org 仅用于发现候选链接，最终记录均指向一手发布页或作者报告。重新下载不会自动纳入新文档，人工核验后才运行 `--assemble`。

模型发布资料位于 `public/data/sources/model-releases/`：`catalog.json` 按品牌、首发年份与一手来源维护主要命名版本，`download-log.json` 记录来源快照的下载结果，文本快照用于复核。`--assemble` 同时生成报告记录与模型发布记录，并检查模型名称是否重复；更新发布清单后运行该命令即可刷新图表数据。
