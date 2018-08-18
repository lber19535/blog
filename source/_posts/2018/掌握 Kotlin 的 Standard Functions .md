---
title:        "掌握 Kotlin 的 Standard Functions : run, with, let, also, apply"
date:         2018-08-18 17:00
categories:   Kotlin
list_number:  false
tags:
- Android
---

本文是对[这篇文章](https://medium.com/@elye.project/mastering-kotlin-standard-functions-run-with-let-also-and-apply-9cd334b0ef84)的一个翻译。

Kotlin 的一些[标准方法](https://github.com/JetBrains/kotlin/blob/master/libraries/stdlib/src/kotlin/util/Standard.kt)非常长相近，使人觉得不知道该使用哪一个。这里我介绍一个简单的方法可以清楚的区分他们同时何时使用他们
<!--more-->

## Scoping 方法
run, with, T.run, T.let, T.also, T.apply 这些方法我称为 scoping 方法，他们的主要作用是在函数中提供一个 inner scoping。

下面用一个 run 的例子来说下 scoping 的概念

```kotlin
fun test() {
    var mood = "I am sad"

    run {
        val mood = "I am happy"
        println(mood) // I am happy
    }
    println(mood)  // I am sad
}
```

在这个例子中， test 方法内部有一个独立的 scope，里面重新定义了一个 mood 变量并且打印了出来，这个 scope 被放在 run 方法中。这个 run 方法 有一个好处是会将 scope 中最后一个行的对象作为返回值。因此，像下面这种写法会显得比较简洁，同时可以少写一次 show 方法的调用。

```kotlin
run {
    if (firstTimeView) introView else normalView
}.show()
```

## Scoping 方法的三个属性
为了更好地理解 scoping 方法，下面我们将这些方法按照行为分为三类，并用这些属性来区分他们。

### 1.Normal vs. extension function
先来看下 with 和 T.run，这两个方法看起来非常相似：

```kotlin
with(webview.settings) {
    javaScriptEnabled = true
    databaseEnabled = true
}
// similarly
webview.settings.run {
    javaScriptEnabled = true
    databaseEnabled = true
}
```

加入 webview.settings 可能为 null 时，代码就变成下面这样

```kotlin
with(webview.settings) {
      this?.javaScriptEnabled = true
      this?.databaseEnabled = true
}
// Nice.
webview.settings?.run {
    javaScriptEnabled = true
    databaseEnabled = true
}
```

在这个例子上，T.run 可以在使用前帮我们做 null 的检查

### 2.This vs. it argument
T.run 和 T.let 也非常相似：

```kotlin
stringVariable?.run {
      println("The length of this String is $length")
}
// Similarly.
stringVariable?.let {
      println("The length of this String is ${it.length}")
}
```

如果你看过 T.run 的源码，你会发现它仅仅是个扩展方法 block: T.()，因此在这段代码中可以用 this 指代 T。在编程中 this 通常可以被省略，所以在上面的代码中使用了 $length 代替 ${this.length}。

然而 T.let 将自己作为参数传入，例如 block: (T)。因此，这更像是 lambda 表达式中的一个参数。

从以上来看，T.run 相比于 T.let 貌似更有优势，下面会介绍 T.let 的一些优势：

* T.let 可以让你把参数的方法和变量与 class 的方法和变量区分开
* 当 this 需要当做其他方法的参数时，this 的省略就显得意义不大，反而是 it 更加简短
* T.let 支持将 it 改为更具语义的参数名

```kotlin
stringVariable?.let {
      nonNullString ->
      println("The non null string is $nonNullString")
}
```

### 3.返回 This vs 其他类型
现在我们来看下 T.let 和 T.also，从下面的代码来看，这两个方法是一样的。

```kotlin
stringVariable?.let {
      println("The length of this String is ${it.length}")
}
// Exactly the same as below
stringVariable?.also {
      println("The length of this String is ${it.length}")
}
```

然而在返回值上有一些细微的不同，T.let 可以返回一个其他类型，T.also 返回的是 this。

```kotlin
val original = "abc"
// Evolve the value and send to the next chain
original.let {
    println("The original String is $it") // "abc"
    it.reversed() // evolve it as parameter to send to next let
}.let {
    println("The reverse String is $it") // "cba"
    it.length  // can be evolve to other type
}.let {
    println("The length of the String is $it") // 3
}
// Wrong
// Same value is sent in the chain (printed answer is wrong)
original.also {
    println("The original String is $it") // "abc"
    it.reversed() // even if we evolve it, it is useless
}.also {
    println("The reverse String is ${it}") // "abc"
    it.length  // even if we evolve it, it is useless
}.also {
    println("The length of the String is ${it}") // "abc"
}
// Corrected for also (i.e. manipulate as original string
// Same value is sent in the chain 
original.also {
    println("The original String is $it") // "abc"
}.also {
    println("The reverse String is ${it.reversed()}") // "cba"
}.also {
    println("The length of the String is ${it.length}") // 3
}
```

从上面的代码来看 T.also 好像没什么意义，我们也可以把所有的操作放到同一个 block 中操作，但是仔细想想还是有以下优点

* 隔离不同作用在同一对象上的不同过程
* 基于自身的链式调用

结合 let 和 also 之后我们有了如下代码：

```kotlin
// Normal approach
fun makeDir(path: String): File  {
    val result = File(path)
    result.mkdirs()
    return result
}
// Improved approach
fun makeDir(path: String) = path.let{ File(it) }.also{ it.mkdirs() }
```

## 看了三种对比后的结论
在经过三种对比后，我们更好的了解了他们的行为。上面没有提及 T.apply 这个方法，下面是对 apply 方法对比以上的一些区别

1. 扩展方法
2. 使用 this 作为参数
3. 返回 this

下面看下怎么使用：

```kotlin
// Normal approach
fun createInstance(args: Bundle) : MyFragment {
    val fragment = MyFragment()
    fragment.arguments = args
    return fragment
}
// Improved approach
fun createInstance(args: Bundle) 
              = MyFragment().apply { arguments = args }
```

或者是将非链式的代码变成链式调用

```kotlin
// Normal approach
fun createIntent(intentData: String, intentAction: String): Intent {
    val intent = Intent()
    intent.action = intentAction
    intent.data=Uri.parse(intentData)
    return intent
}
// Improved approach, chaining
fun createIntent(intentData: String, intentAction: String) =
        Intent().apply { action = intentAction }
                .apply { data = Uri.parse(intentData) }
```

## 如何选择
通过以上的对比我们做了如下的一张图帮我们决定该用什么方法：

![xxx](https://image.slidesharecdn.com/kp-31-01-18-final-deliver3-180202165220/95/kotlin-language-features-a-java-comparison-29-638.jpg?cb=1517590407)