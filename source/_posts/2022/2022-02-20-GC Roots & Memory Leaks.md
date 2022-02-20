---
title: Roots &amp; Memory Leaks
date: 2021-01-19T15:38:37+08:00
tags:
---

本文源码基于 Android 29 和 jdk 8

<!--more-->

# 1.GC roots

先介绍一下GC roots，对于使用可达性分析的垃圾回收算法来说，GC roots是一个比较特别的存在，垃圾回收器咋回收对象的时候会判断这个对象是不是 GC root 或者是否被 GC root 引用，到这里就会有一个问题，到底什么是 GC root：

1. **Class** 这里主要指被系统 ClassLoader 加载的 class，自定义 ClassLoader 加载的 class 不是 GC roots。需要注意的一点是静态变量是属于类的
2. **Tread** 处于活动状态的线程
3. **Stack Local** 方法中变量和参数
4. **JNI Local JNI** 方法中的变量和参数
5. **JNI Global** 全局的 JNI reference，简单来说就是 JNI 中全局创建的引用，因为生命周期的关系，不可避免就会导致对应的泄漏
6. **Monitor Used** 同步的对象，例如synchronized(同步的对象)
7. **Held by JVM** 这个取决于对应 JVM 的实现，例如系统的 ClassLoader 和 JVM 本身会用到的一些对象，规范和各家实现没有明确的一个标准，所以分析内存泄漏的时候需要注意一下

关于方法中的变量作为 GCroots 在这里举一个例子：

```kotlin
fun main() {    
	var b:ByteArray? = ByteArray(8 * _10MB)    
  b = null         
  System.gc()
}

// 0.216: [GC (System.gc()) [PSYoungGen: 5245K->688K(76288K)] 87165K->82616K(251392K), 0.0010211 secs] [Times: user=0.00 sys=0.00, real=0.01 secs] 
// 0.217: [Full GC (System.gc()) [PSYoungGen: 688K->0K(76288K)] [ParOldGen: 81928K->549K(175104K)] 82616K->549K(251392K), [Metaspace: 3318K->3318K(1056768K)], 0.0090139 secs] [Times: user=0.04 sys=0.00, real=0.01 secs] 
```

上面这段在 gc 的时候会输出一段 log，最下面有对应的 log 字段的含义，第一段是 minor gc，展示了新生代从 5245k 降到了 688k，同时 b 这个对象被移到了老年代，第二行 full gc这里展示老年代从 81928k 降到了 549K，回收了大概80M内存。下面看另一个例子：

```kotlin
fun main() {    
	var b:ByteArray? = ByteArray(8 * _10MB)    
	System.gc()    
	b = null         
	System.gc()
}

// 0.207: [GC (System.gc()) [PSYoungGen: 5245K->752K(76288K)] 87165K->82680K(251392K), 0.0012790 secs] [Times: user=0.00 sys=0.00, real=0.00 secs] 
// 0.208: [Full GC (System.gc()) [PSYoungGen: 752K->0K(76288K)] [ParOldGen: 81928K->82469K(175104K)] 82680K->82469K(251392K), [Metaspace: 3318K->3318K(1056768K)], 0.0119808 secs] [Times: user=0.04 sys=0.01, real=0.01 secs] 
// 0.220: [GC (System.gc()) [PSYoungGen: 0K->0K(76288K)] 82469K->82469K(251392K), 0.0015803 secs] [Times: user=0.01 sys=0.00, real=0.00 secs] // 0.222: [Full GC (System.gc()) [PSYoungGen: 0K->0K(76288K)] [ParOldGen: 82469K->549K(175104K)] 82469K->549K(251392K), [Metaspace: 3318K->3318K(1056768K)], 0.0057604 secs] [Times: user=0.04 sys=0.00, real=0.01 secs] 
```

这个例子中在 b 被置空前尝试 gc，从 log 看依旧是一次 minor gc 加一次 full gc，但是这次 full gc 并没有让老年代中的内存减少，当吧 b 置为 null 的时候，再去 gc 就可以回收掉了。这两个例子就证明了方法中的变量也是 gc roots。灰色部分是 gc log 的说明

GC发生时间: [垃圾收集停顿类型: [GC发生区域: GC前该内存区域已使用容量 -> GC后该内存区域已使用容量(该内存区域总容量)] 该内存区域GC所占用的时间] GC前Java堆已使用容量 -> GC后Java堆已使用容量(Java堆总容量)] [user表示用户态消耗的CPU时间，sys表示内核态消耗的CPU时间，real表示操作从开始到结束所经过的墙钟时间]

