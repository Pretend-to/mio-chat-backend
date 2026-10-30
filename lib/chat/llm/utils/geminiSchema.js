/** Project JSON Schema type unions into Gemini's scalar Type + nullable/anyOf.
 * Only schema-bearing fields are traversed; defaults/examples are literal data.
 * Always clone so provider projection cannot change tool registration hashes or
 * the schema later sent to OpenAI/Anthropic.
 */
export function normalizeGeminiSchema(schema) {
  if (!schema || typeof schema !== 'object' || Array.isArray(schema))
    return schema
  const result = structuredClone(schema)
  for (const field of [
    'properties',
    '$defs',
    'definitions',
    'patternProperties',
  ]) {
    if (result[field] && typeof result[field] === 'object') {
      result[field] = Object.fromEntries(
        Object.entries(result[field]).map(([key, value]) => [
          key,
          normalizeGeminiSchema(value),
        ]),
      )
    }
  }
  for (const field of ['items', 'additionalProperties', 'not']) {
    if (result[field] && typeof result[field] === 'object') {
      result[field] = normalizeGeminiSchema(result[field])
    }
  }
  for (const field of ['anyOf', 'oneOf', 'allOf', 'prefixItems']) {
    if (Array.isArray(result[field]))
      result[field] = result[field].map(normalizeGeminiSchema)
  }
  if (!Array.isArray(result.type)) return result

  const types = [...new Set(result.type)]
  const nullable = types.includes('null')
  const nonNullTypes = types.filter((type) => type !== 'null')
  if (nonNullTypes.length <= 1) {
    result.type = nonNullTypes[0] || 'null'
    if (nullable) result.nullable = true
    return result
  }

  // Keep type-specific constraints on the matching alternative rather than
  // leaving e.g. required/properties on a parent without type: object.
  const branches = nonNullTypes.map((type) => {
    const branch = { ...result, type }
    if (type !== 'object') {
      for (const key of [
        'properties',
        'required',
        'minProperties',
        'maxProperties',
        'propertyOrdering',
      ])
        delete branch[key]
    }
    if (type !== 'array') {
      for (const key of ['items', 'minItems', 'maxItems']) delete branch[key]
    }
    if (type !== 'string') {
      for (const key of ['minLength', 'maxLength', 'pattern'])
        delete branch[key]
    }
    if (type !== 'number' && type !== 'integer') {
      for (const key of ['minimum', 'maximum', 'multipleOf']) delete branch[key]
    }
    return branch
  })
  return {
    ...(result.description !== undefined
      ? { description: result.description }
      : {}),
    ...(result.title !== undefined ? { title: result.title } : {}),
    anyOf: branches,
    ...(nullable || result.nullable ? { nullable: true } : {}),
  }
}
