# Sierra Estates · /properties 地图 UI 重设计 — 实施交付报告

> 任务来源：Stitch 项目 `2455613122012383700` "New Cairo Real Estate Map"
> 4 屏设计（Light EN / Dark EN / Dark AR / Bilingual）→ 工单
> `download/sierra_estates_map_redesign_order_v2.md`
> 本轮用户指令 "please you do" → 由本代理直接在仓库内完成实施（不再经 Antigravity）。
> 实施日期：2026-11-02 · 分支 `feat/map-ui-stitch` · 提交 `6a57729d`
> 基线：`origin/main @ b38692a8`

---

## 1. 核心原则兑现

| 工单要求 | 状态 |
|---|---|
| **只改表现层** —— `/api/inventory`、发布门槛、RLS、富化脚本、冒烟脚本、`compounds-data.ts` 坐标 **零改动** | ✅ 提交内无任何数据层文件 |
| §21 反捏造 —— 渲染中无任何演示数字/单位代码 | ✅ grep 审计零命中（工单清单第 5 项） |
| 绝不热链 Stitch/Aida CDN | ✅ 网络面板零请求（实测） |
| 保留 react-leaflet 引擎，不换静态图 | ✅ 引擎原样，仅重绘外观 |
| URL `/properties` 不变，`/explore` `/net` `/compounds` 不动 | ✅ |
| 搜索/筛选行为不变（`map-filters-sync` 契约） | ✅ 同一 state 驱动（该测试在上游 main 本就因 Transit zone 失败，见 §5） |

## 2. 实施内容（7 文件，+2709/−51）

**新增**
- `components/Maps/InventoryRegistryModal.tsx` — 浮动玻璃"实时库存登记册"模态：
  `UNIT CODE | TYPE | BUA m² | PRICE | STATUS`；PLOT 列整列省略（无真实字段），
  STATUS 列仅当存在真实值时渲染；行点击 → 真实详情页；`360° INSPECTION` 幽灵钮 →
  有真实媒体的首个房源详情页（绝不打开假看房器）；`WHATSAPP VIP BROKER` →
  wa.me/201092048333 预填文本；ESC 关闭 + 焦点圈闭 + 背景点击关闭；AR 模式 RTL。
- `app/site-styles/masterplan.css`（1107 行）— 双主题 token 体系（Alexandria Light /
  Nocturnal Dark，经 `[data-map-theme]` 作用域限定，不影响其他页面）：玻璃药丸、
  金色焦点光环、基准 HUD、模态表单、罗盘/坐标/比例尺、响应式（移动端 bottom-sheet
  模态 + 横滚筛选簇）、prefers-reduced-motion 全量降级。
- `__tests__/masterplan-variants.test.ts`（15 项）— 变体矩阵、持久化、邻近放大层级、
  双语药丸模式、§21 演示值零命中、零热链、HUD 实时计算、字体导入契约。

**改造**
- `components/Maps/LiveMap.tsx` — 新增 `chrome: 'classic' | 'masterplan'`（默认
  classic：admin InventoryCommandView 与 /net 雷达外观完全不变）与
  `lang: 'en' | 'ar' | 'bi'`、`basemap`、`registryUnits`、`onRegistryStateChange` props。
  masterplan 模式：玻璃化合物药丸（真实计数徽章 n>0、sapphire/teal 层级配色）、
  **邻近放大**（z<12→11px / 12–14→13px / ≥14→16px 金环焦点 = 业主指定的
  "靠近时名字变大"交互）、单元价格图钉、金罗盘 + 实时坐标 + **真实比例尺**
  （在地图上实测像素距离，非装饰数字）+ EPSG 标 + 缩放栈 + 本地 logo。
  **底图切换 CARTO → Esri canvas**（免密钥）：light=World_Light_Gray_Base+Reference，
  dark=World_Dark_Gray_Base；卫星沿用现有 Esri World Imagery。
- `app/(site)/properties/PropertiesPage.tsx` — 默认视图改为 **map-first**；两个独立
  切换器（主题 Light/Dark/卫星 + 语言 EN/ع/AR|EN），按站点 hzp-* 模式持久化；
  顶部居中玻璃头标（真实 H1 保留在 hero，SEO 连续性）；左上玻璃筛选覆盖簇
  （搜索 + All/Buy/Rent + 化合物选择 + 可展开完整筛选 + 重置——同一 state）；
  右侧基准 HUD（Verified Units + EGP/m² 价格指数，实时计算，不可算则整行省略；
  模态打开时让位隐藏）；地图上新增 Split/Grid/Map 视图切换（in-flow 工具栏在
  map 视图隐藏）；半径筛选迁入工具栏；registryUnits = 全量（未截断）过滤结果。
