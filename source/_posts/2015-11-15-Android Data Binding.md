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

到现在这个东西还在 beta 版本，官方的 guide 的也是有阵子没更新了，文档中提到的 gradle 中要加 databinding 的 enable 选项，现在不需要加了。写这篇文章使用的 Android Studio 1.5，对databinding 的代码提示和 UI 预览还不是很完善。

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
双向绑定使用 Observable 来实现。

### 4.1 Observable 对象
要继承 BaseObservable，对需要双向绑定的变量的 getter 方法加 Bindable 注解，并且在 setter 方法中通知该变量发生改变。其中 BR 和 R 文件一样，是对绑定对象的一个引用，例如这里的 BR.firstName。

```java
private static class User extends BaseObservable {
   private String firstName;
   private String lastName;
   @Bindable
   public String getFirstName() {
       return this.firstName;
   }
   @Bindable
   public String getLastName() {
       return this.lastName;
   }
   public void setFirstName(String firstName) {
       this.firstName = firstName;
       notifyPropertyChanged(BR.firstName);
   }
   public void setLastName(String lastName) {
       this.lastName = lastName;
       notifyPropertyChanged(BR.lastName);
   }
}
```
### 4.2 ObservableField

效果和前面的一样就是写法不太一样：
```java
private static class User {
   public final ObservableField<String> firstName =
       new ObservableField<>();
   public final ObservableField<String> lastName =
       new ObservableField<>();
   public final ObservableInt age = new ObservableInt();
}
```
databinding 提供了一整套的这种东西：ObservableField，ObservableBoolean，ObservableByte，ObservableChar，ObservableShort，ObservableInt，ObservableLong，ObservableFloat，ObservableDouble，和 ObservableParcelable。他们都继承自 BaseObserable。

### 4.3 Observable 集合

和上一节类似：
```java
ObservableArrayMap<String, Object> user = new ObservableArrayMap<>();
user.put("firstName", "Google");
user.put("lastName", "Inc.");
user.put("age", 17);
```

```xml
<data>
    <import type="android.databinding.ObservableMap"/>
    <variable name="user" type="ObservableMap&lt;String, Object>"/>
</data>
…
<TextView
   android:text='@{user["lastName"]}'
   android:layout_width="wrap_content"
   android:layout_height="wrap_content"/>
<TextView
   android:text='@{String.valueOf(1 + (Integer)user["age"])}'
   android:layout_width="wrap_content"
   android:layout_height="wrap_content"/>
```
这样更换不同的 map 就可以更换 TextView 中显示的内容。

除了 map 还有 ObservableArrayList：
```java
ObservableArrayList<Object> user = new ObservableArrayList<>();
user.add("Google");
user.add("Inc.");
user.add(17);
```

```xml
<data>
    <import type="android.databinding.ObservableList"/>
    <import type="com.example.my.app.Fields"/>
    <variable name="user" type="ObservableList&lt;Object>"/>
</data>
…
<TextView
   android:text='@{user[Fields.LAST_NAME]}'
   android:layout_width="wrap_content"
   android:layout_height="wrap_content"/>
<TextView
   android:text='@{String.valueOf(1 + (Integer)user[Fields.AGE])}'
   android:layout_width="wrap_content"
   android:layout_height="wrap_content"/>
```
这里的 Fields.AGE 是写在 java 代码中的 int 值。另外需要注意的就是 **&amplt;** 左括号写法。

