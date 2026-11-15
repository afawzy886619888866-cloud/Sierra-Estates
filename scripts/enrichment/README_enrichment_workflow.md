# Sierra Estates — Enrichment Workflow (三件套)

**目的**：把 4,933 条 `active` 但未达发布标准的房源（§21 反伪造原则：
缺数据的行**留在后台**，绝不带空价格/占位价格上线）逐步补全成可发布房源。

**三个脚本组成一个循环**，全部默认 dry-run，只有加 `--apply` 才写数据库：

```
generate_worklist.py  →  人工填 new_* 列  →  apply_enrichment.py --apply
                                                 │（守卫 + 审计）
                                                 ▼
                        recheck_and_publish.py --apply（发布门 → 上地图）
                                                 │
                        （剩余未通过者回到下一轮 worklist）┘
```

## 文件

| 文件 | 作用 |
|---|---|
| `generate_worklist.py` | 拉取队列（active 且非 PUBLISHABLE），按缺陷分组，产出当日 worklist CSV |
| `apply_enrichment.py` | 校验人工填写的 `new_*` 列（守卫），`--apply` 时写入 + 写审计行 |
| `recheck_and_publish.py` | 12 字段发布门复检，`--apply` 时把通过行提升为 `PUBLISHABLE` |
| `worklist_YYYY-MM-DD.csv` | 当日工作清单（当前 4,933 行） |

## 凭据

脚本按顺序找 `SUPABASE_URL` / `SUPABASE_SECRET_KEY`：环境变量 → 同目录或
`../scripts/` 下的 `se.env`（格式：`KEY=value` 每行一条）。
**service key 轮换后记得同步更新 se.env**（见 Runbook）。

## 缺陷分组（优先级互斥，2026-10-12 实测）

| 组 | 行数 | 含义 |
|---|---|---|
| `no_price` | 3,834 | 价格为空/0 |
| `stub_5m` | 423 | 价格恰好 = 5,000,000（已知占位模式） |
| `rent_level_on_sale` | 242 | 出售房源挂着月租级价格（<100k） |
| `rent_anomaly` | 5 | 租金 ≤ 999 |
| `no_coords` | 17 | 有价无坐标 |
| `incomplete_fields` | 412 | 有价有坐标但缺描述/照片/卧室/卫生间/面积等 |
| **合计** | **4,933** | = active 9,435 − PUBLISHABLE 4,502 |

另有 70.3%（3,470 行）已带业主或经纪人电话，直接在 CSV 里核对/更正即可。

## 填写规则（§21 反伪造）

- **只填你确实知道的**：空着的单元格会原样保留，系统不会发明数据。
- 拿不准就留空 + 在 `notes` 写备注 —— 缺数据留在后台是**功能**，不是 bug。
- `new_image_urls` 逗号分隔多个 `https://…` 链接（`file://` 会被拒绝）。

## 守卫（拒绝是正常工作，不是报错）

| 非法填写 | 结果 |
|---|---|
| 出售价 < 100,000（如 45,000） | ❌ 拒绝（月租级价格挂出售） |
| 租金 ≤ 999 或 > 500,000/月 | ❌ 拒绝 |
| 在 `stub_5m` 行填回 5,000,000 | ❌ 拒绝（除非 notes 含 `5m-confirmed`） |
| `file://` 或裸路径图片 | ❌ 拒绝（仅 http/https） |
| 坐标超出埃及范围（lat 22–31.6 / lng 24–37） | ❌ 拒绝 |
| 描述 < 20 字符 | ❌ 拒绝 |
| 非法 deal_type | ❌ 拒绝（仅 sale/rent/resale/primary） |

守卫测试证据：`test_guard_matrix_result.txt`（1 放行 / 7 拒绝 / dry-run 零写入）。

## 日常操作

```bash
# 1. 生成当日清单（或复用现有未完成清单）
python3 generate_worklist.py

# 2. Excel/Sheets 打开 CSV，填 new_* 列（utf-8-sig，阿拉伯文正常显示）

# 3. 先 dry-run 看会写什么
python3 apply_enrichment.py worklist_2026-10-12.csv

# 4. 确认无误后写入
python3 apply_enrichment.py worklist_2026-10-12.csv --apply

# 5. 复检 + 发布（先 dry-run 再 --apply）
python3 recheck_and_publish.py
python3 recheck_and_publish.py --apply
```

写入均带 `audit_logs` 审计行（action=`enrichment.apply` / `enrichment.publish`，
actor=`sierra-enrichment-workflow`），Supabase Table Editor 里可查。

## 技术备忘

- **分页陷阱**：Supabase REST 默认最多返回 1,000 行，三个脚本都用 Range
  头翻页拉全量——别用裸 curl 统计全表。
- **字段名**：活库是 `images`/`agent_name`（不是 schema.sql 里的
  `img`/`agent`），以 PostgREST OpenAPI 为准。
- **回滚**：误发布可用
  `PATCH /rest/v1/listings?publish_status=eq.PUBLISHABLE → REVIEW_REQUIRED`
  单请求批量撤销。
