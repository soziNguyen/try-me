export function lookupUser(field) {
  return [
    {
      $lookup: {
        from: 'Users',
        localField: field,
        foreignField: '_id',
        as: field
      }
    },
    {
      $unwind: { path: `$${field}`, preserveNullAndEmptyArrays: true }
    }
  ]
}

export function lookupRef(field, from, options = {}) {
  const {
    as = field,
    unwind = true,
    preserveNullAndEmptyArrays = true
  } = options

  const stages = [
    {
      $lookup: {
        from,
        localField: field,
        foreignField: '_id',
        as
      }
    }
  ]

  if (unwind) {
    stages.push({
      $unwind: {
        path: `$${as}`,
        preserveNullAndEmptyArrays
      }
    })
  }

  return stages
}
