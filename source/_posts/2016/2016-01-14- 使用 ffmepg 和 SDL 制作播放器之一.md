---
title:        "使用 ffmepg 和 SDL 制作播放器之一"
date:         2016-01-14 17:00
categories:   C++
list_number:  false
tags:
- C++
---

一直想用 ffmpeg 做一个播放器，但是网上的初级资料太少了，这里找到一个 step by step 文章，在学习的同时翻译过来，希望可以帮到同样有需要的同学。

<!--more-->

## 1.配置
开发环境的配置原文没有，而且是在 Linux 下开发的，作为新手还是用 IDE 来得方便，这里主要说下 VS2015 + Win10 下的环境搭建。
用到的两个库的下载地址是 [ffmpeg](http://ffmpeg.zeranoe.com/builds/) 和 [SDL](https://buildbot.libsdl.org/sdl-builds/sdl-visualstudio/?C=M;O=D)，ffmpeg 需要 share 和 dev 两个压缩包，share 中的是运行时需要的 dll，dev 是编译的需要的 lib 和 头文件。SDL 下载最新的就可以了。

然后是设置项目的 Properties。首先设置 Debuging 部分的 Environment，添加 SDL 和 ffmpeg 的 dll 路径，然后是 C/C++ 部分，在 Additional Include Directories 中添加 ffmpeg 和 SDL 的头文件路径，最后在 Linker 中的 Additional Libraries Directories 添加 ffmpeg 和 SDL 的 lib 路径，并且将 lib 的名字加到 Input 的 Additional Dependencies 中。


## 2.概述
我们需要了解一下有关媒体文件的基础知识。首先，文件本身被称为容器，容器的类型决定了里面的信息存储的位置。例如，常见的类型 AVI，Quicktime 等。接下来是流，一般来说会有一个音频流和一个视频流。流中的数据单元就是帧。每个流有对应的解码器，解码器定义了数据该如何编码和解码，例如 mp3 解码器。Packets 是从流中读取的，每一个包就是一段数据，这个数据呗解码为帧供程序使用。目前来说，每一个 packets 包含一个完整的帧，在 audio 中也会有多个帧。

基本上来说，处理音频视频流是很简单的：
```java
10 OPEN video_stream FROM video.avi
20 READ packet FROM video_stream INTO frame
30 IF frame NOT COMPLETE GOTO 20
40 DO SOMETHING WITH frame
50 GOTO 20
```
尽管很多程序在 DO SOMETHING 这一步做的非常复杂，但是使用 ffmpeg 处理多媒体还是非常简单的。在这个教程中，我们要打开一个文件，读出视频流，并且将其中的帧写到 ppm 文件中。

## 3.打开文件
首先我们看下如何打开文件。在使用 ffmpeg 的时候需要初始化整个库：
```c++
extern "C"{ // 由于我用的是 C++，所以加了这个
#include <libavcodec/avcodec.h>
#include <libavformat/avformat.h>
#include <ffmpeg/swscale.h>
}
...
int main(int argc, charg *argv[]) {
av_register_all();
```
av_register_all 会注册所有可用的文件格式和解码器，当我们打开文件的时候解码器就会被自动调用。要注意 av_register_all 方法只能调用一次，所以这里在 main 函数中调用。如果你喜欢，也可以注册单个格式或解码器，但是这么做没什么意义。
现在我们可以打开文件了：
```c++
AVFormatContext *pFormatCtx = NULL;

// Open video file
if(avformat_open_input(&pFormatCtx, filename, nullptr, nullptr)!=0)
    return -1; // Couldn't open file
```
我们通过命令行获取文件名。这个方法会读取文件头并将有关文件格式的信息存储在 [AVFormatContext](http://dranger.com/ffmpeg/data.html#AVFormatContext) 中。 由于原文中的参数列表比较古老了，在使用的时候用了新的，其实变化不大。第二个参数就是文件名包括路径，第三个参数是解码器类型，如果指定一个解码器则会按照指定的强制解码，如果是 null 则会自动检测使用哪个解码器，最后一个参数是分离器和 AVFormatContext 的字典，这个参数只会被链式使用函数调用结束后就被销毁了，由于这里没有什么特殊设置，所以也设为 null。
avformat_open_input 只会读取文件头，下一步我们要拿出流的信息：
```c++
// Retrieve stream information
if (avformat_find_stream_info(pFormatCtx, nullptr) < 0)
    return -1; // Couldn't find stream information
```
avformat_find_stream_info 方法将流的信息放入 pFormatCtx->streams 中。我们介绍一个简单的 dump 方法来显示 pFormatCtx 中的内容：
```c++
// Dump information about file onto standard error
av_dump_format(pFormatCtx, 0, filename, 0);
```
现在 pFormatCtx->streams 就是一个指针数组，流的数量在 pFormatCtx->nb_streams 中，现在让我们遍历一下找找视频流在哪里。
```c++
// Find the first video stream
videoStream = -1;
for (i = 0; i < pFormatCtx->nb_streams; i++)
    if (pFormatCtx->streams[i]->codec->codec_type == AVMEDIA_TYPE_VIDEO) {
        videoStream = i;
        break;
    }

if (videoStream == -1)
    return -1; // Didn't find a video stream
    
// Get a pointer to the codec context for the video stream
pCodecCtxOrig = pFormatCtx->streams[videoStream]->codec;
```
流的解码器信息就放在了 codec context 中，它包含了流需要用的解码器信息，现在我们有了一个它的指针，但是我们还需要找到对应的解码器并且打开它。
```c++
// Find the decoder for the video stream
pCodec = avcodec_find_decoder(pCodecCtxOrig->codec_id);
if (pCodec == nullptr) {
    fprintf(stderr, "Unsupported codec!\n");
    return -1; // Codec not found
}
// Copy context
pCodecCtx = avcodec_alloc_context3(pCodec);
if (avcodec_copy_context(pCodecCtx, pCodecCtxOrig) != 0) {
    fprintf(stderr, "Couldn't copy codec context");
    return -1; // Error copying codec context
}
// Open codec
if (avcodec_open2(pCodecCtx, pCodec, nullptr) < 0)
    return -1; // Could not open codec
```
我们没办法直接使用 AVCodecContext，所以需要用 avcodec_copy_context 复制一个新的来使用。

## 4.存储数据
现在我们需要一个地方来存放帧：
```c++
// Allocate video frame
pFrame = av_frame_alloc();
```
由于我们要输出一个用 24-bit RGB 的 ppm 的文件，我们需要把帧转换为 RGB 格式，ffmpeg 为我们提供了一些便利的方法。大多数项目中，我们都会将初始的帧转换为特定类型的帧。现在我们需要一个 RGB 的帧：
```c++
// Allocate an AVFrame structure
pFrameRGB = av_frame_alloc();
if (pFrameRGB == nullptr)
    return -1;
```
尽管我们已经有了一个帧，我们仍然需要需要一个地方来存放转换时的数据。我们用 avpicture_get_size 方法获取到我们需要的大小，然后手动分配一个空间。

```c++
// Determine required buffer size and allocate buffer
numBytes = avpicture_get_size(PIX_FMT_RGB24, pCodecCtx->width, pCodecCtx->height);
buffer = (uint8_t *)av_malloc(numBytes*sizeof(uint8_t));
```

av_malloc 是 ffmpeg 对 malloc 方法的一个封装，主要是检查内存是否对齐（提升性能和内存使用效率），该方法不是用来解决内存泄漏，多次 free 之类的问题。

```c++
// Assign appropriate parts of buffer to image planes in pFrameRGB
// Note that pFrameRGB is an AVFrame, but AVFrame is a superset
// of AVPicture
avpicture_fill((AVPicture *)pFrameRGB, buffer, PIX_FMT_RGB24, pCodecCtx->width, pCodecCtx->height);
```

现在我们用 avpicture_fill 方法将帧和新的 buffer 组合。
关于 AVPicture 转换：AVPicture 结构体是 AVFrame 的子集，具体来说就是 AVFrame 的头两个元素 uint8_t *data[4] 和 int linesize[4]: Stride information 就是 AVPicture。终于我们准备好号从流中开始读数据了。

## 5.读数据
流程是读一个包，解码为帧，当帧解码完成后把他存储下来。

```c++
// initialize SWS context for software scaling
sws_ctx = sws_getContext(pCodecCtx->width,
    pCodecCtx->height,
    pCodecCtx->pix_fmt,
    pCodecCtx->width,
    pCodecCtx->height,
    PIX_FMT_RGB24,
    SWS_BILINEAR,
    nullptr,
    nullptr,
    nullptr
    );
// Read frames and save first five frames to disk
i = 0;
while (av_read_frame(pFormatCtx, &packet) >= 0) {
// Is this a packet from the video stream?
    if (packet.stream_index == videoStream) {
        // Decode video frame
        avcodec_decode_video2(pCodecCtx, pFrame, &frameFinished, &packet);
 // Did we get a video frame?
        if (frameFinished) {
            // Convert the image from its native format to RGB
            sws_scale(sws_ctx, (uint8_t const * const *)pFrame->data,
                pFrame->linesize, 0, pCodecCtx->height,
                pFrameRGB->data, pFrameRGB->linesize);
            // Save the frame to disk
            if (++i <= 5)
                SaveFrame(pFrameRGB, pCodecCtx->width, pCodecCtx->height, i);
        }
    }
   // Free the packet that was allocated by av_read_frame
   av_free_packet(&packet);
}
```

我们再来复习下这个流程：av_read_frame 读取 package 并存储在 AVPacket。注意我们只给 package 结构体分配内存，结构体内部的数据 ffmpeg 会自己分配。分配的内存随后会被 av_free_packet 方法释放掉。

avcodec_decode_video 将 package 转换为帧。然而，我们可能没有拿到解码后的帧的信息，所以 avcodec_decode_video2 将帧放到了 frameFinished 中。最后我们用 sws_scale 将格式转为 RGB。记住你可以将 AVFrame 指针转换为 AVPicture 指针（因为 AVPicture 和 AVFrame 的其实两个成员相同）。最后将帧、长和宽的信息交给 SaveFrame 方法。

现在我们需要做的就是将 RGB 写到一个 PPM 格式的文件中。
```c++
void SaveFrame(AVFrame *pFrame, int width, int height, int iFrame) {
  FILE *pFile;
  char szFilename[32];
  int  y;
  
  // Open file
  sprintf(szFilename, "frame%d.ppm", iFrame);
  pFile=fopen(szFilename, "wb");
  if(pFile==NULL)
    return;
  
  // Write header
  fprintf(pFile, "P6\n%d %d\n255\n", width, height);
  
  // Write pixel data
  for(y=0; y<height; y++)
    fwrite(pFrame->data[0]+y*pFrame->linesize[0], 1, width*3, pFile);
  
  // Close file
  fclose(pFile);
}
```
我们打开一个文件并将 RGB 数据写进去，一次写一行。PPM 文件是将 RGB 信息排列的一种字符串。如果你知道 HTML 中的颜色，它就像是 #ff0000#ff0000...每个像素挨个排列一样，最终会得到一个红色的图片。文件头表示图图片的宽和高还有 RGB 的最大值。

现在回到我们的 main 函数，做一些最后的清理工作。
```C++
// Free the RGB image
av_free(buffer);
av_free(pFrameRGB);

// Free the YUV frame
av_free(pFrame);

// Close the codecs
avcodec_close(pCodecCtx);
avcodec_close(pCodecCtxOrig);

// Close the video file
avformat_close_input(&pFormatCtx);
```

avcode_alloc_frame 和 av_malloc 分配的就要用 av_free 来释放。

下面就可以运行了。

Linux 下：
```shell
gcc -o tutorial01 tutorial01.c -lavutil -lavformat -lavcodec -lz -lavutil -lm

#or If you have an older version of ffmpeg, you may need to drop -lavutil
gcc -o tutorial01 tutorial01.c -lavformat -lavcodec -lz -lm
```

由于我用的是 VS，所以直接点运行就跑起来了。最后在项目根目录生成了几个 PPM 文件，生成的文件可以用 [File Viewer Lite](http://windowsfileviewer.com/) 来查看。

~~目前遇到的问题是解码出来的 宽是 8，但高是正常的 640。之后找到怎么解决我还会回来更新。~~
更换了最新 ffmpeg 的库之后，宽度的问题解决了。

下一章是使用 SDL 将图像输出到屏幕上。