下面是 Thread 作为 gc root 的例子，可以结合上面的例子以及代码对应的 log 尝试分析。

```kotlin
fun main() {    
	var l:Runnable? = object : Runnable{        
		val v = A(8 * _10MB)        
		override fun run() {        }    
	}    
	System.gc()    
	l?.run()    
	l = null    
	System.gc()
}

// 0.240: [GC (System.gc()) [PSYoungGen: 5245K->688K(76288K)] 87165K->82616K(251392K), 0.0014139 secs] [Times: user=0.01 sys=0.00, real=0.00 secs] 
// 0.242: [Full GC (System.gc()) [PSYoungGen: 688K->0K(76288K)] [ParOldGen: 81928K->82470K(175104K)] 82616K->82470K(251392K), [Metaspace: 3321K->3321K(1056768K)], 0.0065966 secs] [Times: user=0.03 sys=0.00, real=0.01 secs] 
// 0.249: [GC (System.gc()) [PSYoungGen: 0K->0K(76288K)] 82470K->82470K(251392K), 0.0014595 secs] [Times: user=0.01 sys=0.00, real=0.00 secs] // 0.250: [Full GC (System.gc()) [PSYoungGen: 0K->0K(76288K)] [ParOldGen: 82470K->549K(175104K)] 82470K->549K(251392K), [Metaspace: 3321K->3321K(1056768K)], 0.0060700 secs] [Times: user=0.04 sys=0.00, real=0.01 secs] 
```

```kotlin
fun main() {    
	var l:Runnable? = object : Runnable{        
		val v = A(8 * _10MB)        
		override fun run() {            
			Thread(this).start()        
		}    
	}    
	System.gc()    
	l?.run()    
	l = null    
	System.gc()
}

// 0.204: [GC (System.gc()) [PSYoungGen: 5245K->752K(76288K)] 87165K->82680K(251392K), 0.0015822 secs] [Times: user=0.01 sys=0.00, real=0.00 secs] 
// 0.206: [Full GC (System.gc()) [PSYoungGen: 752K->0K(76288K)] [ParOldGen: 81928K->82470K(175104K)] 82680K->82470K(251392K), [Metaspace: 3322K->3322K(1056768K)], 0.0077315 secs] [Times: user=0.04 sys=0.00, real=0.01 secs] 
// 0.214: [GC (System.gc()) [PSYoungGen: 1311K->96K(76288K)] 83781K->82566K(251392K), 0.0018011 secs] [Times: user=0.01 sys=0.00, real=0.00 secs] // 0.216: [Full GC (System.gc()) [PSYoungGen: 96K->0K(76288K)] [ParOldGen: 82470K->82463K(175104K)] 82566K->82463K(251392K), [Metaspace: 3322K->3322K(1056768K)], 0.0064399 secs] [Times: user=0.04 sys=0.00, real=0.01 secs] 
```

这里补充一个疑问，System.gc() 在 JVM 和 Android 中有不同的意义, JVM 中的 gc 是立马触发的， Android 中会判断是否需要 gc，这样会出现有的时候使用 Stystem.gc() 没有成功触发 gc。

```java
// JVM
public static void gc() {    
	Runtime.getRuntime().gc();
}

// Android
public static void gc() {    
	boolean shouldRunGC;    
	synchronized (LOCK) {        
		shouldRunGC = justRanFinalization;        
		if (shouldRunGC) {            
			justRanFinalization = false;        
		} else {            
			runGC = true;        
		}    
	}    
	if (shouldRunGC) {        
		Runtime.getRuntime().gc();    
	}
}
```

# 2.Memory Leaks

内存泄漏的根本原因是对象始终被 GC roots 引用，或者本身作为 GC roots 的对象没有正确置空或者释放导致的，具体到 Android 中，每一个 Activity 和 Fragment 都有自己的生命周期，在其生命周期结束的之后，持有或者被持有的对象如果不能及时释放就会造成内存泄漏，抛去常见的一些情况，这里主要介绍几个在看其他内存泄漏的文章时发现没有被提及的问题。

### Activity 置空的时机

在正确情况下，Activity 作为主线程持有的一个对象，如果不置空的话，就算生命周期结束了也不会被回收，简单的写一个应用链的关系，其中 MainThread 是 gc roots MainThread-> ActivityThread.mActivities -> ActivityClientRecord.activity -> Activity 在 ActivityThread 中有一个 handleDestroyActivity 方法，如下代码所示，后续的一系列操作也有列出代码，所以可以简单理解为调用完 onDestroy 之后，ActivityThread 所持有的 activity 对象就被置空了，相当于 Activity 这个对象对于 gc roots 来说不可达了，所以它会被回收。