- `app/tokens/typography.css` — 现有 Google Fonts 导入追加 Noto Serif + Public Sans
  （Cairo 原已内置），`display=swap` 保持；新增 `--font-headline` / `--font-label`。
- `app/(site)/properties/page.tsx` — 导入 masterplan.css。

## 3. 验证结果（全部实测）

| 验证项 | 结果 |
|---|---|
| `tsc --noEmit` | ✅ 0 错误 |
| vitest（5 套件） | ✅ 34/34（含新增 15 项） |
| `next build --webpack` 编译 | ✅ 61s 成功（"Compiled successfully"）；page-data 收集阶段在 4GB 沙箱 OOM —— **对照实验：干净 main 同样 OOM**，属环境限制，Vercel 构建不受影响 |
| dev server + 真实数据浏览器冒烟 | ✅ `/api/inventory` source=supabase count=3035；页面 35 个化合物药丸；药丸实时计数（eastown 152 / mivida 257 / palm hills 3） |
| 登记册模态 | ✅ DOM 断言：`EASTOWN — LIVE INVENTORY REGISTRY`、`118 UNITS — LIVE`、**118 行真实数据**、首行 `INV-20C6F11D4C6A · Apartment · EGP 463,000 · AVAILABLE`（未知面积留空=§21）、双 CTA 均渲染 |
| 邻近放大 | ✅ DOM 断言：`focused: true, "eastown", unitPins: 118`（z15 金环焦点 + 118 价格图钉） |
| 4 变体角 | ✅ 截图像素验证：Light EN=LIGHT / Dark EN=DARK / Dark AR=DARK / Bilingual=LIGHT；AR 截图 VLM 确认 RTL + 阿拉伯文；双语药丸 `جاردينيا | GARDENIA` 模式确认 |
| 持久化 | ✅ 切换后 localStorage `{"theme":"light","lang":"bi"}` |
| 网络审计 | ✅ stitch.withgoogle / lh3.googleusercontent / aida 零请求 |
| 页面错误 | ✅ 零（修复了初版 useMap-in-MapContainer 崩溃） |
| §21 grep | ✅ 演示值与热链零命中 |

**证据截图**（`download/stitch_redesign_evidence/`）：
`map_masterplan_light_en.png` · `map_masterplan_dark_en.png` ·
`map_masterplan_dark_ar.png` · `map_masterplan_bilingual.png` ·
`map_masterplan_registry_modal.png` · `map_masterplan_proximity_zoom.png`

## 4. 部署路径（二选一）

**A. 应用补丁（无需令牌）**
```bash
cd SE-Vercel-deploy-main && git checkout -b feat/map-ui-stitch origin/main
git am 0001-map-masterplan-stitch-redesign.patch
git push origin feat/map-ui-stitch   # Vercel 生成 preview → 验证后合并
```
（或 `git bundle` 路径：`git fetch /path/to/map-ui-stitch.bundle feat/map-ui-stitch:feat/map-ui-stitch`）

**B. PR 文案（直接粘贴）**
标题：`feat(map): properties masterplan redesign — 4 variants (light/dark × en/ar/bilingual)`
正文要点：见本报告 §2 + §3；附 6 张证据截图；确认工单验证清单 1–6 项（构建在
Vercel 环境执行）。回滚 = `git revert` + push（Vercel 自动回滚）。

## 5. 顺带发现（非本次引入，建议跟进）

1. **CARTO 底图匿名限额水印（生产存量缺陷）**：2026-11-02 在
   sierra-estates.net 现网截图与本地均复现 "API KEY REQUIRED" 错误瓦片。
   本 PR 已为 /properties 换用免密钥 Esri canvas；**admin InventoryCommandView
   与 /net 雷达仍用 CARTO**（classic 外观未动）——若也要切换，每处一行改动即可。
2. **`__tests__/map-filters-sync` Transit zone 测试在上游 main 即失败**
   （`CompoundsMap` 的 `NEW_CAIRO_ZONES` 无 `Transit` 键；stash 验证与本次改动无关）。
3. **本地 se.env 的 publishable(anon) 键对 `listings.raw_data` 列无 SELECT 授权**
   （42501），而生产 /api/inventory 正常 —— 生产 Vercel 所配 anon 键与 se.env 不同。
   建议核对 Vercel 的 `NEXT_PUBLIC_SUPABASE_ANON_KEY` 来源，并在方便时统一。
4. 沙箱 4GB 内存无法完成 `next build` 页面数据收集（基线同样失败）——完整构建
   请依赖 Vercel / CI。

## 6. 待办（沿袭）

- 🔴 **密钥轮换**（全项目唯一未完成项）：Supabase 控制台轮换 legacy service_role
  JWT 与 `sb_secret_5rAj…`，同步两个 Vercel 项目 env 并重部署（见 RUNBOOK §4）。
