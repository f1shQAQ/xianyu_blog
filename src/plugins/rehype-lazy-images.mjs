import { visit } from 'unist-util-visit'

// Images in post bodies are below the fold: load them lazily
export function rehypeLazyImages() {
  return tree => {
    visit(tree, 'element', node => {
      if (node.tagName !== 'img') return
      node.properties ??= {}
      node.properties.loading ??= 'lazy'
      node.properties.decoding ??= 'async'
    })
  }
}
