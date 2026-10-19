# 边界 · The Boundary

基于 React、TypeScript、Vite 与 Apache ECharts 的工程伦理专题网页。正文直接读取 `原始稿件/综述稿.md`，保留完整段落及 29 项参考文献。

## 本地启动

```powershell
pnpm.cmd install
pnpm.cmd dev
```

当前 Windows PowerShell 禁止执行 `.ps1` 脚本时，使用 `pnpm.cmd`。打开终端显示的地址即可。

## 阅读与图表

- 白底、黄色强调与无衬线标题的 Hugging Face 风格；以桌面长文阅读为主要场景
- 完整正文、阅读进度、紧凑参考文献与引用跳转
- 10 组 ECharts 图表：能力、事件、企业矩阵、披露、公众态度、风险与跨国信任、政策、制度比较、漏洞、多层防护
- 群体切换、图例提示、国家筛选与排序、时间轴缩放、逐项证据详情
- 图表仅提供可视化视图，保留来源链接与统计口径；原始数据和采集脚本保存在项目目录中

图表顺序按正文的插入位置排列，因此能力图在事件图之前。跨国信任、风险认知等不同调查放在同一图框的独立选项卡中，避免混用口径。

## 数据与来源

数据核验日期：2026-10-20。网页展示的不是随机模拟数据。

| 文件 | 内容 |
| --- | --- |
| `public/data/opinion.json` | Quinnipiac、Pew、Ipsos 公众调查及分组数据 |
| `public/data/cyber.json` | AISI 能力翻倍估计、SemiAnalysis 披露调查、GTIG 漏洞数据 |
| `public/data/governance.json` | 官方事件、政策状态、企业措施逐项证据 |
| `public/data/sources/` | 抓取的 HTML、PDF、来源清单与日志 |

每组数据保留来源 URL、日期、统计口径及限制。重要区别：

- AISI 图为两次能力翻倍周期的**估计比较**，没有猜测逐月数据点。
- 31 次公开安全结果包含 9 次发布时或之前公开；未披露不等于未内部测试。
- Ipsos 原始 30 国报告**不包含中国**；未采用图表建议中的中国 67%。30 国平均不是按世界人口加权的比例。
- 事件时间线使用披露／行动日期，政策区分已生效、已发布、提案。
- 企业措施矩阵是公开证据的人工归纳；制度比较与四层防护是概念图，不是实测安全评分。
- 漏洞披露增长不能直接归因于 AI，零日是全部在野利用的子集。

## 复现数据采集

网络安全统计脚本只使用 Python 标准库；公众调查脚本需要 `requests beautifulsoup4 pypdf`。

```powershell
python scripts/collect_cyber.py
python scripts/collect_opinion.py
python scripts/collect_opinion.py --offline
```

治理来源的下载清单、脚本和访问状态见 `public/data/sources/governance/`。部分机构拒绝直接抓取（403），已通过官方页面核验的事实仍保留原始链接，下载日志如实记录失败。

## 检查

```powershell
pnpm.cmd exec tsc --noEmit -p tsconfig.app.json
pnpm.cmd exec playwright test
```

浏览器检查使用本机 Microsoft Edge 无头模式，需要先启动开发服务器。默认测试地址为 `http://127.0.0.1:5174`，可用 `TEST_BASE_URL` 环境变量覆盖。未执行生产构建。
