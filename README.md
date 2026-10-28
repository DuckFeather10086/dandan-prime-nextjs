# DanDan Prime

本地动画媒体库的 Next.js 前端。提供片库搜索与排序、作品资料、多版本剧集选择、弹幕、章节、音轨与字幕切换。

## 本地开发

```sh
npm install
npm run dev
```

默认前端端口为 3000，API 通过 Next.js 转发到 `http://127.0.0.1:1234`。使用其他后端时设置 `BACKEND_ORIGIN`；浏览器保持同源访问，不需要填写后端 IP。

需要与线上构建隔离时：

```sh
BACKEND_ORIGIN=http://127.0.0.1:1235 DANDAN_BUILD_DIR=.next-preview npm run dev -- --port 4100
```

`NEXT_PUBLIC_API_HOST` 可以指定浏览器直连的 API 地址；通常保持为空即可。

## 播放能力

- 观看进度在播放期间、暂停、拖动和退出时保存；刷新及重新打开剧集会恢复。播放完成后从头开始。浏览器存储作为服务器不可用时的备份。
- 上一集和下一集依照作品的实际剧集分组导航，同集的其他版本不算下一集，特典不进入正片顺序。
- ASS/SSA 使用 libass Canvas；文本字幕使用 VTT；PGS（SUP）和 VobSub（MKS / IDX+SUB）使用 [libbitsub](https://github.com/altqx/libbitsub) 的 Canvas 渲染器。字幕可独立关闭或切换。
- 后端返回源视频尺寸、编码、码率与可用清晰度。源分辨率保留尺寸，转码采用 CRF 18；不会放大低分辨率素材。它不是原文件无损直通，最终画质仍取决于源片和编码。
- 收藏与手动已看标记保存在当前浏览器。作品扩展资料来自 Bangumi，暂时不可用时不影响本地剧集播放。

需要配套的 `dandan-prime` 后端更新：`GET /api/progress/:id?user_id=1`、`PUT /api/progress`，以及包含 `season_id`、`quality_options` 和图片字幕轨道的 `/api/playback/:id`。后端启动时自动新增 `watch_progress` 表。沿用原项目的单用户 `user_id=1` 约定。

## 验证

```sh
npm run lint
npm test
npm run build
# 后端目录中
# go test ./...
```

设计约定见 [DESIGN.md](./DESIGN.md)。前端打磨参考 [Impeccable](https://github.com/pbakaus/impeccable)。
