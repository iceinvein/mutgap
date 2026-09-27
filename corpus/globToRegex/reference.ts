export function globToRegex(pattern: string): RegExp {
  let re = ''
  let i = 0
  while (i < pattern.length) {
    const ch = pattern[i]
    if (ch === '*') {
      if (pattern[i + 1] === '*') {
        re += '.*'
        i += 2
        if (pattern[i] === '/') i += 1
      } else {
        re += '[^/]*'
        i += 1
      }
    } else if (ch === '?') {
      re += '[^/]'
      i += 1
    } else if (ch && /[.+^$()|[\]\\{}]/.test(ch)) {
      re += `\\${ch}`
      i += 1
    } else {
      re += ch ?? ''
      i += 1
    }
  }
  return new RegExp(`^${re}$`)
}
