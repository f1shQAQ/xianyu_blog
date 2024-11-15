import type {
  CommentConfig,
  LicenseConfig,
  NavBarConfig,
  ProfileConfig,
  SiteConfig,
} from './types/config'
import { LinkPreset } from './types/config'

export const siteConfig: SiteConfig = {
  title: '咸鱼小窝',
  subtitle: '只是一条没有梦想的咸鱼',
  lang: 'zh_CN',         // 'en', 'zh_CN', 'zh_TW', 'ja', 'ko'
  themeColor: {
    hue: 250,         // Default hue for the theme color, from 0 to 360. e.g. red: 0, teal: 200, cyan: 250, pink: 345
    fixed: false,     // Hide the theme color picker for visitors
  },
  banner: {
    enable: true,
    src: 'https://bu.dusays.com/2024/09/15/66e5fd7c0ee60.webp',   // Relative to the /src directory. Relative to the /public directory if it starts with '/'
    position: 'center',      // Equivalent to object-position, only supports 'top', 'center', 'bottom'. 'center' by default
    credit: {
      enable: true,         // Display the credit text of the banner image
      text: '空色天絵 / NEO TOKYO NOIR 01',              // Credit text to be displayed
      url: 'https://www.pixiv.net/artworks/111024784'                // (Optional) URL link to the original artwork or artist's page
    }
  },
  favicon: [    // Leave this array empty to use the default favicon
    // {
    //   src: '/favicon/icon.png',    // Path of the favicon, relative to the /public directory
    //   theme: 'light',              // (Optional) Either 'light' or 'dark', set only if you have different favicons for light and dark mode
    //   sizes: '32x32',              // (Optional) Size of the favicon, set only if you have favicons of different sizes
    // }
  ]
}

export const navBarConfig: NavBarConfig = {
  links: [
    LinkPreset.Home,
    LinkPreset.Archive,
    LinkPreset.About,
    LinkPreset.Friends,
    // {
    //   name: 'GitHub',
    //   url: 'https://github.com/saicaca/fuwari',     // Internal links should not include the base path, as it is automatically added
    //   external: true,                               // Show an external link icon and will open in a new tab
    // },
  ],
}

export const profileConfig: ProfileConfig = {
  avatar: 'https://bu.dusays.com/2023/12/04/656d6235635ef.webp',  // Relative to the /src directory. Relative to the /public directory if it starts with '/'
  name: '没有梦想的咸鱼',
  bio: '我们终将会在没有黑暗的地方相遇',
  links: [
    {
      name: 'Home',
      icon: 'fa6-brands:safari',
      url: 'https://qqquq.com',
    },
    {
      name: 'WeChat',
      icon: 'fa6-brands:weixin',
      url: 'https://empty-navy-952.notion.site/10223da0d568805f8898d2f655531d57?pvs=4',
    },
    {
      name: 'Steam',
      icon: 'fa6-brands:steam',
      url: 'https://steamcommunity.com/profiles/76561199187994629/',
    },
    {
      name: 'Email',
      icon: 'material-symbols:mail',
      url: 'mailto:lfk@live.com',
    }
  ],
}

export const licenseConfig: LicenseConfig = {
  enable: true,
  name: 'CC BY-NC-SA 4.0',
  url: 'https://creativecommons.org/licenses/by-nc-sa/4.0/',
}

export const commentConfig: CommentConfig = {
  twikoo: {
    envId: 'https://comments.qqquq.com',
  },
}