以上示例代码放到了 [github](https://github.com/lber19535/AndroidDemo/tree/master/app/src/main/java/com/exmaple/bill/databinding) 中，目前来看有一些小问题，例如 import 要放到 data 内的开始，不能和变量混着写，会导致 import 失败进而导致编译错误。

## 5.绑定Class的生成
binding 类的的生成是自动的，生成的类继承自 [ViewDataBinding](https://developer.android.com/reference/android/databinding/ViewDataBinding.html)。

下面是一个简单的写法，将 inflater 绑定到对应的 binding 上。
```java
MyLayoutBinding binding = MyLayoutBinding.inflate(layoutInflater);
MyLayoutBinding binding = MyLayoutBinding.inflate(layoutInflater, viewGroup, false);
```

也可以这样：
```java
MyLayoutBinding binding = MyLayoutBinding.bind(viewRoot);
```

更多的时候是通过 [DataBindingUtil](https://developer.android.com/reference/android/databinding/DataBindingUtil.html) 来创建 binding：
```java
ViewDataBinding binding = DataBindingUtil.inflate(LayoutInflater, layoutId,
    parent, attachToParent);
ViewDataBinding binding = DataBindingUtil.bindTo(viewRoot, layoutId);
```

### 5.1 View 和 ID 的绑定
每一个带 id 的 view 都会对应一个 public final 的值，例如：
```xml
<TextView
            android:id="@+id/bindViewId"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
/>
```
则在 java 中则会有对应的 TextView 在 binding 中生成，当然 view 的 id 不是必须的，如果你不准备这样使用，那么就不需要给他加 id，编译的时候会自动生成一个 id 用于 binding 内部使用。
例如会生成如下的代码：
```java
package com.exmaple.bill.databinding;
import com.exmaple.bill.R;
import com.exmaple.bill.BR;
import android.view.View;
public class ActivityBasicBinding extends android.databinding.ViewDataBinding {
    
    private static final android.databinding.ViewDataBinding.IncludedLayouts sIncludes;
    private static final android.util.SparseIntArray sViewsWithIds;
    static {
        sIncludes = new android.databinding.ViewDataBinding.IncludedLayouts(7);
        sIncludes.setIncludes(0, 
            new String[] {"layout_databinding_basic"},
            new int[] {5},
            new int[] {R.layout.layout_databinding_basic});
        sViewsWithIds = new android.util.SparseIntArray();
        sViewsWithIds.put(R.id.bindViewId, 6);
    }
    // views
    public final android.widget.TextView bindViewId;
    private final android.widget.LinearLayout mboundView0;
    private final com.exmaple.bill.databinding.LayoutDatabindingBasicBinding mboundView01;
    private final android.widget.TextView mboundView1;
    private final android.widget.TextView mboundView2;
    private final android.widget.TextView mboundView3;
    private final android.widget.TextView mboundView4;
    ...
} 
```
从代码中可以看到设置了 id 的 view 会按照 id 来生成对应变量，并且设置为 public，如果没有设置 id，则会自动生成一个 mboundView1 之类的私有成员。
```java
binding.bindViewId.setText("bind view id");
```

### 5.2 变量的绑定
每一个变量都会生成一个 setter 和 getter 方法：
```java
public boolean setVariable(int variableId, Object variable) {
    switch(variableId) {
        case BR.user :
            setUser((com.exmaple.bill.databinding.model.User) variable);
            return true;
        case BR.list :
            setList((java.util.List<java.lang.String>) variable);
            return true;
        case BR.index :
            setIndex((int) variable);
            return true;
    }
    return false;
}
```
在 setVariable 方法中统一设置变量的值。

### 5.3 ViewStub
xml 的写法还是和以前一样：
```xml
<ViewStub
    android:layout_width="wrap_content"
    android:layout_height="wrap_content"
    android:id="@+id/view_stub"
    android:layout="@layout/layout_databinding_basic"/>
```
binding 会生成一个对应 id 的 [ViewStubProxy](https://developer.android.com/reference/android/databinding/ViewStubProxy.html)。然后再需要 inflate 的时候使用 proxy 获取到真正的 viewstub：
```java
binding.viewStub.setOnInflateListener(new ViewStub.OnInflateListener() {
      @Override
      public void onInflate(ViewStub stub, View inflated) {
          LayoutDatabindingBasicBinding b = DataBindingUtil.bind(inflated);
          User u = new User("Lei", "Feng");
          b.setUser(u);
      }
});

public void onShowViewStub(View v) {
     if (!binding.viewStub.isInflated()){
         binding.viewStub.getViewStub().inflate();
     }
}
```
Android Studio 1.5 对这个支持还比较渣，使用 ViewStubProxy 居然都会报错，好在编译没有问题。

### 5.4 绑定的高级用法
这部分是其他一些方法的使用，例如在 RecyclerView 中的使用。
```java
class Holder extends RecyclerView.ViewHolder{
    ListItemNameBinding binding;

    public Holder(View itemView) {
        super(itemView);
    }

    public void setBinding(ListItemNameBinding bind){
        this.binding = bind;
    }

    public ListItemNameBinding getBinding() {
        return binding;
    }
}

@Override
public Holder onCreateViewHolder(ViewGroup parent, int viewType) {
    ListItemNameBinding binding =  DataBindingUtil.inflate(LayoutInflater.(parent.getContext()), R.layout.list_item_name, parent, false);
    Holder holder = new Holder(binding.getRoot());
    holder.setBinding(binding);
    return holder;
}
@Override
public void onBindViewHolder(Holder holder, int position) {
    holder.getBinding().setUser(userList.get(position));
}
```
主要是 binding 的传递，并且简化了给 view 的赋值。

## 6.Attribute Setters
自定义 View 的各种属性。

### 6.1 Automatic Setters
自动设置算是一个比较常用的方法：
```xml
<?xml version="1.0" encoding="utf-8"?>
<layout xmlns:android="http://schemas.android.com/apk/res/android"
        xmlns:app="http://schemas.android.com/apk/res-auto">

    <LinearLayout
        android:layout_width="match_parent"
        android:layout_height="match_parent"
        android:orientation="vertical">

        <Button
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:text="on attribute click"
            app:OnClickListener="@{activity.listener}"/>

    </LinearLayout>

    <data>

        <import type="com.exmaple.bill.databinding.ui.ActivityAttribute"/>

        <variable
            name="activity"
            type="ActivityAttribute"/>
    </data>
</layout>
```
```java
public class ActivityAttribute extends AppCompatActivity {

    public View.OnClickListener listener = new View.OnClickListener() {
        @Override
        public void onClick(View v) {
            Toast.makeText(ActivityAttribute.this,"OPS !!",Toast.LENGTH_SHORT).show();
        }
    };

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        ActivityDatabindingAttributeBinding bind = DataBindingUtil.setContentView(this, R.layout.activity_databinding_attribute);
        bind.setActivity(this);
    }
}
```
首先 Activity 中有一个 listener 变量，在 xml 中拿到 activity 的引用，通过 app 的域来自动绑定对应属性。这个特性的好处在于可以对域（也就是styleable）中没有的属性进行设置，只要有对应的 setter 方法就行。


### 6.2 Renamed Setters
这个现在貌似没法用，编译不过，以后正式发布了再试下，这里只记录下文档说的方法：
```java
@BindingMethods({
       @BindingMethod(type = "android.widget.ImageView",
                      attribute = "android:tint",
                      method = "setImageTintList"),
})
```
这个注解用于类，BindingMethods 内必须至少有一个 BindingMethod。这个注解可以重定义属性对应的 setter 方法，例如这个例子中 android:tint 对应的方法是 setImageTintList()，而并不是 settint()。

### 6.3 Custom Setters
这个用法用于将 xml 中自定义的属性和 java code 绑定在一起，而不用写 styleable。下面是一个完整的例子：
```java
public class NameCard extends LinearLayout {
    private int mAge;

    private TextView mFirstName;
    private TextView mLastName;

    public NameCard(Context context) {
        this(context, null);
    }

    public NameCard(Context context, AttributeSet attrs) {
        this(context, attrs, 0);
    }

    public NameCard(Context context, AttributeSet attrs, int defStyleAttr) {
        super(context, attrs, defStyleAttr);
        init();
    }

    private void init() {
        inflate(getContext(), R.layout.layout_name_card, this);
        mFirstName = (TextView) findViewById(R.id.first_name);
        mLastName = (TextView) findViewById(R.id.last_name);
    }

    public void setFirstName(@NonNull final String firstName) {
        mFirstName.setText(firstName);
    }

    public void setLastName(@NonNull final String lastName) {
        mLastName.setText(lastName);
    }

}
```
java 类中定义了 setter 和 getter 方法，所以可以直接在 xml 中使用：

```xml
<?xml version="1.0" encoding="utf-8"?>
<layout xmlns:android="http://schemas.android.com/apk/res/android"
        xmlns:app="http://schemas.android.com/apk/res-auto">

    <LinearLayout
        android:layout_width="match_parent"
        android:layout_height="match_parent"
        android:orientation="vertical">

        <Button
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:text="on attribute click"
            app:OnClickListener="@{activity.listener}"/>

        <com.exmaple.bill.databinding.NameCard
            android:text="my view"
            app:firstName="@{@string/firstName}"
            app:lastName="@{@string/lastName}"
            app:imageUrl="@{imageUrl}"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"/>

    </LinearLayout>

    <data>

        <import type="com.exmaple.bill.databinding.ui.ActivityAttribute"/>

        <variable
            name="activity"
            type="ActivityAttribute"/>
        <variable
            name="imageUrl"
            type="String"/>
    </data>
</layout>
```
这里的 app:firstName 和 app:lastName 是会调用 NameCard 中的 setter 方法。而 app:imageUrl 会调用 java code 中的通过 BindingAdapter 绑定的方法：
```java
public class ActivityAttribute extends AppCompatActivity {

    public View.OnClickListener listener = new View.OnClickListener() {
        @Override
        public void onClick(View v) {
            Toast.makeText(ActivityAttribute.this,"OPS !!",Toast.LENGTH_SHORT).show();
        }
    };

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        ActivityDatabindingAttributeBinding bind = DataBindingUtil.setContentView(this, R.layout.activity_databinding_attribute);
        bind.setActivity(this);
        bind.setImageUrl("xxxx");
    }

    @BindingAdapter({"xxx:imageUrl"})
    public static void loadImage(NameCard view, String url) {
        Toast.makeText(App.getAppContext(),"load img success",Toast.LENGTH_SHORT).show();
    }
}
```
绑定的方法需要几个注意的地方：
* 必须是 public static 的方法。
* 方法名无所谓
* @BindingAdapter({"xxx:imageUrl"}) 中 xxx 的部分是随意写的，例如可以写成 app:imageUrl 或 bind:xxx:imageUrl 之类的都可以，不必要和 xml 中定义的相同。
* app:firstName，app:lastName，app:imageUrl 的值必须是引用资源文件或者 java 传的对象，而不能直接写作 app:imageUrl="xxx"。
* 方法的第一个参数必须是要绑定的 View 或布局，例如这里要绑定 NameCard 这个 View，就需要把它放到参数的第一个，后面的参数列表顺序是和 BindingAdapter 注解中的顺序是一样的。

## 7.Converters
类型转换这部分是讲对象的类型是会被自动转换。
### 7.1 对象的转换
例如，这里的 userMap 的泛型是 <String, Object>，这里 text 属性中拿到的值本来是 object，但是 text 赋值的时候是用 setText(CharSequence cs) 这个方法，所以 object 类型在方法这里就被自动转换为 CharSequence 了。
```xml
<TextView
   android:text='@{userMap["lastName"]}'
   android:layout_width="wrap_content"
   android:layout_height="wrap_content"/>
```

### 7.2 自定义转换
这里 background 需要的一个 Drawable，但是 color 是个 int，所以需要转换成 Drawable。
```xml
<View
   android:background="@{isError ? @color/red : @color/white}"
   android:layout_width="wrap_content"
   android:layout_height="wrap_content"/>
```
转换方法：
```java
@BindingConversion
public static ColorDrawable convertColorToDrawable(int color) {
   return new ColorDrawable(color);
}
```

**~~以上是文档说法，但是在 databinding 1.0rc4 这个版本上尝试的时候，不需要这个 conver 方法就可以成功设置背景，加了这个方法反而设置不成功了。而且打印了 log 也看到确实走了这个方法。~~**

update 2015.12.4
最新版的 Android Studio 这个功能已经正常。

## 8.总结
本文以及部分 Demo 参考了[官方文档](https://developer.android.com/tools/data-binding/guide.html)和 [MasteringAndroidDataBinding](https://github.com/LyndonChin/MasteringAndroidDataBinding)，完整的 Demo 放在了我的 [github](https://github.com/lber19535/AndroidDemo/tree/master/app/src/main/java/com/exmaple/bill/databinding) 上。


update 2015.11.25
在最新的 Android Studio 2.0 preview 中终于可以显示正常而不是提示语法有问题了。