---
title:        "Gradle Android 使用及源码分析"
date:         2016-06-01 17:00
categories:   Gradle
list_number:  false
tags:
- Gradle
---

Gradle 做为 Android 程序员日常使用的构建工具，可以说大家都很熟悉，但是在使用的过程中发现了很多地方自己都不是很清楚，例如整个构建过程是怎么进行的，不同的 Action 和 Task 有哪些属性和方法可以使用，怎么写一个 Gradle tool等。写这篇文章就是为了搞明白这些问题。
<!--more-->

Reference：
[Gradle Guide](https://docs.gradle.org/current/userguide/userguide.html)
[Android Gradle Build Tool Source Code](https://android.googlesource.com/platform/tools/build/)
