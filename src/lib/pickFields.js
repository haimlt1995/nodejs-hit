/**
 * Copies a fixed set of fields out of a raw request body.
 *
 * Anything not named is dropped, so a body carrying _id cannot write it. Absent
 * fields are skipped rather than copied as null, which lets schema defaults
 * apply. Pure, so it is easy to test.
 *
 * @param {object} requestBody - Parsed request body.
 * @param {Array<string>} fieldNames - The fields a client may write.
 * @returns {object} Only those fields that were actually sent.
 */
export function pickFields(requestBody, fieldNames) {
  const pickedFields = {};

  // An empty or broken body arrives as null, or as something that is not an object.
  if (requestBody === null || typeof requestBody !== 'object') {
    return pickedFields;
  }

  for (const fieldName of fieldNames) {
    const fieldValue = requestBody[fieldName];

    // Strict checks, so null never overwrites a default.
    if (fieldValue !== undefined && fieldValue !== null) {
      pickedFields[fieldName] = fieldValue;
    }
  }

  return pickedFields;
}
