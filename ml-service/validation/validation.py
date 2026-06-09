import logging
from datetime import datetime
import re

logger = logging.getLogger(__name__)

def validate_and_sanitize(extracted_data):
    """
    Validates and sanitizes the extracted fields (types and formatting).
    """
    sanitized = {}
    
    sanitized["invoiceNumber"] = str(extracted_data.get("invoiceNumber", "")).strip()
    sanitized["poNumber"] = str(extracted_data.get("poNumber", "")).strip()
    sanitized["vendorName"] = str(extracted_data.get("vendorName", "")).strip()
    sanitized["gstNumber"] = str(extracted_data.get("gstNumber", "")).strip()

    # Normalize Date
    date_str = str(extracted_data.get("invoiceDate", "")).strip()
    normalized_date = ""
    for fmt in ('%Y-%m-%d', '%d/%m/%Y', '%m/%d/%Y', '%B %d, %Y', '%d %b %Y', '%Y-%m-%dT%H:%M:%S.%fZ'):
        try:
            # Strip timezone Z or parse properly
            clean_date_str = date_str
            if date_str.endswith('Z'):
                clean_date_str = date_str[:-1]
                parsed_date = datetime.strptime(clean_date_str.split('.')[0], '%Y-%m-%dT%H:%M:%S')
            else:
                parsed_date = datetime.strptime(date_str, fmt)
            normalized_date = parsed_date.strftime('%Y-%m-%d')
            break
        except ValueError:
            continue
    
    if not normalized_date:
        logger.warning(f"Could not normalize date '{date_str}', using fallback.")
        normalized_date = date_str if date_str else datetime.now().strftime('%Y-%m-%d')
    
    sanitized["invoiceDate"] = normalized_date

    # Normalize Amounts
    for amount_key in ["totalAmount", "taxAmount"]:
        val = str(extracted_data.get(amount_key, "")).strip()
        # Remove currency symbols and formatting commas
        clean_val = re.sub(r'[^\d\.]', '', val)
        try:
            float_val = float(clean_val)
            sanitized[amount_key] = f"{float_val:.2f}"
        except ValueError:
            logger.warning(f"Could not parse amount '{val}' for {amount_key}. Defaulting.")
            sanitized[amount_key] = "0.00"

    return sanitized
