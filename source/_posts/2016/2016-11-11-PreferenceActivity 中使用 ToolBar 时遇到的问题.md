---
title:        "PreferenceActivity 中使用 ToolBar 时遇到的问题"
date:         2016-11-11 17:00
categories:   Android
list_number:  false
---

在使用 ToolBar 和 PreferenceActivity 的时候遇到的小问题。

<!--more-->

之前在使用 PreferenceActivity 的时候从来没有要用过 Toolbar，这次为了使用 Toolbar，同时也是懒得在为这个 Activity 单独写个 ActionBarTheme，所以就有了在 NoActionBar 的 PreferenceActivity 中加入 Toolbar 的想法。首先遇到的一个问题就是这个 Activity 的使用是不需要我们自己写 layout 文件，所以怎么加入一个 Toolbar。
首先想到的是下面这个办法：

```java
View inflate = getLayoutInflater().inflate(R.layout.toolbar, (ViewGroup) findViewById(android.R.id.content));
Toolbar toolbar = (Toolbar) inflate.findViewById(R.id.toolbar);
setSupportActionBar(toolbar);
```

这样随之而来的问题就是添加的这个 Toolbar 会盖住 Preference 的内容，所以就要看下这个 Activity 的布局，究竟挡在哪里了：

```java
protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

       ...

        final int layoutResId = sa.getResourceId(
                com.android.internal.R.styleable.PreferenceActivity_layout,
                com.android.internal.R.layout.preference_list_content);

        ...
        setContentView(layoutResId);
        ...
}
```

从 PreferenceActivity 的源码中发现，他的布局在 com.android.internal.R.layout.preference_list_content 中，里面主要的布局是：

```xml
<LinearLayout
        android:orientation="horizontal"
        android:layout_width="match_parent"
        android:layout_height="0px"
        android:layout_weight="1">

        <LinearLayout
            style="?attr/preferenceHeaderPanelStyle"
            android:id="@+id/headers"
            android:orientation="vertical"
            android:layout_width="0px"
            android:layout_height="match_parent"
            android:layout_weight="@integer/preferences_left_pane_weight">

            <ListView android:id="@android:id/list"
                style="?attr/preferenceListStyle"
                android:layout_width="match_parent"
                android:layout_height="0px"
                android:layout_weight="1"
                android:clipToPadding="false"
                android:drawSelectorOnTop="false"
                android:cacheColorHint="@android:color/transparent"
                android:listPreferredItemHeight="48dp"
                android:scrollbarAlwaysDrawVerticalTrack="true" />

            <FrameLayout android:id="@+id/list_footer"
                    android:layout_width="match_parent"
                    android:layout_height="wrap_content"
                    android:layout_weight="0" />

        </LinearLayout>

        <LinearLayout
                android:id="@+id/prefs_frame"
                style="?attr/preferencePanelStyle"
                android:layout_width="0px"
                android:layout_height="match_parent"
                android:layout_weight="@integer/preferences_right_pane_weight"
                android:orientation="vertical"
                android:visibility="gone" >

            <!-- Breadcrumb inserted here, in certain screen sizes. In others, it will be an
                empty layout or just padding, and PreferenceActivity will put the breadcrumbs in
                the action bar. -->
            <include layout="@layout/breadcrumbs_in_fragment" />

            <android.preference.PreferenceFrameLayout android:id="@+id/prefs"
                    android:layout_width="match_parent"
                    android:layout_height="0dip"
                    android:layout_weight="1"
                />
        </LinearLayout>
</LinearLayout>
```

id 为 headers 的 layout 是 Preference 中 [headers](https://developer.android.com/guide/topics/ui/settings.html#PreferenceHeaders) 的部分，当在 onBuildHeaders 中加载了对应的 header 的时候：

```java
public void onBuildHeaders(List<Header> target) {
        loadHeadersFromResource(R.xml.pref_headers, target);
}
```

就会选择先显示这个 layout，当选择了对应的 header 进入到下一个界面时则会显示 prefs_frame 的内容，这个 layout 中的 PreferenceFrameLayout 用来显示对应的 Fragment。

当看完了这些后就知道了遮住的就是上面说的两个布局，所以在代码中加入对是否是 header 的判断从而可以对不同的 layout 加入 margin：

```java
// 获取 Toolbar 的 size
TypedValue tv = new TypedValue();
int topMargin = 0;
if (getTheme().resolveAttribute(android.R.attr.actionBarSize, tv, true)) {
    topMargin = TypedValue.complexToDimensionPixelSize(tv.data, getResou().getDisplayMetrics());
}

// 是否是 headers
if (getIntent().getStringExtra(EXTRA_SHOW_FRAGMENT) == null) {
    LinearLayout.LayoutParams layoutParams = (LinearLayout.LayoutParagetListView().getLayoutParams();
    layoutParams.setMargins(0, topMargin, 0, 0);
    getListView().setLayoutParams(layoutParams);
} else {
    int identifier = getResources().getSystem().getIdentifier("prefs_frame", "id", "android");
    LinearLayout.LayoutParams layoutParams = (LinearLayout.LayoutParams) findViewById(identifier).getLayoutParams();
    layoutParams.setMargins(0, topMargin, 0, 0);
    findViewById(identifier).setLayoutParams(layoutParams);
}
```
当显示 headers 时，利用了这个 Activity 是继承自 ListActivity 的特点，利用 getListView 来获得显示内容的 ListView，当显示 Fragment 的时候通过 getResources().getSystem().getIdentifier() 获取系统的组件的 id，在通过 id 找到 View 设置对应的 margin。
