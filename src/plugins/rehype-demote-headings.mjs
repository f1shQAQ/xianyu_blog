import { visit } from 'unist-util-visit'

// The post title is the page's <h1>. If a post body also uses `#`,
// shift every heading down one level so the outline stays valid.
export function rehypeDemoteHeadings() {
  return tree => {
    let hasH1 = false
    visit(tree, 'element', node => {
      if (node.tagName === 'h1') hasH1 = true
    })
    if (!hasH1) return
    visit(tree, 'element', node => {
      const m = /^h([1-5])$/.exec(node.tagName)
      if (m) node.tagName = `h${Number(m[1]) + 1}`
    })
  }
}
