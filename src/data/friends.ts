export type Friend = {
  title: string
  imgurl: string
  desc: string
  siteurl: string
  tags?: string[]
}

export const friends: Friend[] = [
  {
    title: "DaMa's Blog",
    imgurl:
      'https://2.gravatar.com/avatar/14960b9a22eac1e5cac3ddb82b4097e95ba17710084f2e3c14997d626a6748d5?size=512',
    desc: '暂时没想好',
    siteurl: 'https://idama.top',
  },
  {
    title: 'Leonus',
    imgurl: 'https://q1.qlogo.cn/g?b=qq&nk=990320751&s=5',
    desc: '进一寸有进一寸的欢喜。',
    siteurl: 'https://blog.leonus.cn/',
  },
  {
    title: '呆鱼',
    imgurl: 'https://daiyu.fun/img/avatar.png',
    desc: 'Hello World!',
    siteurl: 'https://daiyu.fun/',
  },
  {
    title: '浪海导航',
    imgurl: 'https://www.langhai.net/assets/images/langhai-logo.png',
    desc: '浪海导航 ~ 收录各种类型的博客以及论坛网站',
    siteurl: 'https://www.langhai.net/',
  },
  {
    title: 'AULyPcのBlog',
    imgurl: 'https://image.aulypc0x0.online/data/system/favicon_amiya.png',
    desc: '今日も生きててえらい ☁',
    siteurl: 'https://blog.aulypc0x0.online',
  },
  {
    title: '小泽日记',
    imgurl: 'https://www.lik.cc/1.webp',
    desc: '走走停停，或南或北',
    siteurl: 'https://www.lik.cc/',
  },
]
