# estimateCostUsd

`estimateCostUsd(model, usage, pricingTable)` estimates the US dollar cost of
one model call. `usage` holds `inputTokens`, `outputTokens`,
`cacheWriteTokens`, `cacheReadTokens`, `webSearchRequests` and `speed`
(`"standard"` or `"fast"`). `pricingTable` is a `Map` from model name to
`{ inputCostPerToken, outputCostPerToken, cacheWriteCostPerToken,
cacheReadCostPerToken, webSearchCostPerRequest, fastMultiplier }`.

Prices are looked up in this order, and the first hit wins: the model name
exactly in `pricingTable`; the canonical name in `pricingTable`; the model name
exactly in the built-in fallback prices; the canonical name in the fallback
prices. The canonical name is the model name with everything from the first
`@` removed, and then a trailing date suffix of the form `-YYYYMMDD` or
`-YYYY-MM-DD` removed (`claude-3-5-haiku-20241022` becomes `claude-3-5-haiku`).
No prefix or fuzzy matching is done. If nothing matches, the cost is `0`.

The fallback prices, in dollars per million tokens (input, output, cache
write, cache read), are: `claude-opus-4-1` 15, 75, 18.75, 1.5;
`claude-sonnet-4-5` 3, 15, 3.75, 0.3; `claude-3-5-haiku` 0.8, 4, 1, 0.08;
`gpt-4o` 2.5, 10, 2.5, 1.25; `gpt-4o-mini` 0.15, 0.6, 0.15, 0.075. Every
fallback entry charges $0.01 per web search request and has a fast multiplier
of 1.

The cost is each usage count times its matching per-unit price, summed over
the five counts. When `speed` is `"fast"` that sum is multiplied by the
entry's `fastMultiplier`; for `"standard"` it is used as is.
