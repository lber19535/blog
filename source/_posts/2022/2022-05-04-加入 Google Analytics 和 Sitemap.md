---
title: 加入 Google Analytics 和 Sitemap
date: 2022-05-04 21:57:48
categories:   Hexo
list_number:  false
tags:
- Hexo
- Google Analytics
- Google Search Console
---

# 1. 背景

前段时间重新翻修了 blog，最近发现一直没有流量统计，可能以前的统计代码在翻修的时候被误删了。同时在找资料的时候发现可以加 sitemap，也就顺手加上了。有些坑，就顺手记录一下。

<!--more-->

# 2. Google Analytics

Google Analytics 其实最开始是有的，但是翻修博客的时候替换了主题文件，config 在那时候被覆盖了，所以导致这个没了，这次就直接加回来。一上来就看见一个提示，需要从 UA 更新到 G4。**这个 tracking_id 一定要记得需要放到 theme 对应的文件夹中的 *config.yml 中，例如我这里用了 next 主题，那么就是在 theme/next/_*config.yml 中加入 tracking_id。**

![Untitled](Untitled.png)

根据网站的引导创建一个 G4 的应用，以为我本身有一个 UA 的资源了，所以现在变成了 UA 和 G4 两个资源：

![Untitled](Untitled1.png)

然后通过在 UA 应用中按照如下图的操作可以关联到新的 G4 应用：

![Untitled](Untitled2.png)

这样一顿操作之后既可以看到网站的访问量等信息了，比如我这里刚建好，所以没啥人：

![Untitled](Untitled3.png)

# 3. Google Search Console

Google Search Console 可以帮助 Google 更好的索引你的网站，带来更多流量。

首先登录 Google Search Console，因为我的 blog 搭载 github io 上，所以就选择使用网址前缀的类型（如果有自有服务器的可以选做左边），在其中填入 blog 地址。

![Untitled](Untitled4.png)

因为我前面接了Google Analytics，所以这里就比较方便，可以直接用 Google Analytics 帮助它更容易的验证这个网站是不是你的。

![Untitled](Untitled5.png)

完成校验后会弹出一个成功的框。

![Untitled](Untitled6.png)

下一步就是添加 sitemap 了。首先装一个工具：

```bash
npm install hexo-generator-sitemap
```

然后在 theme/next/_config.yml 中找到如图所示，打开 sitemap 的注释，这样 hexo 会在每次发布的时候生成 sitemap.xml

![Untitled](Untitled7.png)

第一次用的时候出了个问题如下图所示：

![Untitled](Untitled8.png)

这个问题查了查发现是文章标题中不能有 & 符号，处理了一下之后从新发布就行了。

最后在 Google Search Console 中添加 sitemap等待他索引就可以了，貌似是一天更新一次。

![Untitled](Untitled9.png)

# 4.Reference

[Get Github Pages Site found in Google Search Results](https://stackoverflow.com/questions/49073043/get-github-pages-site-found-in-google-search-results)

[hexo系列-03 讓google可以搜尋到你的網站](https://augustushsu.github.io/2019/12/14/hexo-03/)

[(24) 試著學 Hexo - SEO 篇 - Google Search Console](https://israynotarray.com/hexo/20201007/3723180073/)

[hexo中sitemap xml error - 'xmlParseEntityRef: no name'的解决方法_Lestat.Z.的博客-CSDN博客](https://blog.csdn.net/yolohohohoho/article/details/91469362)