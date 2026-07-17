# 卡价站

简体中文 PTCG 卡牌资料与中国区成交价格查询站。

- 收录 52Poké Wiki 公开数据库中的宝可梦卡、训练家卡和能量卡。
- 支持按卡名、编号、分类、属性、系列、稀有度、发行语言、画师和成交数据状态检索。
- 卡牌资料以静态索引方式发布，结果分页渲染，适合 GitHub Pages。
- 已有市场记录的卡牌会展示演示成交价格；其余卡牌明确标注暂无可信成交数据。

卡牌资料来源于 [52Poké Wiki / 神奇宝贝百科](https://wiki.52poke.com/)，依据 [CC BY-NC-SA 3.0](https://creativecommons.org/licenses/by-nc-sa/3.0/deed.zh-hans) 许可使用。卡面图像未批量转载。

运行 `scripts/import_52poke.py` 可从公开 MediaWiki API 重新生成 `data/cards.json`，运行 `scripts/validate_cards.py` 可执行数据完整性检查。

## 成交数据接入预留

页面通过 `market-data.js` 统一读取并标准化成交数据，当前数据文件为 `data/market-prices.json`。后续有两种接入方式：

1. API：把 `index.html` 中 `market-data-endpoint` 的地址改为 API URL，返回 `{ label, updatedAt, records }`。
2. 自动抓取：由服务端或定时任务抓取并生成同结构的 `data/market-prices.json`，前端无需修改。

每条 `records` 至少需要 `name`、`setCode` 和 `price`，可选字段包括 `change`、`high`、`low`、`deals`、`history`、`currency`、`source` 与 `updatedAt`。请勿在浏览器端直接抓取第三方网站，避免跨域、限流和凭据暴露问题。
