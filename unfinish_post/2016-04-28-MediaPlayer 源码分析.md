---
title:        "MediaPlayer 源码分析"
date:         2016-04-28 17:00
categories:   Android
list_number:  false
tags:
- Java Android
---

之前有写过一个 [Media Player 学习笔记](https://lber19535.github.io/2015/09/16/Media%20Player%20%E5%AD%A6%E4%B9%A0%E7%AC%94%E8%AE%B0/)，所以看到 [android sdk 源码解析](https://github.com/LittleFriendsGroup/AndroidSdkSourceAnalysis) 项目后也想出一份力，就认领了 MediaPlayer 的源码分析。

这次的源码分析主要是结合之前的笔记并且加入对绘制图像部分代码的分析。

<!--more-->

## 1.


References:
[Media Playback](http://developer.android.com/guide/topics/media/mediaplayer.html)
[Media Architecture](https://source.android.com/devices/media/index.html#architecture)
