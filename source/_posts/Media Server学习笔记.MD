---
title:        "Media Server学习笔记"
date:         2015-9-16 17:00
categories:   Android
tags:
- Android
---

## 起因
最近一直在看 C++ 同时想 C++ 看完后结合 ffpemg 和 qt写一个跨平台的播放器，恰好最近轮到我做组内 Presentation，就想着分析下 Android 中的 Media Server 看看 Google 在做播放架构的时候是怎么做的同时可以用到我后续的开发中。

<!--more-->

## Media Server
Media Server 整体的架构师 C/S 架构，C 和 S 之间的通讯是 IPC，具体来说是 Binder。Media Server 中大量的用到了 Binder。整个架构将播放控制、视频、音频、相机等和多媒体有关的这些包装成不同的服务，通过 IPC 解耦。下图是 Google 关于 Android 中 [Media 引擎](https://source.android.com/devices/media.html)的架构做的关系图。

![Media 架构](https://source.android.com/devices/images/ape_fwk_media.png)