```java
// ActivityThreadprivate 
void handleRelaunchActivityInner(...) {
	...    
	handleDestroyActivity(...)        
	r.activity = null;    
	r.window = null;    
	r.hideForNow = false;    
	r.nextIdle = null;    
	...
}

// ActivityThreadpublic
void handleDestroyActivity(...) {    
	...    
	performDestroyActivity(...)    
	...
}

// ActivityThreadActivityClientRecord 
performDestroyActivity(...) {    
	...    
	mInstrumentation.callActivityOnDestroy(r.activity);    
	...
}

// Instrumentationpublic 
void callActivityOnDestroy(Activity activity) {    
	activity.performDestroy();
}

// Activityfinal 
void performDestroy() {
	...
	onDestroy();    
	... 
}
```

### View 中的 Listener 何时被释放

在View中大部分的点击事件都是通过 this 或者匿名内部类传入的，这些东西为什么不会泄露呢？这里继续使用上面说到的引用链 MainThread-> ActivityThread.mActivities -> ActivityClientRecord.activity -> Activity -> decorView -> yourView -> clickListener -> activity / anonymous class object(hold outter object refrence)。但实际执行点击事件的是另一个路径：

```java
private final class PerformClick implements Runnable {    
	@Override    
	public void run() {        
		recordGestureClassification(TOUCH_GESTURE_CLASSIFIED__CLASSIFICATION__SINGLE_TAP);        
		performClickInternal();    
	}
}

public boolean onTouchEvent(MotionEvent event) {
	...    
	if (mPerformClick == null) {        
		mPerformClick = new PerformClick();    
	}    
	
	if (!post(mPerformClick)) {        
		performClickInternal();    
	}
	...
}

private boolean performClickInternal() {    
	...    
	return performClick();
}

public boolean performClick() {    
	...    
	li.mOnClickListener.onClick(this);    
	// mOnClickListener 这个就是我们 set 进来的那个 listener    
	...
}
```

所以在 click 事件中也是有 handler 参与的，在 destroy 的时候不仅将 decor 置 null，还通过 removeViewImmediate 移除了 view 中绑定这些 handler 事件，下面是流程

```java
// ActivityThreadpublic 
void handleDestroyActivity(...) {    
	...    
	performDestroyActivity(...)    
	...    
	wm.removeViewImmediate(v);    
	...    
	r.activity.mDecor = null;
}

// WindowManagerImplpublic 
void removeViewImmediate(View view) {    
	mGlobal.removeView(view, true);
}

// WindowManagerGlobalpublic 
void removeView(View view, boolean immediate) {    
	...    
	removeViewLocked(index, immediate);    
	...
}

// WindowManagerGlobalprivate 
void removeViewLocked(int index, boolean immediate) {    
	...    
	boolean deferred = root.die(immediate);    
	...
}

// ViewRootImpl
boolean die(boolean immediate) {
  ...
  doDie();
  ...
}

// ViewRootImpl
void doDie() {
  ...    
	dispatchDetachedFromWindow();
  ...
}

// ViewRootImpl
void dispatchDetachedFromWindow() {
  ...    
	mView.dispatchDetachedFromWindow();
  ...
}

// View
void dispatchDetachedFromWindow() {
  ...    
	onDetachedFromWindowInternal();
  ...
}

// View
protected void onDetachedFromWindowInternal() {
  ...    
	removePerformClickCallback();
  ...}

// View
private void removePerformClickCallback() {
  if (mPerformClick != null) {
	  removeCallbacks(mPerformClick);
  }
}

// View
public boolean removeCallbacks(Runnable action) {  
  if (action != null) {  
    final AttachInfo attachInfo = mAttachInfo;        
		if (attachInfo != null) {
       attachInfo.mHandler.removeCallbacks(action);
	     attachInfo.mViewRootImpl.mChoreographer.removeCallbacks(Choreographer.CALLBACK_ANIMATION, action, null);
    }        
		getRunQueue().removeCallbacks(action);    
	}    
	return true;
}
```

### Handler 泄漏

分析了前面两种情况，就开始怀疑了，那 Handler 和 ClickListener 的情况明明相同，为什么 Handler 会泄漏呢。

