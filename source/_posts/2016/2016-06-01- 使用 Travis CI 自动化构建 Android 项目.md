---
title:        " 使用 Travis CI 自动化构建 Android 项目"
date:         2016-06-01 17:00
categories:   Android
list_number:  false
---

经常在开源项目中看到使用持续集成，尤其是 C/C++ 这一类项目。为了改进项目的自动化程度和学习持续集成，我也去给自己的项目加了一个，同时记录下过程和遇到的问题。
<!--more-->

## 1.持续集成
持续集成(Continuous integration，CI)是一种软件工程的流程，主要是为了解决软件进行系统集成时面临的各项问题。详细的介绍可以看这个[文章](http://www.ruanyifeng.com/blog/2015/09/continuous-integration.html)，这里就不详细讲持续集成的概念了。

常用的持续集成服务有：
* [Travis CI](https://travis-ci.org/) 这个对开源项目是免费的
* [Circle CI](https://circleci.com) 从配置看和 travis 类似
* [AppVeyor](https://www.appveyor.com/) Web UI 更友好但是没有针对 Android 环境
* [Codeship](https://codeship.com) 没用过

其中 AppVeyor 对微软的工具链支持的很好，Travis CI 可定义的地方比较多虽然都要写脚本，这次使用的也是 Travis CI。

## 2.如何使用
有关更加详细的配置和不同语言的配置可以参考官方 [文档](https://docs.travis-ci.com/)，这里只说下 Android 项目的配置。

### 2.1 配置文件
使用 travis 需要在项目根目录放一个 .travis.yml 配置文件，下面是一个简单的例子：
```yml
language: android
android:
  components:
    # 更新到最新的 tools 和 platform-tools
    # - platform-tools
    # - tools

    # build 项目用的 build-tool version
    - build-tools-19.1.0

    # build 项目用的 SDK version
    - android-19

    # 额外的组件
    - extra-google-google_play_services
    - extra-google-m2repository
    - extra-android-m2repository
    - addon-google_apis-google-19

    # 使用的镜像
    - sys-img-armeabi-v7a-android-19
    - sys-img-x86-android-17
```
其中配置了编译项目所需的一些基本的东西，镜像这一块是用来做测试的，当你写了一些 TestCase 可以通过[启动对应的虚拟机](https://docs.travis-ci.com/user/languages/android#How-to-Create-and-Start-an-Emulator)来执行测试。

下面是我[项目](https://github.com/lber19535/ZhiHu)中所使用的配置文件:
```yml
language: android
# jdk 版本，也可以使用 openjdk
jdk: oraclejdk7
cache: false
# for fix 137 error
sudo: required

env:
  global:
    - MALLOC_ARENA_MAX=2
# build 状态的邮件通知
notifications:
  email: true

android:  
  components:
    # for update build tools
    - platform-tools
    - tools
    - build-tools-23.0.3
    - android-23
    - extra-android-m2repository
    - extra-android-support
# 给编译脚本添加可执行权限
before_install:  
  - chmod +x gradlew
  - chmod +x deploy.sh
# 执行编译脚本，加个 info 主要是想看到出错后的具体错误信息
script:  
  - ./gradlew assembleRelease -PdisablePreDex --info
# 部署前的准备，重命名 release apk 的名字
before_deploy:
  - ./deploy.sh
  - export RELEASE_PKG_FILE=$(ls *.apk)
# 部署
deploy:  
  provider: releases
  api_key:
    secure: wifs3kkICwPtxd+OEoNMABi8IUl2VrMZslnP/oXuBA53NkrmQW9Mh2zXOCAh5P5sZMnD017AMBkHGzyDMKqI/XTFZxMDwWSighJs+HSVmhUZ/t4jpmEKZjfn/q50SlrFvSqiw9dltFwjynT+CRuIHW07ng0nfwyT3JXeyJeQImDlPOfHA7H2DgGnXxI72sjk1rhFtaPRT66vj3BQ2FmbM4Puo/eddwxdW/jXxOpLUx8oSUkENwGL2+70Cqv/00AZk+0gklZNqGRiwcjJrMkpEFaP0AV/ruJHqL9/G0baLqh8I/IBTZ8DnGv9hG4cxizmdyOBo0Q6xYmAGXvTf1gAn3voShsxA/SsHsjNDW2Wh6WZOLtg48cEydLHKpjz0Dffiq2mSbuTl5DO8qmv882udm441xHqz7RaAlvvCnSzHEMUo84flOgBAbdPtma+yiSgPHUcOq8f5opCM+ymrjfEjapw756UaQTaHp6shrqRKihIogWDgg8NzSEfrKTZSjTZpQAQPg7axqkQtlQhP8jg1d6pEjMIcWOJ7WFh1lhFCRDFTXvZppnpH88w679s3g7CWk3kR5Cg20zvnPznHBiqsFRktYy2O5EJM0pXOIRZtRla+M95cG6367wo6o/19R75QQKEACcLVvDbf0S7N96qV3U5EZwvdgqd6ZAK2FYMV/Q=
  file_glob: true
  file: "${RELEASE_PKG_FILE}"
  skip_cleanup: true
  on:
    tags: true
```
这里说部署和 sudo 的部分。部署这里有很多条件，比较常见的一个条件是 tags，当提交的时候加了 tag，他就会帮你 build 好之后按照你部署的要求发布到对应的地方，其他条件可以参考[文档](https://docs.travis-ci.com/user/deployment#Conditional-Releases-with-on%3A)。这里的 api_key 是通过 travis 的工具生成的加密的 key，操作方法可以参考[文档](https://docs.travis-ci.com/user/deployment/releases)。file_glob 是配置是否支持通配符，因为修改文件名用到了通配符所以加到这里。最后要说的就是 sudo 配置，默认项目是会在容器中构建的，所以用到内存等是有限的，我在 build 知乎项目的时候就发生了在 proguard 阶段被 kill 的情况，具体错误是 exited with 137，可以参考这个[历史](https://travis-ci.org/lber19535/ZhiHu/builds/133824818)，由于容器中不能用 sudo，所以加上 sudo: required 是为了不使用容器。

### 2.2 Status Image
我们经常会看到开源项目中有 build passing 这样的图标：

![](http://7xisp0.com1.z0.glb.clouddn.com/travis_ci_sample.png)

那么如何给我们自己的项目加一个呢，首先到自己的 travis ci 项目中，然后点击 build passing，会弹出如图的对话框，第二个可以选生成的 status image 类型，这里我们选 markdown：

![](http://7xisp0.com1.z0.glb.clouddn.com/travis_ci_status_img.png)

最后将那段代码复制到你的 readme.md 中就会出现如下效果：

[![Build Status](https://travis-ci.org/lber19535/ZhiHu.svg?branch=master)](https://travis-ci.org/lber19535/ZhiHu)

## 3.总结
CI 的适用范围很广，不仅仅是大型项目，像我这样一个人开发的项目也可以使用，同时可以结合测试驱动开发、极限编程等思想来使用。