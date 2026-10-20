import { visit } from 'unist-util-visit'

// Images in post bodies are below the fold: load them lazily
export function rehypeLazyImages() {
  return (tree, file) => {
    // Astro 5 would download and optimize remote body images on image.domains
    // at build time; the image host rejects those requests (403), so keep them
    // as plain <img> like Astro 4 did. Covers still go through ImageWrapper.
    if (file.data.astro?.remoteImagePaths) file.data.astro.remoteImagePaths = []
    visit(tree, 'element', node => {
      if (node.tagName !== 'img') return
      node.properties ??= {}
      node.properties.loading ??= 'lazy'
      node.properties.decoding ??= 'async'
    })
  }
}
