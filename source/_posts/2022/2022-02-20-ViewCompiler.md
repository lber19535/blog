---
title: ViewCompiler
date: 2021-11-06T15:48:32+08:00
tags:
---

[View Compiler](https://android.googlesource.com/platform/frameworks/base/+/master/startop/view_compiler/README.md)

Google 在 Android Q 的时候加入了一个 viewcompiler，从原理来看是在安装 apk 的时候对布局文件做的处理，上面这个 View Compiler 是整个机制的核心，大概原理就是将 xml 转换成 java 代码，但是不支持 merge include 等。当然这个工具也可以单独拿出来使用。这个工具的核心是节省掉了反射带来的开销。

<!--more-->

这个事情发生在 dexopt 的过程中（dexopt 是对 dex 文件 进行 verification 和 optimization 的操作，其对 dex 文件的优化结果变成了 odex 文件，这个文件和 dex 文件很像，只是使用了一些优化操作码），具体代码在 PackageManagerService 中，通过一系列的进程间调用最后调用到了开头提到的这个工具。下面是一些关键类的地址：

[ViewCompiler](https://cs.android.com/android/platform/superproject/+/master:frameworks/base/services/core/java/com/android/server/pm/dex/ViewCompiler.java;l=40?q=viewcompiler) ， [PackageManagerService](https://cs.android.com/android/platform/superproject/+/master:frameworks/base/services/core/java/com/android/server/pm/PackageManagerService.java;l=9963)，[view_compiler.cpp](https://cs.android.com/android/platform/superproject/+/master:frameworks/native/cmds/installd/view_compiler.cpp;drc=master;bpv=1;bpt=1;l=38)

由于不支持 merge include，所以自己做了一个 annotationprocessor  [Layout2Code](https://github.com/lber19535/Layout2Code) 替代这个 ViewCompiler，整体实现比较简单，基本是国庆期间在火车上写完的。换到了实际项目中的开屏后的第一个页面。实际的启动性能提升有 7% 左右的提升 （数据来源 20201030，首页主链路时长）。