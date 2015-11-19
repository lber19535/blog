---
title:        "DataBinding 快速入门"
date:         2015-11-15 17:00
categories:   Android
list_number:  false
---

DataBinding 发布有一段时间了，官方的库也逐渐稳定，这里参考了官方的[文档](https://developer.android.com/tools/data-binding/guide.html)以及一些其他资料，希望对 DataBinding 的使用有一个较为全面的认识。

<!--more-->

## 1.编译环境
**首先**，需要一个版本号为 1.3.0 以上的 AndroidStudio。
**其次**，需要在 gradle 脚本中加入一些插件。
```java
apply plugin: 'com.android.databinding'

classpath 'com.android.tools.build:gradle:1.5.0'
classpath 'com.android.databinding:dataBinder:1.0-rc4'
```
到目前为止 gradle plugin 版本是 1.5.0， dataBinder 版本是 1.0-rc4。这里不建议使用加号代替具体的版本号，推荐使用一个具体的版本号。这里提供了代码仓库的网站可供查找库的最新版本 [gradle build plugin jcenter](https://bintray.com/android/android-tools/com.android.tools.build.gradle/view) 和 [data binding lib](https://bintray.com/android/android-tools/com.android.databinding.dataBinder/view)。同时这个功能向前兼容到 Android 2.1。

到现在这个东西还在 beta 版本，官方的 guide 的也是有阵子没更新了，文档中提到的 gradle 中要加 databinding 的 enable 选项，现在不需要加了。写这篇文章使用的 Android Studio 1.5 Beta，对databinding 的代码提示和 UI 预览还不是很完善。

## 2.绑定布局文件
DataBinding 的作用是自动绑定布局文件和代码中的变量，省去了自己写代码区操作 UI 的普通操作。

### 2.1 布局文件写法
在布局文件中引入了 data 标签和 variable 标签，用来定义变量。

```xml
<?xml version="1.0" encoding="utf-8"?>
<layout xmlns:android="http://schemas.android.com/apk/res/android">
   <data>
       <variable name="user" type="com.example.User"/>
   </data>
   <LinearLayout
       android:orientation="vertical"
       android:layout_width="match_parent"
       android:layout_height="match_parent">
       <TextView android:layout_width="wrap_content"
           android:layout_height="wrap_content"
           android:text="@{user.firstName}"/>
       <TextView android:layout_width="wrap_content"
           android:layout_height="wrap_content"
           android:text="@{user.lastName}"/>
   </LinearLayout>
</layout>
```
variable name 表示变量的名称，type 表示变量类型。然后就可以在 layout 中使用这个变量了。

### 2.2 绑定的对象
前面绑定的对象是：
```java
public class User {
   public final String firstName;
   public final String lastName;
   public User(String firstName, String lastName) {
       this.firstName = firstName;
       this.lastName = lastName;
   }
}
```
或者写成 JavaBean 的形式：
```java
public class User {
   private final String firstName;
   private final String lastName;
   public User(String firstName, String lastName) {
       this.firstName = firstName;
       this.lastName = lastName;
   }
   public String getFirstName() {
       return this.firstName;
   }
   public String getLastName() {
       return this.lastName;
   }
}
```
如果是第一种形式，则 android:text 中 调用的 @{user.firstName} 就是 firstName 这个变量，如果是第二种形式，那么调用的就是 getFirstName()。

### 2.3 开始绑定
接下来就可以开始绑定了，我们的目标是将 Java 中的对象 User 和 layout 中的用到 user 绑定起来：
```java
@Override
protected void onCreate(Bundle savedInstanceState) {
   super.onCreate(savedInstanceState);
   MainActivityBinding binding = DataBindingUtil.setContentView(this, R.layout.main_activity);
   User user = new User("Test", "User");
   binding.setUser(user);
}
```
databinding 的插件会根据 layout 的名字生成对应的 binding，例如这里的 layout 是 main_activity，则会生成 MainActivityBinding。当然，这个自动生成的类名可以指定，后面会讲到。
下面几种不同的写法，可以用于 Fragment 中和 listitem 中：
```java
MainActivityBinding binding = MainActivityBinding.inflate(getLayoutInflater());

ListItemBinding binding = ListItemBinding.inflate(layoutInflater, viewGroup, false);
//or
ListItemBinding binding = DataBindingUtil.inflate(layoutInflater, R.layout.list_item, viewGroup, false);
```

### 2.4 绑定事件
绑定事件算是对之前 android:onClick 属性的加强：
```java
public class MyHandlers {
    public void onClickFriend(View view) { ... }
    public void onClickEnemy(View view) { ... }
}
```
```xml
<?xml version="1.0" encoding="utf-8"?>
<layout xmlns:android="http://schemas.android.com/apk/res/android">
   <data>
       <variable name="handlers" type="com.example.Handlers"/>
       <variable name="user" type="com.example.User"/>
   </data>
   <LinearLayout
       android:orientation="vertical"
       android:layout_width="match_parent"
       android:layout_height="match_parent">
       <TextView android:layout_width="wrap_content"
           android:layout_height="wrap_content"
           android:text="@{user.firstName}"
           android:onClick="@{user.isFriend ? handlers.onClickFriend : handlers.onClickEnemy}"/>
       <TextView android:layout_width="wrap_content"
           android:layout_height="wrap_content"
           android:text="@{user.lastName}"
           android:onClick="@{user.isFriend ? handlers.onClickFriend : handlers.onClickEnemy}"/>
   </LinearLayout>
</layout>
```
databinding 增加了对条件表达式的支持，使得绑定事件更加灵活，条件表达式后面有一节会讲到表达式的语法。

## 3.布局文件进阶
这一部分是 layout 中涉及到的 databinding 更为详细的东西。

### 3.1 Import
import 的作用和 java 中的 import 一样，默认情况下 databinding 已经包含了 String，所以不用自己 import String，但是别的就需要 import了。
```xml
<data>
    <import type="android.view.View"/>
</data>
```
现在配合条件表达式就可以根据对象的状态控制 View 的状态：
```xml
<!--beta 版本对条件表达式语法支持还不够好，这里 IDE 会提示错误，但是编译不会报错-->
<TextView
   android:text="@{user.lastName}"
   android:layout_width="wrap_content"
   android:layout_height="wrap_content"
   android:visibility="@{user.isAdult() ? View.VISIBLE : View.GONE}"/>
```
还可以 import 集合：
```xml
<data>
    <import type="com.example.User"/>
    <import type="java.util.List"/>
    <variable name="user" type="User"/>
    <variable name="userList" type="List<User>"/>
</data>
```

还可以导入静态方法：
```xml
<data>
    <import type="com.example.MyStringUtils"/>
    <variable name="user" type="com.example.User"/>
</data>
…
<TextView
   android:text="@{MyStringUtils.capitalize(user.lastName)}"
   android:layout_width="wrap_content"
   android:layout_height="wrap_content"/>
```

如果类名重复了还可以起别名：
```xml
<import type="android.view.View"/>
<import type="com.example.real.estate.View"
        alias="Vista"/>
```

### 3.2 变量
variable 标签需要在 data 下使用：
```xml
<data>
    <import type="android.graphics.drawable.Drawable"/>
    <variable name="user"  type="com.example.User"/>
    <variable name="image" type="Drawable"/>
    <variable name="note"  type="String"/>
</data>
```
这些变量会在编译期受到检查，如果是 [Observable](https://developer.android.com/reference/android/databinding/Observable.html) 或者是 [Observable Collections](https://developer.android.com/tools/data-binding/guide.html#observable_collections) 对象，则会变成双向绑定，从名字可以看出来是通过观察者实现的。如果只是一个普通的对象，那么则是一个单向绑定。

当相同的 layout 文件使用同样的变量名时会冲突。例如横屏和竖屏是两个 layout 文件夹，但是里面要显示的内容相同，这就需要起不同的变量名，因为 databinding 会将同一个 layout 文件夹下的变量合并到一个文件里。

### 3.3 自定义绑定类名
如果对自动生成的类名不满意，可以自定义类的名称：
```xml
<data class="ContactItem">
    ...
</data>
```
这样写的话会生成的类会放到 {$packagename}.databinding 的目录中，例如 com.example.databinding。
如果是下面这种加个点，则会放到包名目录下，例如 com.example。
```xml
<data class=".ContactItem">
    ...
</data>
```
当然也可以使用包名加类名的形式：
```xml
<data class="com.example.ContactItem">
    ...
</data>
```

### 3.4 布局文件的 include
variable 可以通过 include 标签传递传递到他的 layout 中，首先要引入 bind 域，然后 bind 之后跟的一个变量的名字，要求当前 xml，include 的 layout 要有同样的名字的 variable，bind 跟的名字也要一样。

```xml
<?xml version="1.0" encoding="utf-8"?>
<layout xmlns:android="http://schemas.android.com/apk/res/android"
        xmlns:bind="http://schemas.android.com/apk/res-auto">
   <data>
       <variable name="user" type="com.example.User"/>
   </data>
   <LinearLayout
       android:orientation="vertical"
       android:layout_width="match_parent"
       android:layout_height="match_parent">
       <include layout="@layout/name"
           bind:user="@{user}"/>
       <include layout="@layout/contact"
           bind:user="@{user}"/>
   </LinearLayout>
</layout>
```

绑定不支持根标签为 merge 的布局，例如下面这样：
```xml
<?xml version="1.0" encoding="utf-8"?>
<layout xmlns:android="http://schemas.android.com/apk/res/android"
        xmlns:bind="http://schemas.android.com/apk/res-auto">
   <data>
       <variable name="user" type="com.example.User"/>
   </data>
   <merge>
       <include layout="@layout/name"
           bind:user="@{user}"/>
       <include layout="@layout/contact"
           bind:user="@{user}"/>
   </merge>
</layout>
```

### 3.5 表达式语法
支持语法和 Java 相同：
* Mathematical + - / * %
* String concatenation +
* Logical && ||
* Binary & | ^
* Unary + - ! ~
* Shift >> >>> <<
* Comparison == > < >= <=
* instanceof
* Grouping ()
* Literals - character, String, numeric, null
* Cast
* Method calls
* Field access
* Array access []
* Ternary operator ?:

```xml
android:text="@{String.valueOf(index + 1)}"
android:visibility="@{age &lt; 13 ? View.GONE : View.VISIBLE}"
android:transitionName='@{"image_" + id}'
```

不支持的语法：
* this
* super
* new
* Explicit generic invocation (不支持泛型方法)

例如：

```java
public class StringUtils {
    public static <T> String generic(T t){
        return t.toString();
    }
}
```

```xml
<TextView
    android:text="@{StringUtils.<User>generic(user)}"
    android:layout_width="wrap_content"
    android:layout_height="wrap_content"/>
<TextView
    android:text="@{StringUtils.generic(user)}"
    android:layout_width="wrap_content"
    android:layout_height="wrap_content"/>
```
这些调用泛型的方法会在编译期报错，如果想调用的话可以这样做：
```java
public class StringUtils {
    public static <T> String generic(T t){
        return t.toString();
    }
    public static String g(Object o){
        return generic(o);
    }
}
```
```xml
<TextView
    android:text="@{StringUtils.g(user)}"
    android:layout_width="wrap_content"
    android:layout_height="wrap_content"/>
```

**判断是否为 null**

```xml
android:text="@{user.displayName ?? user.lastName}"
<!-- 两句等价 -->
android:text="@{user.displayName != null ? user.displayName : user.lastName}"
```

**属性引用**

```xml
android:text="@{user.lastName}"
```
如果 user 为 null，那么这个 text 将会是 null，但是不会报错，如果是基本类型，则会和 java 中一样给一个默认初始值，例如 int 的话会是0。

**集合**
先上示例代码：
```xml
<data>
    <import type="android.util.SparseArray"/>
    <import type="java.util.Map"/>
    <import type="java.util.List"/>
    <variable name="list" type="List&lt;String>"/>
    <variable name="sparse" type="SparseArray&lt;String>"/>
    <variable name="map" type="Map&lt;String, String>"/>
    <variable name="index" type="int"/>
    <variable name="key" type="String"/>
</data>
…
android:text="@{list[index]}"
…
android:text="@{sparse[index]}"
…
android:text="@{map[key]}"
```
写法比较简单，需要注意的是 &amp;lt; 代表了左括号，前面表达式语法里也有用到，目前不知道为啥要写成这样，但是如果写成 < 符号编译会报错。Java 中的代码也很简单：

```java
binding.setList(TEST_STR_LIST);

public void onListChange(View v){
    binding.setIndex(new Random().nextInt(TEST_STR_LIST.size()));
}
```
当通过 binding 修改 index 的值的时候，对应的 text 也会跟着改变。

然后是资源文件：
```xml
android:padding="@{large? @dimen/largePadding : @dimen/smallPadding}"
android:text="@{@string/nameFormat(firstName, lastName)}"
android:text="@{@plurals/banana(bananaCount)}"
```


## 4.双向绑定

### 4.1 Observable 对象

### 4.2 ObservableField

### 4.3 Observable 集合

## 5.绑定Class的生成
创建的方法
### 5.1 View 和 ID 的绑定

### 5.2 变量的绑定

### 5.3 ViewStub

### 5.4 绑定的高级用法

## 6.Attribute Setters

### 6.1 Automatic Setters

### 6.2 Renamed Setters

### 6.3 Custom Setters


## 7.Converters

### 7.1 对象的转换

### 7.2 自定义转换