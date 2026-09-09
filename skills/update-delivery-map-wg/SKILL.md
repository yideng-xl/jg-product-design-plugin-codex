---
name: update-delivery-map-wg
description: 根据用户提供的最新网管月度进度表更新网管交付地图，核对项目映射和覆盖状态，重建地图并按已确认的配置发布预览。用于网管地图更新与重新发布；集管使用对应的独立入口。
---

# 更新网管交付地图

本入口属于“三、产品交付阶段”，本次产品设为 **网管**。

## 执行

1. 读取 [产品差异配置](../../references/delivery-map/products.md) 中的网管项，定位本次进度表、产品目录和地图。
2. 按 [共用更新流程](../../references/delivery-map/workflow.md) 完成检查、合并、重建、验证和授权发布。
3. 项目字段与状态按 [数据规则](../../references/delivery-map/data-rules.md) 核对；发布时读取 [发布规则](../../references/delivery-map/publishing.md)。

流程、数据规则和检查脚本在插件根目录统一维护。产品目录保存本产品的数据源、地理骨架、状态口径和发布配置。
