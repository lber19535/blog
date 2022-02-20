---
title: Jetpack Compose - In-depth understanding
date: 2021-06-30T19:02:36+08:00
tags:
---


Jetpack Compose 终于要在 7 月 release 了，趁此之际来分析一下 Compose 在原理上和 View 的那一套有什么不同。因为每个版本的 Compose Compiler 生成的代码都不一样，所以这里主要介绍分析的思路，具体最新版的代码还得自己动手。文中截图皆取自一次自己的在组内的分享。

<!-- more -->

# 1.Introduce

我们先来看下对基本的一个 View 的绘制流程

![Untitled](Untitled.png)

每一帧的绘制都是从 doFrame 开始，到 view.draw 再到 drawRenderNode，这里这个 RenderNode 很重要，后面会多次出现。

# 2.What happened in Compose

## 2.1 **Drawing process of Android Compose**

那么 Compose 是怎么绘制一个 View 或者怎么绘制 UI 的呢，如下图所示，在原有的 View 链路上增加了一条属于 Compose 的流程，具体的用蓝色方框标记出来了。从图中可以看出，通过 AndroidUiDispatcher 将 Compose 的绘制链路单独拿了出来。

![Untitled](Untitled_1.png)

## 2.2**Android Compose Compiler**

那么 Compose 是怎么做到将这块流程单独拿出来的呢，这个跟 Compose Compiler 密切相关。一个简单的 Compose demo 代码如下：

```kotlin
@Composable
fun Demo() {
    Column {
        val name = remember { mutableStateOf("") }
        Button(onClick = {
            name.value = "${System.currentTimeMillis()}"
        }) {
            Text("Click It")
        }
        Text(text = name.value)
    }
}
```

@Composable 类似 kotlin 协程里的 suspend，相当于是一种特殊的方法类型，Compose 有一个叫做 Compose Compiler 的编译器插件，在编译期最代码进行改造，要想能理解这一块内容，需要先介绍一下编译器在编译的时候做了什么。

![Untitled](Untitled_2.png)

编译的过程中会生成 IR，Android Compose Compiler 正是通过 KCP 对 IR 进行了修改，下面我们看下编译之后的结果，因为一张图截不下，所以截了两张图：

![Untitled](Untitled_3.png)

![Untitled](Untitled_4.png)

下面我们来简化一下代码：

```java
public static final void Demo(Composer $composer, int $changed) {
		Object value$iv$iv;
    Composer $composer2 = $composer.startRestartGroup(-1739900961);
    ComposerKt.sourceInformation($composer2, "C(Demo)33@1021L215:MainActivity.kt#ffoge4");
    if ($changed != 0 || !$composer2.getSkipping()) {
			ComposerKt.sourceInformation($composer2, "C(remember):Composables.kt#9igjgp");
			Object value$iv$iv2 = $composer2.rememberedValue();
			if (value$iv$iv2 == Composer.Companion.getEmpty()) {
		    value$iv$iv2 = SnapshotStateKt.mutableStateOf$default(LiveLiterals$MainActivityKt.INSTANCE.m2627x489236c1(), null, 2, null);
		    $composer2.updateRememberedValue(value$iv$iv2);
			}
		}
    ScopeUpdateScope endRestartGroup = $composer2.endRestartGroup();
}
```

第一步 Compiler 会给这个方法加两个参数，分别是 Composer 和 changed 的标，然后会start一个可以 recompose 的 group，入参是一个compiler生成hash值后面会看到这个hash值是怎么生成的，这里还有一个sourceinformation 也是生成的。这里是 remember 编译后的样子，生成的这些代码还会随着 compiler 的版本迭代有一些改动，这个也是看起来头疼的一个原因，这里rememberview 的原理是基于一个叫做 SlotTable的东西做的，整个compose 的机制的核心是一个叫做 gapbuffer 的东西，是和 SlotTable 配合使用的，有兴趣的可以去看下源码的实现。

# 3.Why Compose do that

## 3.1 **RenderNode**

在View体系中，每个View 会有一个 RenderNode，Compose 中是每个 ComposeView 有一个 RenderNode，不同的LayoutNode 最后通过 Composer 算好要画什么东西，最后画到了这个RenderNode中，这样可以减少draw的次数。

