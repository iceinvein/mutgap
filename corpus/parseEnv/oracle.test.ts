import { expect, test } from 'vitest'
import { parseEnv } from './parseEnv'

test('a value containing = keeps everything after the first =', () => {
  expect(parseEnv('DATABASE_URL=postgres://h/db?sslmode=require')).toEqual({
    DATABASE_URL: 'postgres://h/db?sslmode=require',
  })
})

test('export prefix, comments, blanks and quotes', () => {
  expect(parseEnv('# c\n\nexport A="1"\nB=\'two\'\nC=\nnoequals')).toEqual({ A: '1', B: 'two', C: '' })
})

test('a lone double quote is kept', () => {
  expect(parseEnv('Q="')).toEqual({ Q: '"' })
})
