---
title:        "使用 ffmepg 和 SDL 制作播放器之二"
date:         2016-01-26 17:00
categories:   C++
list_number:  false
tags:
- C++
---

这一章主要介绍如何将 decode 出来的 frame 显示出来。由于使用了 SDL2 所以代码和原来的不太一样，这一张开始将不会全部翻译。我会将原文的思路结合新的 API 使用写出来。

<!--more-->

## 1.SDL 和视频
为了将图像绘制到屏幕上，我们需要使用 SDL。SDL 是 Simple Direct Layer 的缩写，是一个跨平台的多媒体框架，被用在很多项目中。你可以从 [SDL 官网](https://www.libsdl.org) 下载 dev 包和 dll 库。在这里我下了 SDL 2.0，原文中使用的是 SDL 1.2.15，两个版本在 API 上的区别不会太大，如果遇到原文中 1.x 和 2.0 的区别我也会标记出来。对于两个版本的迁移，SDL 的[官方文档](https://wiki.libsdl.org/MigrationGuide)中有详细的介绍。SDL 2.0 的一个好处是对很多语言做了 binding，例如 C#，Python，如果之后想用 C# 重做 demo 只需要自己将 ffmpeg 的部分 binding 到 C# 中就好了，一切就是这么的 easy。

SDL 有很多方法可以将图片绘制到屏幕上，并且有一个专门的方法 YUV overlay 用来将电影显示在屏幕上。YUV（技术上来说是 YCbCr 不是 YUV） 是一种存储图像数据的方式，就像 RGB 一样。Y 是亮度（luma），U 和 V 是颜色。（由于一些颜色信息会被丢弃，所以比 RGB 复杂很多，例如可能每 2 个 Y 的采样会有一个 U 和 V）SDL 的 YUV overlay 以数组的方式持有 YUV 的数据并显示他们。YUV overlay 接收四种不打通的 YUV 格式，其中 YV12 是最快的。另一种格式坏主意 YUV420P，它和 YV12 相同，只是 U 和 V 的数组互相调换了。420 表示[采样](https://zh.wikipedia.org/wiki/%E8%89%B2%E5%BA%A6%E6%8A%BD%E6%A0%B7#4:2:0)的比例是 4:2:0，表示一个颜色采样对应四个亮度采样，所以颜色采样是亮度的四分之一。这样做的好处之一就是节省带宽，并且人眼是无法察觉到这些变化。P 表示这种格式是二维的，简单来说就是 Y，U 和 V 放在不同的数组中。ffmpeg 可以将图片转换成 YUV420P，得益于这种格式的优点，他已经被很多视频流所采用。

所以我们现在计划将 frame 输出到屏幕的方法替换掉之前的 SaveFrame 方法。但是首先我们要看下如何使用 SDL。首先我们需要 include 一些头文件：

```c++
extern "C" {
#include "SDL.h"
#undef main
#include "SDL_thread.h"
}

if (SDL_Init(SDL_INIT_VIDEO | SDL_INIT_AUDIO | SDL_INIT_TIMER)) {
    std::cout << "could not init sdl" << SDL_GetError() << std::endl;
}
```
SDL_Init 通知库我们要用的到那些功能，SDL_GetError 用来拦截错误。

这里有几个坑，第一，因为 SDL 也是 C 做的库所以要放在 extern "C" 中。第二，因为 SDL.h 中 include 的头文件中有一个 SDL_main.h 其中包含了一个 main 函数，所以要 undef main，否则会和我们的 main 函数冲突。

## 创建一个显示区域
现在我们需要屏幕上的一块区域来显示内容，SDL 中用来显示图片最基础的东西叫做 surface：
```c++
SDL_Window *window;

window = SDL_CreateWindow("My Video Window",  // title
        SDL_WINDOWPOS_CENTERED,     // init window position
        SDL_WINDOWPOS_CENTERED,     // init window position
        pCodecCtx->width,           // window width
        pCodecCtx->height,          // window height
        SDL_WINDOW_OPENGL);         // flag
if(!screen) {
  std::cout << "SDL: could not set video mode - exiting\n" << std::endl;
  exit(1);
}
```
SDL_SetVideoMode 在 SDL 中已经弃用了，改用了 SDL_CreateWindow 方法。
使用这个方法对窗口设置给定的长和宽，标题，窗口初始化位置和渲染相关的 flag。接下来是创建 Render 和 Texture。现在 Render 隐藏了如何在在 Window 中绘制的细节，可能是 D3D，可能是 OpenGL，Texture 则是类似 Overlay 的一个画布。

```c++
SDL_Renderer *renderer;
SDL_Texture *texture = nullptr;

renderer = SDL_CreateRenderer(window, -1, SDL_RENDERER_ACCELERATED | SDL_RENDERER_PRESENTVSYNC);

texture = SDL_CreateTexture(renderer,
            SDL_PIXELFORMAT_YV12,
            SDL_TEXTUREACCESS_TARGET,
            pCodecCtx->width,
            pCodecCtx->height);
            
sws_ctx = sws_getContext(pCodecCtx->width,
            pCodecCtx->height,
            pCodecCtx->pix_fmt,
            pCodecCtx->width,
            pCodecCtx->height,
            AV_PIX_FMT_YUV420P,
            SWS_BILINEAR,
            NULL,
            NULL,
            NULL);
```

由于之前是将图像转为了 RGB，现在为了让其显示在以 YUV 的格式显示出来，需要将之前的 frame 转为 YUV420P 的格式。

```c++
AVFrame *pFrameYUV = av_frame_alloc();
int numBytes = av_image_get_buffer_size(AV_PIX_FMT_YUV420P, pCodecCtx->width,
    pCodecCtx->height, 1);
uint8_t *buffer = (uint8_t *)av_malloc(numBytes*sizeof(uint8_t));

av_image_fill_arrays(pFrameYUV->data, pFrameYUV->linesize, buffer, AV_PIX_FMT_YUV420P,
    pCodecCtx->width, pCodecCtx->height, 1);
sws_scale(sws_ctx, frame->data,
    frame->linesize, 0, pCodecCtx->height,
    pFrameYUV->data, pFrameYUV->linesize);
```

## 2.显示图片
现在我们就剩下把图片显示出来这一步了。在这里我们就不需要之前的 RGB frame 了，并且可以将 SaveFrame 方法替换成显示图片的代码。现在我们需要将 frame 的 data 和 linesize 交给 SDL_UpdateYUVTexture 方法，让它去更新之前我们创建的 Texture。

```c++
SDL_UpdateYUVTexture(texture, 
        nullptr, 
        pFrameYUV->data[0], 
        pFrameYUV->linesize[0], 
        pFrameYUV->data[1], 
        pFrameYUV->linesize[1], 
        pFrameYUV->data[2],
        pFrameYUV->linesize[2]);
        
SDL_RenderClear(renderer);
SDL_RenderCopy(renderer, texture, nullptr, nullptr);
SDL_RenderPresent(renderer);
```
这里用到了 frame 中的三个 data 指针，YUV420P 格式中有三个 channel，每个 channel 代表 YUV 中的一个，其他格式可能会有四个，例如带了 alpha 通道的。

这里使用 SDL2 加入的新的 API，根据文档中的描述，原来的 YUVOverlay 由 Texture 代替，所以在 SDL2 中移除了 Overlay 的概念，取而代之的是 Texture。SDL_UpdateYUVTexture 会将数据提交到 GPU 中，SDL_RenderClear 会移除当前显示在 framebuffer 中的内容，SDL_RenderCopy 将要显示的新内容放到 framebuffer 中，SDL_RenderPresent 让 buffer 中的内容显示出来。

SDL2 算是简化了绘制的流程，只需要不断的 update 就可以更新画面了，不再像需要不停的去手动填充 SDL_Rect 和更新 Overlay了。

下面我们来说下 SDL2 的事件系统。当你在 SDL 的程序中打字，使用鼠标或者发送信号都会产生事件。程序可以拦截到这些时间并加以处理，程序也可以生成一些事件发给 SDL 的事件系统。这个在多线程编程的时候特别有用。下面是一个例子。

```c++
if (SDL_PollEvent(&event)) {
    switch (event.type) {
    case SDL_KEYUP:
        switch (event.key.keysym.sym) {
        case SDLK_ESCAPE:
            quit = true;
            std::cout << "exit" << std::endl;
            break;
        case SDLK_SPACE:
            play = !play;
            std::cout << "play" << std::endl;
            break;
        default:
            break;
        }
        break;
    case SDL_QUIT:
        quit = true;
        break;
    default:
        break;
    }
}
```
如果 SDL_PollEvent 方法捕捉到了事件怎会返回1，否则是0。一般是单独放一个线程中做死循环，每次循环就会捕捉一次事件。

## 3.总结
到这里我们算是对视频的显示有了一个直观的了解。基本的流程就是通过 ffmpeg 将文件分为视频流和音频流，然后将视频流拿出来解码，解到的每一帧就是一个图像，然后我们按照帧率将这个图像显示出来就可以了。其中显示这里有一个需要注意的地方就是渲染的格式，由于大部分视频解码出来都是 YUV 格式的，所以要显示的控件需要有绘制 YUV 的功能，一般来说 OpenGL 或者 D3D 都有这个功能。当然也可以用 ffmpeg 带的转换功能将 YUV 转为 RGB 的格式，RGB 是所有控件都支持的，但是这样就会带来性能上的损失。

下一节将是如何播放音频，原理和视频是类似的。