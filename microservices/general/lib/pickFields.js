// keeps only the fields a client is allowed to send
export function pickFields(requestBody, fieldNames) {
  const pickedFields = {};

  // an empty or broken body arrives as null
  if (requestBody === null || typeof requestBody !== 'object') {
    return pickedFields;
  }

  for (const fieldName of fieldNames) {
    const fieldValue = requestBody[fieldName];

    // skip what was not sent, so defaults still apply
    if (fieldValue !== undefined && fieldValue !== null) {
      pickedFields[fieldName] = fieldValue;
    }
  }

  return pickedFields;
}
