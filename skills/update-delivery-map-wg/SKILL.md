---
name: update-delivery-map-wg
description: 根据用户提供的最新产品 B 月度进度表更新产品 B 交付地图，核对项目映射和覆盖状态，重建地图并按已确认的配置发布预览。用于产品 B 地图更新与重新发布；产品 A 使用对应的独立入口。
---

## 内部产品对应

执行前读取 [产品身份与公开边界](../../references/product-identity.md)，先从工作区本地配置解析产品，再选素材、主题、权限链接与真实文件名。


# 更新产品 B 交付地图

本入口属于“三、产品交付阶段”，本次产品设为 **产品 B**。

## 执行

1. 读取 [产品差异配置](../../references/delivery-map/products.md) 中的产品 B 项，定位本次进度表、产品目录和地图。
2. 按 [共用更新流程](../../references/delivery-map/workflow.md) 完成检查、合并、重建、验证和授权发布。
3. 项目字段与状态按 [数据规则](../../references/delivery-map/data-rules.md) 核对；发布时读取 [发布规则](../../references/delivery-map/publishing.md)。

流程、数据规则和检查脚本在插件根目录统一维护。产品目录保存本产品的数据源、地理骨架、状态口径和发布配置。
