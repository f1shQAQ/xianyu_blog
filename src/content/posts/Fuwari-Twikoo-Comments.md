---
title: 给你的 Fuwari 接入 Twikoo 评论
published: 2024-10-02
description: 'Fuwari 博客接入 Twikoo 评论'
image: 'https://bu.dusays.com/2024/10/02/66fd356fc1592.webp'
tags: [Twikoo]
category: '折腾'
draft: false 
---

## 部署 Twikoo 后端

自行参照 [Twikoo 文档](https://twikoo.js.org/backend.html) 部署自己的 Twikoo 后端

## 接入评论

下载 Fuwari 项目的 Comments 分支

![](https://bu.dusays.com/2024/10/02/66fd2ed53ffe9.webp)

然后将 Comment 分支内的 `/src/components/comment` 目录复制到自己的博客的 `/src/components` 目录下

![](https://bu.dusays.com/2024/10/02/66fd2f62eaac4.webp)

删除 `Disqus.astro` 和 `Giscus.astro` ，然后打开 `index.astro` ，把里面的内容替换成以下内容

```
---
import type { CollectionEntry } from 'astro:content'
import { commentConfig } from '@/config'
import Twikoo from './Twikoo.astro'
interface Props {
  post: CollectionEntry<'posts'>
}

const { id, data, slug } = Astro.props.post

const path = `/posts/${slug}`
const url = `${Astro.site?.href}${path}`

let commentService = ''
if (commentConfig?.twikoo) {
  commentService = 'twikoo'
}
---
<div class="card-base p-6 mb-4">
  {commentService === 'twikoo' && <Twikoo path={path} />}
  {commentService === '' && null}
</div>
```

打开 `/src/types/config.ts`，将这段代码添加至 72 行处

```
  export type CommentConfig = {
    twikoo?: TwikooConfig
  }
  
  type TwikooConfig = {
    envId: string
    region?: string
    lang?: string
  }
```

![就像这样](https://bu.dusays.com/2024/10/02/66fd30d6610b4.webp)

打开 `/src/config.ts` ，引入 `CommentConfig`

```
import type {
+  CommentConfig,
  LicenseConfig,
  NavBarConfig,
  ProfileConfig,
  SiteConfig,
} from './types/config'
import { LinkPreset } from './types/config'
```

然后，在末尾添加这段代码

```
export const commentConfig: CommentConfig = {
  twikoo: {
    envId: '这里替换为你的 envId',
  },
}
```

![就像这样](https://bu.dusays.com/2024/10/02/66fd33cc8a048.webp)

打开 `/src/pages/posts/[...slug].astro` ，在 112 行处添加

```
<Comment post={entry}></Comment>
```

![就像这样](https://bu.dusays.com/2024/10/02/66fd31ea58b92.webp)

做好以上设置后，再次打开你的博客，文章底部就会正确显示出评论区了，Enjoy :)

![](https://bu.dusays.com/2024/10/02/66fd32a4eb418.webp)
