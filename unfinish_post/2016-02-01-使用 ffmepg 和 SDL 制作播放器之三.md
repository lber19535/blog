---
title:        "使用 ffmepg 和 SDL 制作播放器之三"
date:         2016-02-01 17:00
categories:   C++
list_number:  false
tags:
- C++
---

这一章主要介绍如何将 decode 出来的音频流播放出来。由于 SDL 2 对音频部分的接口做了调整。所以代码和原来的不太一样。
<!--more-->

## 1.音频
接下来我们要播放声音。SDL 中提供了一些输出声音的方法。在 SDL 2 中我们使用 SDL_OpenAudioDevice 代替 SDL_OpenAudio 方法，这个方法用来打开一个音频设备。这个方法的参数中需要一个 SDL_AudioSpec 结构体，它包含了 我们要输出音频的所有信息。

在写代码之前我们先来看下电脑是如何处理音频的。数字音频是对流的采样，每一个采样的值代表音频的波形，音频由一个固定的采样率录制，采样率表示播放采样的速度，一秒钟包含很多采样。例如常用的采样率有 22050 和 44100 常用于 CD 和广播。另外，大部分音频都有多个 channel 来做立体声。所以当音频是立体声的时候，同一时刻会出现两个采样，当我们从一个视频文件中获取数据时，我们并不知道获取了多少采样，不过 ffmpeg 不会给我们不完整的采样，这也意味着不会分离立体声中的采样。

SDL 播放音频的步骤大概如下：设置音频相关参数，包括采样率(freq)，channel 数目等，同时还要设置回调函数和数据。当我们开始播放音频的时候，SDL 会不断的调用这个回调函数，回调函数中需要不断填充 buffer。当我们把这些信息都填到 SDL_AudioSpec 结构体中之后，我们调用 SDL_OpenAudioDevice 方法，打开一个音频设备，并且填充另一个 SDL_AudioSpec。

## 2.设置音频
按照之前的步骤，我们返回到设置 videostream 的地方，在这里加上 audiostream 的查找。

```c++

```

获取音频流的 AVCodecContext

```c++

```

开打音频流的 codec

```c++

```

设置音频播放需要的参数

```c++
SDL_AudioSpec want, have;
SDL_AudioDeviceID dev;

SDL_memset(&want, 0, sizeof(want));

want.freq = aCodecCtx->sample_rate;
want.format = AUDIO_S16SYS;
want.channels = aCodecCtx->channels;
want.samples = SDL_AUDIO_BUFFER_SIZE;
want.callback = audio_callback;
want.userdata = aCodecCtx;

dev = SDL_OpenAudioDevice(NULL, 0, &want, &have, SDL_AUDIO_ALLOW_FORMAT_CHANGE);
if (dev == 0) {
    printf("Failed to open audio: %s\n", SDL_GetError());
}
```
下面详细说下 SDL_AudioSpec 中代表的东西：
* freq：采样率
* format：S16SYS 中第一个 S 表示有符号，SYS 表示字节序列跟随系统
* channels: 声道数
* silence: 
* samples: audio buffer 的大小，范围可以是 512 - 8192，ffplay 用的是 1024
* callback: 回调函数
* userdata: SDL 会给回调函数一个 void 指针，这里就是 void 指针的内容。现在我们把 AVCodecContext 设置到到这里。

最后我们用 SDL_OpenAudioDevice 打开音频。

## 队列
现在我们准备从流中拿出我要需要的音频信息。但是我们要对这些信息做什么。我们不断的从文件中取出 package，同时 SDL 会去调用 callback 回调函数
