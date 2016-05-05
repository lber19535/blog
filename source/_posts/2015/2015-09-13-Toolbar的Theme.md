---
title:        "Toolbar的Theme"
date:         2015-9-13 17:00
categories:   Android
tags:
- Android
---

自制知乎 App 的过程中遇到了要修改 Toolbar 颜色等主题方面的问题，把走过的一些坑记录下。

<!--more-->

首先上一下最终效果：
![最终效果](http://7xisp0.com1.z0.glb.clouddn.com/toolbar_exercise_final.png)

style中的定义：
```xml
<style name="AppTheme.Light" parent="Theme.AppCompat.Light.NoActionBar">
...
	<item name="actionOverflowButtonStyle">@style/Toolbar.OverFlowButton</item>
...
</style>

<style name="Toolbar.Title" parent="TextAppearance.Widget.AppCompat.Toolbar.Title">
    <item name="android:textSize">@dimen/font_22</item>
    <item name="android:textColor">@color/white</item>
</style>

<style name="Toolbar.Subtitle" parent="TextAppearance.Widget.AppCompat.Toolbar.Title">
	<item name="android:textSize">@dimen/font_14</item>
	<item name="android:textColor">@color/white</item>
</style>

<style name="Toolbar.Popup" parent="ThemeOverlay.AppCompat.Light">
</style>

<style name="Toolbar.OverFlowButton" parent="Widget.AppCompat.Light.ActionButton.Overflow">
        <item name="android:src">@drawable/ic_more_vert</item>
</style>

<style name="Toolbar.Theme" parent="Widget.AppCompat.Toolbar">
    <item name="titleTextAppearance">@style/Toolbar.Title</item>
    <item name="subtitleTextAppearance">@style/Toolbar.Subtitle</item>
    <item name="android:background">@color/blue</item>
    <item name="popupTheme">@style/Toolbar.Popup</item>
</style>
```

### Widget.AppCompat.Light.ActionButton.Overflow
这个 style 最终继承自 RtlOverlay.Widget.AppCompat.ActionButton.Overflow 和 Widget.AppCompat.Light.ActionButton.Overflow，他们定义了右边的三个点那个 Button 主题，下面是定义部分：
```xml
<style name="RtlOverlay.Widget.AppCompat.ActionButton.Overflow" parent="Base.Widget.AppCompat.ActionButton.Overflow">
    <item name="android:paddingLeft">@dimen/abc_action_bar_overflow_padding_start_material</item>
    <item name="android:paddingRight">@dimen/abc_action_bar_overflow_padding_end_material</item>
</style>

<style name="Base.Widget.AppCompat.ActionButton.Overflow">
    <item name="android:src">@drawable/abc_ic_menu_moreoverflow_mtrl_alpha</item>
    <item name="android:background">?attr/actionBarItemBackground</item>
    <item name="android:contentDescription">@string/abc_action_menu_overflow_description</item>
    <item name="android:minWidth">@dimen/abc_action_button_min_width_overflow_material</item>
    <item name="android:minHeight">@dimen/abc_action_button_min_height_material</item>
</style>
```

最终用在了这里：

```xml
<style name="Base.V7.Theme.AppCompat.Light" parent="Platform.AppCompat.Light">
...
	<item name="actionOverflowButtonStyle">@style/Widget.AppCompat.Light.ActionButton.Overflow</item>
...
</style>
```

#### actionOverflowButtonStyle
这个属性在 values 中的定义：
```xml
<declare-styleable name="Theme">
...
	<attr format="reference" name="actionOverflowButtonStyle"/>
...
</declare-styleable>
```
说明这个属性是在 Theme 下的，刚开始没注意这一点就放到Toolbar下了，结果发现没作用，Google 了半天才发现了这个问题，后来放到 Theme 就起作用了。

### ThemeOverlay.AppCompat.Light

这个 style 是右边按钮点击后的 popupwindow 的 style，这个 style 继承自 Base.ThemeOverlay.AppCompat.Light，这个 style 中定义了弹出框的颜色，文字的颜色，而Base.ThemeOverlay.AppCompat.Light 的 parent style 是 Platform.ThemeOverlay.AppCompat.Light，这个 style 中包含了一些 item 和 drop down 的效果，这部分效果来自 Spinner。

#### popupTheme
这个属性定义在 Toolbar 中，由于是 Support 库中的属性，所以使用的时候不需要加 android: 前缀。
```xml
<declare-styleable name="Toolbar">
...
<attr name="popupTheme"/>
...
</declare-styleable>
```

### 总结
其余的属性和 style 就比较常规了 Title 和 Subtitle 就是 Toolbar 中的 TextAppearance，为了兼容 Actionbar 也被用在了 Actionbar 中。关键就是不同的 style 要集成不同 parent，并且对应的设置给哪个属性也要分清楚放在哪个 style 下，如果放错了就不会产生效果。