下面是一个典型的 Handler 泄漏路径，从图中可以看到 gc root 是 input or output parameters in native code，这个提示来自 LeakCanary 的 NativeStack，表示泄漏来自于 native 的入参或者出参，由于 MessageQueue 使用了一些 JNI 方法，JNI 方法在调用的时候会传入当前 class 对象或者 方法所属对象，图中的提示来看，应该是 MessageQueue 被传入了，在最开始有说过 JNI 的参数也是 gc root 的一种，这种泄漏大多数情况是由于 postdelay 导致的，也有少部分情况是普通的 post 但是由于前面消息的堆积，导致在 LeakCanary 在检查的时候还没有执行完，所以泄漏了。但是不管哪一种，这两种 Handler 的泄漏都有崩溃的可能，因为通常 post 或者 postDelay 都要处理 UI 相关的东西，但实际上已经 destroy 了，这时候处理 UI 如果没有 nullsafe 肯定是必崩了。

![GC%20roots%20&%203c5e7/Untitled.png](image_1.png)

这里有一个 Java 和 Kotlin 的区别，我在 [StackOverflow](https://stackoverflow.com/a/62606529/2958780)上也做了回答，简单来说就是如果是用 Kotlin 的话如下代码是不会引用到外部类的，所以就算使用这个 handler1 去 postDelay 也不会导致泄漏。如果里面引用了外部类的方法，那么就会持有外部类了。

```kotlin
val handler1: Handler = object : Handler() {    
	override fun handleMessage(msg: Message?) {        
		super.handleMessage(msg)        
		println("Hello~1")    
	}
}

// 反编译后的代码
public static final class MainActivity$onCreate$handler1$1 extends Handler {    
	public void handleMessage(@Nullable final Message msg) {        
		super.handleMessage(msg);        
		Log.e("LOG", "Hello~1");    
	}
}

val handler2 = Handler(object : Handler.Callback {    
	override fun handleMessage(msg: Message): Boolean {        
		println("Hello~2")        
		test()    // outter class method        
		return false    
	}
})

// 反编译后的代码
public static final class MainActivity$onCreate$handler2$1 implements Handler$Callback {    
	public boolean handleMessage(@NotNull final Message msg) {        
		Intrinsics.checkParameterIsNotNull((Object)msg, "msg");        
		Log.e("LOG", "Hello~2");        
		this.this$0.test();        
		return false;    
	}
}

```

如果这段逻辑是 Java 写的，就算里面没有用到外部类的方法也会持有外部类的引用。

```java
Handler handler1 = new Handler() {    
	@Override    
	public void handleMessage(Message msg) {        
		super.handleMessage(msg);        
		Log.e("LOG", "Hello~1");    
	}
};

// 反编译代码
class TestLeakActivity$1 extends Handler {    
	TestLeakActivity$1(TestLeakActivity this$0) {        
		this.this$0 = this$0;    
	}    
	
	public void handleMessage(Message msg) {        
		super.handleMessage(msg);        
		Log.e("LOG", "Hello~1");    
	}
}
```

### 为什么 RxJava 需要 AutoDispose

经过上面的分析，其实结论已经比较清晰，RxJava 方便的切线程能力会让整个流上的对象在不同的线程里切来切去，而线程又是 gc root，很容易泄漏，所以对 AutoDispose 算是刚需，否则每个流都要保存一个 disposable 对象，最后在 destroy 的时候挨个 dispose 也太麻烦了。

# 3.总结

内存泄漏更像是不那么良好的编程习惯导致的，例如最开始的例子，方法中 new 了以个大对象，可能在方法开始的几行还在使用，如果后面不用到的话可以及时置 null，这样不会在方法执行完之后导致一次 gc 太多东西提升gc效率，在 Android 的虚拟机中没有类似 JVM 中的并发 gc，所以 gc 还是要不可避免的导致暂停进而影响一部分性能

# 4.Reference

[利用Android Studio、MAT对Android进行内存泄漏检测](https://joyrun.github.io/2016/08/08/AndroidMemoryLeak/)

[Java 垃圾回收机 GC Roots详解（Garbage Collection Roots）_Never Give up!-CSDN博客](https://blog.csdn.net/u013270444/article/details/90476591)

[Understanding Java Garbage Collection](https://medium.com/platform-engineer/understanding-java-garbage-collection-54fc9230659a)

[GC roots](https://www.yourkit.com/docs/java/help/gc_roots.jsp)

[java的gc为什么要分代？](https://www.zhihu.com/question/53613423/answer/135743258)

[理解GC日志](https://mingshan.fun/2018/04/17/gc-log/)

[Can this code avoid the Android handler memory leak?](https://stackoverflow.com/questions/52286818/can-this-code-avoid-the-android-handler-memory-leak/62606529#62606529)
