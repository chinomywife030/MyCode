# Logo 透明背景图片说明

## 文件位置
`apps/mobile/assets/images/logo-transparent.png`

## 要求
- 格式：PNG（透明背景）
- 内容：BangBuy 包包 B Logo（去背版本）
- 尺寸建议：至少 160x160 像素（@2x）或 240x240 像素（@3x）以支持高分辨率屏幕
- 背景：完全透明（alpha channel）

## 使用方式
此图片用于登录页面的 Logo 显示，已配置为：
- `resizeMode: "contain"`（通过 `contentFit="contain"`）
- 固定尺寸：80x80 像素
- 居中显示

## 注意事项
- 请确保图片文件存在，否则 App 会崩溃
- 建议提供 @2x 和 @3x 版本以获得最佳显示效果（可选）
