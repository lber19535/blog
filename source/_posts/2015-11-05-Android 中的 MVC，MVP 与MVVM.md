---
title:        "Android 中的 MVC，MVP 与MVVM"
date:         2015-11-05 17:00
categories:   Android
list_number:  false
tags:
---

为了代码可以写的更加的舒服，就专门看了下这三个模式。这篇文章主要介绍下三个模式的区别及如何使用。

<!-- more -->

一个 App 的构成主要是界面，数据，事件，业务逻辑这四部分，MVC，MVP 和 MVVM 就是对这四部分的不同组织和抽象方式。

## 1.MVC
MVC 的定义就不赘述了，主要是就是 View，Controller，Model 三者之间的关系。在 MVC 中，View 负责显示数据，Controller 负责接收 View 传来的事件和程序的业务逻辑，Model 就是一些数据。三者之间的联系如下图：
![MVC](http://7xisp0.com1.z0.glb.clouddn.com/android_mvc.png)
[图片来源](https://stackoverflow.com/questions/2056/what-are-mvp-and-mvc-and-what-is-the-difference)

在 Android 中系统组建的设计师符合 MVC 模式的，所以在写代码的过程中这个模式就被不知不觉的用到了。下面拿最简单的显示一个列表的 Demo 举例。首先来看下需求，要在界面上显示一个列表，列表的内容是手机上安装的 APP，如下图所示：
![示意图](http://7xisp0.com1.z0.glb.clouddn.com/android_mvc_demo_pic.png)

首先我们看下代码结构，首先看到的东西就是 View 了，这里主要是 ListView，这个 View 在 layout 的 xml 中就创建好了。然后是 Activity 在这里充当了 Controller 的角色，例如 View 的点击事件等都是在 Activity 中处理的。：
```Java
public class MainActivity extends AppCompatActivity {

    @Bind(R.id.list)
    ListView appLv;

    private SparseArray<AppListItem> appList;
    private AppListAdapter adapter;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);
        ButterKnife.bind(this);

        appList = new SparseArray<>();
        adapter = new AppListAdapter(this, appList);
        appLv.setAdapter(adapter);

        new AsyncTask<Void, Void, Void>() {
            @Override
            protected Void doInBackground(Void... params) {
                Intent intent = new Intent(Intent.ACTION_MAIN, null);
                intent.addCategory(Intent.CATEGORY_LAUNCHER);
                List<ResolveInfo> infos = getPackageManager().queryIntentActivities(intent, PackageManager.MATCH_ALL);
                int index = 0;
                for (ResolveInfo info : infos) {
                    AppListItem item = new AppListItem();
                    item.setAppIcon(info.loadIcon(getPackageManager()));
                    item.setAppName(info.loadLabel(getPackageManager()).toString());
                    item.setPkgName(info.activityInfo.packageName);
                    appList.put(index++, item);
                }
                return null;
            }

            @Override
            protected void onPostExecute(Void aVoid) {
                super.onPostExecute(aVoid);
                adapter.notifyDataSetChanged();
            }
        }.execute();
    }
}
```
最后是 Model，也就是数据：
```Java
class AppListAdapter extends BaseAdapter {

    private SparseArray<AppListItem> appList;
    private Context context;

    public AppListAdapter(Context context, SparseArray<AppListItem> appList) {
        this.appList = appList;
        this.context = context;
    }

    @Override
    public int getCount() {
        return appList.size();
    }

    @Override
    public Object getItem(int position) {
        return appList.get(position);
    }

    @Override
    public long getItemId(int position) {
        return 0;
    }

    @Override
    public View getView(int position, View convertView, ViewGroup parent) {

        Holder holder = null;
        if (convertView == null) {
            convertView = LayoutInflater.from(context).inflate(R.layout.list_item_home, parent, false);
            holder = new Holder(convertView);
            convertView.setTag(holder);
        } else {
            holder = (Holder) convertView.getTag();
        }

        holder.appIcon.setImageDrawable(appList.get(position).getAppIcon());
        holder.appName.setText(appList.get(position).getAppName());
        holder.pkgName.setText(appList.get(position).getPkgName());

        return convertView;
    }

    class Holder {
        @Bind(R.id.app_name)
        TextView appName;
        @Bind(R.id.app_pkg)
        TextView pkgName;
        @Bind(R.id.app_icon)
        ImageView appIcon;

        public Holder(View v) {
            ButterKnife.bind(this, v);
        }
    }
}

public class AppListItem {

    private String appName;
    private Drawable appIcon;
    private String pkgName;

    public String getAppName() {
        return appName;
    }

    public void setAppName(String appName) {
        this.appName = appName;
    }

    public Drawable getAppIcon() {
        return appIcon;
    }

    public void setAppIcon(Drawable appIcon) {
        this.appIcon = appIcon;
    }

    public String getPkgName() {
        return pkgName;
    }

    public void setPkgName(String pkgName) {
        this.pkgName = pkgName;
    }
}
```
这里 AppListItem 和 AppListAdapter 都是 Model，Activity 通过 notifyDataSetChanged 刷新 Adapter 让 View 更新，这就形成了 MVC 的一个循环。

MVC 的好处在于三者之间都可以相互控制，但是所带来的问题就是会让三个部分耦合性较高，从而导致一个小的更改需要改三个部分。在 Android 中，Activity 和 Fragment 经常扮演的角色是 View + Controller，这就使得经常出现上千行的 Activity。

## 2.MVP
MVP 是 MVC 的进化版本，在 MVC 中 Model，View，Controller 三者可以互相访问，而在 MVP 中，Model 和 View 是不能相互控制的，Model 获取数据通知 Presenter，Presenter 再去调用相关的业务逻辑更新 View。所以，三者的分工为 View 负责显示数据，并把接收到的操作通知 Presenter，Presenter 通过 View 传来的操作来决定获取什么数据，Model 则是获取数据的部分。另一个区别就是在 View 和 Presenter 之间加入了接口以达到解耦的目的。还是以之前显示一个 App 的列表来做例子。

先看下代码结构：
![](http://7xisp0.com1.z0.glb.clouddn.com/mvp_packages.png)

其中 Presenter 持有 Model 和 View 的引用，并且处理业务逻辑。整个的过程是 MainActivity 响应事件，然后将事件通过 MainPresenter 接口传递给 Presenter，Presenter 调用 MainModel 接口去加载数据，加载完成后通过 MainView 接口回传给 View 层并显示。

代码放在了 [GitHub](https://github.com/lber19535/AndroidDemo/tree/master/app/src/main/java/com/example/bill/designpattern/mvp) 上。

MVP 的设计通过接口让三部分的代码分离，使得 View（Activity）这一部分专注于 View 的工作，同时也使代码结构更清晰。

## 3.MVVM
MVVM 算是 MVP 的进化版，通过双向绑定简化了 View 和 Model 之间的关系，在 MVP 中需要把 Model 的更新通过接口一步一步传到 View 层更新，而 MVVM 由于做了 model 和 view 的双向绑定，所以 model 的更新会自动同步到 view。但是在目前的 Android 中是很难实现双向绑定的，谷歌新推出的 Android 上的 databinding 插件也没有办法做到双向自动绑定的程度，所以在使用上没办法和 WPF 之类的成熟的东西相比。
这部分的代码放在了 [GitHub](https://github.com/lber19535/AndroidDemo/tree/master/app/src/main/java/com/example/bill/designpattern/mvvm) 中，代码结构和 MVP 类似，只不过由于可以绑定数据到 View 上，所以就不需要写 View 和 ViewModel 之间的接口。


## 4.总结
三者的主要区别在于 UI，业务逻辑，数据之间的消息传递方向，在 MVC 中，传递时单向的闭环，在 MVP 中是 P 和 VM双向通信，在 MVVM 中 P 和 V 通信的部分会自动完成，所以代码重点放到了 VM 和 M 上面。

