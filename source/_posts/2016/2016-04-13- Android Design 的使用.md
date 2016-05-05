---
title:        "Android Design 的使用"
date:         2016-04-13 17:00
categories:   Android
list_number:  false
tags:
- Android
---

学习了 Android Design Support 和 Appcompat 中的一些 widget，这里做个记录。
<!--more-->

## 1.TextInputLayout
这个控件式 Android Design 中的，用来给 EditText 加一个浮动的 hint 动画，TextInputLayout 本身是个 LinearLayout，其中包含了几个 TextView，分别用来显示 float hint、error 和 counter，另外包含一个 EditText 用来做输入。

下面是效果：
![TextInputLayout](http://7xisp0.com1.z0.glb.clouddn.com/text_input_layout.gif)

基本的用法是下面这样：

```xml
<android.support.design.widget.TextInputLayout
         android:layout_width="match_parent"
         android:layout_height="wrap_content">

     <android.support.design.widget.TextInputEditText
             android:layout_width="match_parent"
             android:layout_height="wrap_content"
             android:hint="@string/form_username"/>

</android.support.design.widget.TextInputLayout>
```

如果需要适配 api19 之前的需要分开写两个 style：
```xml
<--! styles.xml-->
<style name="LoginInputTextStyle" parent="Widget.Design.TextInputLayout">
    <item name="colorControlNormal">@color/indicator_hint</item>
    <item name="colorControlActivated">@color/indicator_hint</item>
    <item name="colorControlHighlight">@color/indicator_hint</item>
</style>
```

```xml
<--! values-v21/styles.xml-->
<style name="LoginInputTextStyle" parent="Widget.Design.TextInputLayout">
    <item name="android:colorControlActivated">@color/white</item>
    <item name="android:colorControlHighlight">@color/white</item>
    <item name="android:colorControlNormal">@color/white</item>
</style>
```
同时还可以对 hint 、error 和 counter 进行定义，我们来看下源码中对 TextInputLayout style 的设置，从下面的 style 中可以发现对应的效果需要继承的 style，我们可以通过看系统原生定义来写我们自己的 style 
```xml
<style name="Widget.Design.TextInputLayout" parent="android:Widget">
     <item name="hintTextAppearance">@style/TextAppearance.Design.Hint</item>
     <item name="errorTextAppearance">@style/TextAppearance.Design.Error</item>
     <item name="counterTextAppearance">@style/TextAppearance.Design.Counter</item>
     <item name="counterOverflowTextAppearance">@style/TextAppearance.Design.Counter.Overflow</item>
</style>
```

另外代码部分就比较简单：
```java
public class ActivityTextInput extends AppCompatActivity {

    @Bind(R.id.text_input)
    TextInputLayout textInputLayout;

    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_text_input);
        ButterKnife.bind(this);

        textInputLayout.getEditText().addTextChangedListener(new TextWatcher() {
            @Override
            public void beforeTextChanged(CharSequence s, int start, int count, int after) {

            }

            @Override
            public void onTextChanged(CharSequence s, int start, int before, int count) {
                // the setError method have a bug, it lets the textview which show error message gone when setErrorEnable to true or false again
                // so, in this case just set error message empty replace setErrorEnable false
                if (s.length() < 4){
//                    textInputLayout.setErrorEnabled(true);
                    textInputLayout.setError("name length must greater than 4");
                }else {
                    textInputLayout.setCounterEnabled(true);
//                    textInputLayout.setErrorEnabled(false);
                    textInputLayout.setError("");
                }
            }

            @Override
            public void afterTextChanged(Editable s) {

            }
        });
    }
}
```

以上是完整的代码，添加的 TextWatcher 用来判断输入的内容是不是符合你要的某种规范，当然没有要求也可以不写。setError 方法用来设置不符合预期的时候 error 提示的内容，这里有个坑就是 setErrorEnabled false 后再设置 true 之后不管在怎么 setError 都是不会显示了，这个我也加到了注释里，这个 issue 去年就有人提了不过现在 23.2.1 的库中还没有修复。另一个功能是统计字数的方法 setCounterEnabled，打开后会在 widget 右下加一个小 TextView 来显示当前输入的字数，如果在 EditText 中设置了 ems，那么就会以 9/10 这种格式来显示计数，当超过设置的限制时还会触发 error 的提示。


## 2.BottomSheet
顾名思义就是底部的一个菜单，但是其实是一种带 behavior 的布局。这个是 Support Lib 在 23.2 新加入的一个东西，表现形式有两种，一种是内嵌的 View，一种是 Dialog。下面是动图展示：

![](http://7xisp0.com1.z0.glb.clouddn.com/bottom_sheet.gif)

show view 的形式是将这个 bottomsheet 放在当前的布局中通过设置 behavior 来控制 View 的状态，show dialog 则是 show 一个底部 dialog，理论上来说这个布局里放什么都行，也不一定要局限于只能放list之类的。另外一个问题就是 bottomsheet 中滚动的滚动控件必须支持嵌套，例如  NestedScrollView, RecyclerView, 或 API 21+ 的 ListView/ScrollView。

另一种 bottomsheet：

![](http://7xisp0.com1.z0.glb.clouddn.com/bottom_sheet_ex1.png)


show view 需要要到 CoordinatorLayout 布局。下面我们看下代码:
```xml
<?xml version="1.0" encoding="utf-8"?>
<android.support.design.widget.CoordinatorLayout
    android:id="@+id/coordinatorLayout"
    xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:app="http://schemas.android.com/apk/res-auto"
    android:layout_width="match_parent"
    android:layout_height="match_parent">


    <LinearLayout
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:orientation="vertical"
        app:layout_behavior="@string/appbar_scrolling_view_behavior">

        <Button
            android:id="@+id/show_bottom_view"
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:text="Show view"/>

        <Button
            android:id="@+id/show_bottom_sheet"
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:text="Show dialog"/>
        
    </LinearLayout>


    <LinearLayout
        android:id="@+id/bottom_sheet"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:gravity="center"
        android:orientation="vertical"
        app:layout_behavior="@string/bottom_sheet_behavior">

        <Button
            android:text="xxx"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"/>

        <android.support.v7.widget.RecyclerView
            android:id="@+id/list"
            android:layout_width="match_parent"
            android:layout_height="wrap_content"/>

    </LinearLayout>


</android.support.design.widget.CoordinatorLayout>
```
```java

@Bind(R.id.list)
RecyclerView listView;
    
@Override
protected void onCreate(@Nullable Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    setContentView(R.layout.activity_bottom_sheet);
    ButterKnife.bind(this);
    behavior = BottomSheetBehavior.from(findViewById(R.id.bottom_sheet));

    behavior.setBottomSheetCallback(new BottomSheetBehavior.BottomSheetCallback() {
        @Override
        public void onStateChanged(@NonNull View bottomSheet, int newState) {
            System.out.println("on state change");
        }
      
        @Override
        public void onSlide(@NonNull View bottomSheet, float slideOffset) {
            System.out.println("on slide");
        }
    }
    showShetBtn.setOnClickListener(new View.OnClickListener() {
        @Override
        public void onClick(View v) {
            showBottomSheet();
        }
    }
    
    showShetViewBtn.setOnClickListener(new View.OnClickListener() {
        @Override
        public void onClick(View v) {
            behavior.setState(BottomSheetBehavior.STATE_EXPANDED);
        }
    }
    
    listView.setAdapter(new ReAdapter(createData()));
    listView.setHasFixedSize(true);
    listView.setLayoutManager(new LinearLayoutManager(this));

}

public void showBottomSheet() {
       bottomSheetDialog = new BottomSheetDialog(this);
       View dialogContent = getLayoutInflater().inflate(R.layout.layout_bottom_sheet_list, null);
       ListViewCompat listViewCompat = (ListViewCompat) dialogContent.findViewById(R.id.list);
       listViewCompat.setOnItemClickListener(new AdapterView.OnItemClickListener() {
           @Override
           public void onItemClick(AdapterView<?> parent, View view, int position, long id) {
               bottomSheetDialog.dismiss();
           }
       });
       listViewCompat.setAdapter(createAdapter());
       bottomSheetDialog.setContentView(dialogContent);
       bottomSheetDialog.show();
       bottomSheetDialog.setOnDismissListener(new DialogInterface.OnDismissListener() {
           @Override
           public void onDismiss(DialogInterface dialog) {
               bottomSheetDialog = null;
           }
       });
}
```
show view 的方式需要用 BottomSheetBehavior 来控制，BottomSheetBehavior 的几种状态分别是：
* STATE_COLLAPSED 收起状态
* STATE_DRAGGING 当用户在拖动的时候会显示这个状态
* STATE_SETTLING 当你拖到一个位置后松手就会触发这个状态
* STATE_EXPANDED 展开状态
* STATE_HIDDEN 隐藏状态

show view 的方式依赖于 CoordinatorLayout 布局， show dialog 的则没什么限制。

我在 genymotion 和一些手机上实验的时候遇到了有的时候 show view 不显示的问题，原因还没搞清，但是把这个 Activity 切到后台再切回来就会显示了。用官方的模拟没有出现过这个问题，可能是一些 ROM 对于 Activity 生命周期的处理问题导致的，这个回头在研究下。

## 3.CoordinatorLayout
CoordinatorLayout 是一个增强型的 FrameLayout，在以下两种情况下优先使用：
* 作为根布局
* 布局中的一个容器和其他子 View 之间有交互
通过设置给子 View 设置 CoordinatorLayout.Behavior 可以实现多种交互方式。通过 [DefaultBehavior](http://developer.android.com/reference/android/support/design/widget/CoordinatorLayout.DefaultBehavior.html) 注解可以给 View 设置默认的 Behavior。

有一个需要注意的就是需要做交互的子 View 需要一个 anchor，这个 anchor 可以是 CoordinatorLayout 中任意的一个子 View。例如 FloatingActionButton:
```xml
<android.support.design.widget.CoordinatorLayout
    xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:app="http://schemas.android.com/apk/res-auto"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:orientation="vertical">

    <android.support.v7.widget.RecyclerView
        android:id="@+id/list"
        android:layout_width="match_parent"
        android:layout_height="match_parent"/>

    <android.support.design.widget.FloatingActionButton
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:src="@drawable/ic_launcher"
        app:layout_behavior="com.example.bill.app.design.FABBehavior"
        app:layout_anchor="@id/list"
        android:layout_margin="32dp"
        android:clickable="true"
        app:layout_anchorGravity="bottom|right|end"/>

</android.support.design.widget.CoordinatorLayout>
``` 
CoordinatorLayout 会搜索子 View 中的 Behavior，所以只要设置好 Behavior 就可以达到几个 View 之间的交互效果。

## 4.其他
[BottomNavigation](http://www.google.com/design/spec/components/bottom-navigation.html#) 这个东西只是刚出现 Android 设计文档中，对应的 design 库还没出，只有第三方的，这里推荐一个 第三方的库 [BottomBar](https://github.com/roughike/BottomBar)。

其他的 AppCompat 的 Widget 大多是对旧的库的封装，统一了 style 中的一些属性，一些东西已经在我做的 ZhihuApp 中有所使用了。