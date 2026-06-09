/**
 * Service to validate extracted invoice fields against vendor-specific mandatory requirements.
 */
const validationService = {
  /**
   * Validates extracted fields against vendor requirements
   * @param {Object} extractedData - The fields extracted by OCR
   * @param {Array<string>} mandatoryFields - The list of mandatory fields for the vendor
   * @returns {Object} Output structure { isValid: boolean, missingFields: Array<string> }
   */
  validateFields: (extractedData, mandatoryFields) => {
    const missingFields = [];

    if (!mandatoryFields || !Array.isArray(mandatoryFields)) {
      return {
        isValid: true,
        missingFields: []
      };
    }

    const data = extractedData || {};

    mandatoryFields.forEach((field) => {
      const value = data[field];
      
      // Determine if the field is considered missing/empty
      if (
        value === null ||
        value === undefined ||
        (typeof value === 'string' && value.trim() === '') ||
        (typeof value === 'number' && isNaN(value))
      ) {
        // Map schema field names to user-friendly titles if needed, but return the exact field key
        missingFields.push(field);
      }
    });

    return {
      isValid: missingFields.length === 0,
      missingFields
    };
  }
};

export default validationService;
