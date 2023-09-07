function buildExchangeQuery(filters) {
  const query = { $and: []};

  Object.entries(filters).forEach(([key, value]) => {
    if(!value) return;

    if((typeof value[0] || typeof value[1]) == 'number' || null) {
      let minValue = { $gte: value[0] };
      let maxValue = { $lte: value[1] };

      if(minValue.$gte) query.$and.push({ [key]: minValue });
      if(maxValue.$lte) query.$and.push({ [key]: maxValue });
    } else if(typeof value[0] == 'string') {
      if(key == 'origin' || key == 'destination') {
        const city = value.split(',')[0].trim();
        // TODO: toLowerCase()
        query.$and.push({ [key]: { $in: city } })
      } else {
        query.$and.push({ [key]: { $in: value } })
      }
    }
  });

  return query.$and.length > 0 ? query : {};
}

module.exports = buildExchangeQuery;