# 卡价站

简体中文 PTCG 卡牌资料与中国区成交价格查询站。

- 收录 52Poké Wiki 公开数据库中的宝可梦卡、训练家卡和能量卡。
- 支持按卡名、编号、系列、画师、稀有度、属性和分类检索。
- 卡牌资料以静态索引方式发布，结果分页渲染，适合 GitHub Pages。
- 已有市场记录的卡牌会展示演示成交价格；其余卡牌明确标注暂无可信成交数据。

卡牌资料来源于 [52Poké Wiki / 神奇宝贝百科](https://wiki.52poke.com/)，依据 [CC BY-NC-SA 3.0](https://creativecommons.org/licenses/by-nc-sa/3.0/deed.zh-hans) 许可使用。卡面图像未批量转载。

运行 `scripts/import_52poke.py` 可从公开 MediaWiki API 重新生成 `data/cards.json`，运行 `scripts/validate_cards.py` 可执行数据完整性检查。
