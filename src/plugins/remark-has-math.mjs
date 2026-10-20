import { visit } from 'unist-util-visit'

// Flags posts that contain math (nodes created by remark-math),
// so the KaTeX stylesheet is only loaded where it is needed
export function remarkHasMath() {
  return (tree, { data }) => {
    let hasMath = false
    visit(tree, ['math', 'inlineMath'], () => {
      hasMath = true
      return false
    })
    data.astro.frontmatter.hasMath = hasMath
  }
}
