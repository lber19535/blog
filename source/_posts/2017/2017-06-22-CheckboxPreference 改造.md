---
title:        "CheckboxPreference 改造"
date:         2017-06-22 17:00
categories:   Android
list_number:  false
tags:
- Android
---

Android 中原生的 [CheckBoxPreference](https://developer.android.com/reference/android/preference/CheckBoxPreference.html) 没有办法将 Item 和 CheckBox 的点击事件分开，刚好最近工作上有这个需求，本篇文章将在阅读源码的基础上分析如何对这个需求进行定制。代码基于 [Android 7.1.1]()
<!--more-->

## 1.PreferenceActivity
由于任务是要修改系统的 Settings App，所以因为历史原因还在用 Deprecated 的一些接口，这里主要是通过分析源码对修改控件提供一个思路，对于 Deprecated 的接口可以不用在意。

PreferenceActivity 继承自 ListActivity，默认的 layout 是 [preference_list_content](https://android.googlesource.com/platform/frameworks/base/+/android-7.1.1_r43/core/res/res/layout/preference_list_content.xml)，当在 onCreate 方法发方法中 addPreferencesFromResource 的时候，inflateFromResource 会将你写好的 preference 的 xml 加载进来，解析成对应的 PreferenceScreen，然后通过 setPreferenceScreen 将 PreferenceScreen 丢给 PreferenceManager，最后通过 bindPreferences 将 PreferenceScreen 中的 Preference 的内容绑定到 ListView 中。

```java
public class MainActivity extends PreferenceActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        addPreferencesFromResource(R.xml.testpref);
    }
}

public abstract class PreferenceActivity extends ListActivity implements
        PreferenceManager.OnPreferenceTreeClickListener,
        PreferenceFragment.OnPreferenceStartFragmentCallback {
    ...
    private Handler mHandler = new Handler() {
        @Override
        public void handleMessage(Message msg) {
            switch (msg.what) {
                case MSG_BIND_PREFERENCES: {
                    bindPreferences();
                } break;
                case MSG_BUILD_HEADERS: {
                    ArrayList<Header> oldHeaders = new ArrayList<Header>(mHeaders);
                    mHeaders.clear();
                    onBuildHeaders(mHeaders);
                    if (mAdapter instanceof BaseAdapter) {
                        ((BaseAdapter) mAdapter).notifyDataSetChanged();
                    }
                    Header header = onGetNewHeader();
                    if (header != null && header.fragment != null) {
                        Header mappedHeader = findBestMatchingHeader(header, oldHeaders);
                        if (mappedHeader == null || mCurHeader != mappedHeader) {
                            switchToHeader(header);
                        }
                    } else if (mCurHeader != null) {
                        Header mappedHeader = findBestMatchingHeader(mCurHeader, mHeaders);
                        if (mappedHeader != null) {
                            setSelectedHeader(mappedHeader);
                        }
                    }
                } break;
            }
        }
    };

    @Deprecated
    public void addPreferencesFromResource(int preferencesResId) {
        requirePreferenceManager();

        setPreferenceScreen(mPreferenceManager.inflateFromResource(this, preferencesResId,
                getPreferenceScreen()));
    }

    @Deprecated
    public void setPreferenceScreen(PreferenceScreen preferenceScreen) {
        requirePreferenceManager();

        if (mPreferenceManager.setPreferences(preferenceScreen) && preferenceScreen != null) {
            postBindPreferences();
            CharSequence title = getPreferenceScreen().getTitle();
            // Set the title of the activity
            if (title != null) {
                setTitle(title);
            }
        }
    }

    private void postBindPreferences() {
        if (mHandler.hasMessages(MSG_BIND_PREFERENCES)) return;
        mHandler.obtainMessage(MSG_BIND_PREFERENCES).sendToTarget();
    }

    private void bindPreferences() {
        final PreferenceScreen preferenceScreen = getPreferenceScreen();
        if (preferenceScreen != null) {
            preferenceScreen.bind(getListView());
            if (mSavedInstanceState != null) {
                super.onRestoreInstanceState(mSavedInstanceState);
                mSavedInstanceState = null;
            }
        }
    }
    ...
}

public PreferenceScreen inflateFromResource(Context context, @XmlRes int resId,
            PreferenceScreen rootPreferences) {
        // Block commits
        setNoCommit(true);

        final PreferenceInflater inflater = new PreferenceInflater(context, this);
        rootPreferences = (PreferenceScreen) inflater.inflate(resId, rootPreferences, true);
        rootPreferences.onAttachedToHierarchy(this);

        // Unblock commits
        setNoCommit(false);

        return rootPreferences;
}

```

在 bind 的过程中会给 ListView 设置对应的 ItemClickListener 和 Adapter，当点击 Preference 中的某一条目时，就会先触发这个 item click 事件。

```java
public final class PreferenceScreen extends PreferenceGroup implements AdapterView.OnItemClickListener,
        DialogInterface.OnDismissListener {
    ...
    public void bind(ListView listView) {
        listView.setOnItemClickListener(this);
        listView.setAdapter(getRootAdapter());
        
        onAttachedToActivity();
    }

    public void onItemClick(AdapterView parent, View view, int position, long id) {
        // If the list has headers, subtract them from the index.
        if (parent instanceof ListView) {
            position -= ((ListView) parent).getHeaderViewsCount();
        }
        Object item = getRootAdapter().getItem(position);
        if (!(item instanceof Preference)) return;

        final Preference preference = (Preference) item; 
        preference.performClick(this);
    }
    ...
}
```

当点击事件被触发时会先去执行 Preference 的 performClick 方法，其中会通过 onClick 通知这个 Preference 本身，不同的 Preference 对 onClick 的处理是不一样的，后面会分析我要修改的 CheckBoxPreference 中的 onClick 方法，然后是通知 Preference  的 OnClickListener.onPreferenceClick，再然后通过 onPreferenceTreeClick 通知整个 PreferenceScreen 有东西被点击了。

```java
public class Preference implements Comparable<Preference> {
    public void performClick(PreferenceScreen preferenceScreen) {
        
        if (!isEnabled()) {
            return;
        }
        
        onClick();
        
        if (mOnClickListener != null && mOnClickListener.onPreferenceClick(this)) {
            return;
        }
        
        PreferenceManager preferenceManager = getPreferenceManager();
        if (preferenceManager != null) {
            PreferenceManager.OnPreferenceTreeClickListener listener = preferenceManager
                    .getOnPreferenceTreeClickListener();
            if (preferenceScreen != null && listener != null
                    && listener.onPreferenceTreeClick(preferenceScreen, this)) {
                return;
            }
        }
        
        if (mIntent != null) {
            Context context = getContext();
            context.startActivity(mIntent);
        }
    }
}
```

## 2.CheckBoxPreference
[CheckBoxPreference](https://android.googlesource.com/platform/frameworks/base/+/android-7.1.1_r43/core/java/android/preference/CheckBoxPreference.java) 本身里面没什么东西，大部分的实现都集中在了 TwoStatePreference 中。前面讲到了 onClick 事件，这里接着继续讲。在 TwoStatePreference 中的 onClick 时间通过 callChangeListener 通知对应的 Listener CheckBox 状态的改变，在 setChecked 的时候将改变的值写入 xml 并且通知 ListView 状态改变。

```java
public abstract class TwoStatePreference extends Preference {
    @Override
    protected void onClick() {
        super.onClick();

        final boolean newValue = !isChecked();
        if (callChangeListener(newValue)) {
            setChecked(newValue);
        }
    }
    public void setChecked(boolean checked) {
        // Always persist/notify the first time; don't assume the field's default of false.
        final boolean changed = mChecked != checked;
        if (changed || !mCheckedSet) {
            mChecked = checked;
            mCheckedSet = true;
            persistBoolean(checked);
            if (changed) {
                notifyDependencyChange(shouldDisableDependents());
                notifyChanged();
            }
        }
    }
}

public class Preference implements Comparable<Preference> {
    protected boolean persistBoolean(boolean value) {
        if (shouldPersist()) {
            if (value == getPersistedBoolean(!value)) {
                // It's already there, so the same as persisting
                return true;
            }
            
            SharedPreferences.Editor editor = mPreferenceManager.getEditor();
            editor.putBoolean(mKey, value);
            tryCommit(editor);
            return true;
        }
        return false;
    }
}
```

看到这里突然想到 CheckBoxPreference 中的 CheckBox 的状态很可能不是自己改变，而是在 notifyChanged 之后刷新 ListView 被动改变的。继续看源码发现其中的 onBindView 里有对 View 的操作，顺着这个方法找到了 Preference 中的 getView 方法。

```java
public class CheckBoxPreference extends TwoStatePreference {
    @Override
    protected void onBindView(View view) {
        super.onBindView(view);

        View checkboxView = view.findViewById(com.android.internal.R.id.checkbox);
        if (checkboxView != null && checkboxView instanceof Checkable) {
            ((Checkable) checkboxView).setChecked(mChecked);
        }

        syncSummaryView(view);
    }
}

public class Preference implements Comparable<Preference> {
    public View getView(View convertView, ViewGroup parent) {
        if (convertView == null) {
            convertView = onCreateView(parent);
        }
        onBindView(convertView);
        return convertView;
    }
}
```

这个 Adapter 就是前面 bind 方法中 getRootAdapter 所拿到的 Adapter，在 Adapter 的 getView 中找到了 Preference 的 getView。

```java
public class PreferenceGroupAdapter extends BaseAdapter
        implements OnPreferenceChangeInternalListener {
    public View getView(int position, View convertView, ViewGroup parent) {
        final Preference preference = this.getItem(position);
        // Build a PreferenceLayout to compare with known ones that are cacheable.
        mTempPreferenceLayout = createPreferenceLayout(preference, mTempPreferenceLayout);

        // If it's not one of the cached ones, set the convertView to null so that 
        // the layout gets re-created by the Preference.
        if (Collections.binarySearch(mPreferenceLayouts, mTempPreferenceLayout) < 0 ||
                (getItemViewType(position) == getHighlightItemViewType())) {
            convertView = null;
        }
        View result = preference.getView(convertView, parent);  // !!!
        if (position == mHighlightedPosition && mHighlightedDrawable != null) {
            ViewGroup wrapper = new FrameLayout(parent.getContext());
            wrapper.setLayoutParams(sWrapperLayoutParams);
            wrapper.setBackgroundDrawable(mHighlightedDrawable);
            wrapper.addView(result);
            result = wrapper;
        }
        return result;
    }
}
```

看到这里印证了之前的猜想，CheckBox 确实没有自己独立的点击事件，是依靠 check 属性的变化刷新 ListView 做出的反馈。知道原理了就好说了，之所以没法分开就是因为CheckBox 没有单独的点击事件嘛。

## 3.定制
通过源码可以知道系统自带的 CheckBox 的 id 是 android.R.id.checkbox，然后只要给 CheckBox 和容器分别加上对应的点击事件就好啦，有一个要注意的点就是还需要手动去出发父类的 onClick，否则属性的持久化是不会被触发的，当然也可以自己做这个动作。在注释掉的地方可以自定义不同的 CheckBox，比如有的 CheckBox 的 state layer/list 是定义的。

```java
public class CustomCheckBoxPreference extends CheckBoxPreference {

    public CustomCheckBoxPreference(Context context, AttributeSet attrs) {
        super(context, attrs);
//        setWidgetLayoutResource(R.layout.widget_checkbox);
    }

    @Override
    protected void onBindView(View view) {
        super.onBindView(view);
        CheckBox checkBox = (CheckBox) view.findViewById(android.R.id.checkbox);
        checkBox.setChecked(isChecked());
        checkBox.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                Toast.makeText(getContext(), "check", Toast.LENGTH_SHORT).show();
                CustomCheckBoxPreference.this.onClick();

            }
        });

        view.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
            }
        });
    }
}
```

下面是效果图

![](http://7xisp0.com1.z0.glb.clouddn.com/checkbox_custom.gif)