![Untitled](Untitled_5.png)

另一个就是overdraw的问题了，View的设计中是View和rendernode是强绑定的，这样出现相互叠加的view的时候就有可能导致过度绘制，Compose的设计完美的避开了这一点。

## 3.2 **Layout & Measure**

Compose的layoute ，measure，draw 都是在 dispatchdraw的过程中做的，compose会在measure 和 layout 的时候算出哪些layoutnode是需要measure和layout的，然后在对对应的layoutnode就行调整，最后完成这一次的绘制。

![Untitled](Untitled_6.png)

# 4.How to implement

## 4.1 **What is IR**

要知道 Compose 是如何实现的，还是得看一下什么是IR，在 kotlin 中 IR 还是处于 alpha 阶段的一个特性，kotlin ir 目标还是想让跨平台等方面的实现更简单一些，这样会方便把 kotlin 编译到各种语言和平台上，例如要支持js，那只要在编译器中加一个讲 ir 编译到 js 的编译后端就可以了，而不需要从头写一个把 kotlin 编译成 js 的编译器（补充：当时写文章的时候还是 alpha版本，Kotlin JVM IR 稳定版已经随 Kotlin 1.5.0 正是发布了）。

因为Kotlin IR 是个新特性，而且没有文档，所以只能找了个 Rust 的例子来看下，源码中定义x,y分别为 10，20，然后传入 add 方法，在生成 IR 的时候会做一定程度的优化，例如这里直接略过了变量定义而直接使用了 10， 20 两个值（下图摘自某个博客，具体不太记得了）。

![Untitled](Untitled_7.png)

然后在从 IR 到汇编，add编译为了三行汇编指令，print编译为了两行指令，在Java中，字节码可以理解为一种 IR，虚拟机在运行的时候会通过分析字节码做一些优化，而非虚拟机类型的语言例如 Rust，则会在编译阶段把优化都做完，详细的可以参考这篇{% post_link 2022/2022-02-20-Java与JIT %}

![Untitled](Untitled_8.png)

## 4.2 **Compose Compiler**

下面介绍一下 Compose Compiler 大概干了些什么，想要自己研究的可通过下面这个链接去看下如何将 androidx 导入到 androidstudio 中运行，这个 ComposePlugin 就是 ComposeCompiler 的入口

![Untitled](Untitled_9.png)

在入口里会注入一个叫做 ComposeIrGenerationExtension 的东西，这个东西就是帮我们在编译期生成那么多compose 相关代码的东西了

![Untitled](Untitled_10.png)

ComposeIrGenerationExtens 实现了 IrGenerationExtension 接口，重载了 generate 方法

![Untitled](Untitled_11.png)

这里第一步是检查一下 compose 版本是否和 kotlin 版本匹配，不匹配的话会有编译期异常

![Untitled](Untitled_12.png)

这一步就是给方法加入 composer 和 changed 参数

![Untitled](Untitled_13.png)

这一步就是生成最开始我们看到的很长的那一段代码的了, ComposableFunctionBodyTransformer 大概4000多行，注释比较详细，感兴趣怎么生成的可以看下这部分源码，我们前面看到的 start，sourceinformation，remembervalue等都是这里生成的，同时这个类上标记了个DEPRECATION，后面有可能他们会重构然后废弃掉这个东西。

![Untitled](Untitled_14.png)

# 5.Strengths and Weaknesses

**Strengths**

- 这个东西目前没有查到一些和性能相关的测试，不太能确认性能提升到底有多少，以及他这个gap buffer 的设计会不会对性能有影响，只是理论上看起来性能不错，因为减少了view 的层级和rendernode的绘制次数
- 官方也没有说过这个东西性能很好，只是说写app很快，而不是写的app很快

![Untitled](Untitled_15.png)

**Weaknesses**

- 一个劣势就是当嵌套比较多的时候，代码层级会变得越来越深，在可维护性上有一定的劣势，同时将 UI 一定需要一个 mutablestate 的数据类，这样就需要从接口反序列化的数据再mapping一次到UI数据上，这个可能可以通过一些工具来做
- 绘制流程变的不是很透明了，基本上是以 lambda 嵌套来做的，当 UI 出了问题的时候 debug上会比较有难度

