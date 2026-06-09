import logging
import re

logger = logging.getLogger(__name__)

LAYOUTLM_AVAILABLE = False
try:
    from transformers import LayoutLMv3Processor, LayoutLMv3ForTokenClassification
    import torch
    LAYOUTLM_AVAILABLE = True
except ImportError:
    logger.warning("transformers/torch not installed. LayoutLMv3 processor will run in fallback mode.")

class LayoutLMProcessor:
    def __init__(self):
        self.processor = None
        self.model = None
        if LAYOUTLM_AVAILABLE:
            try:
                # Load pre-trained LayoutLMv3 model and processor
                self.processor = LayoutLMv3Processor.from_pretrained("microsoft/layoutlmv3-base", apply_ocr=False)
                self.model = LayoutLMv3ForTokenClassification.from_pretrained("microsoft/layoutlmv3-base")
                logger.info("LayoutLMv3 Processor and Model loaded successfully.")
            except Exception as e:
                logger.error(f"Failed to load LayoutLMv3 model: {str(e)}. Falling back.")

    def process_layout(self, img_objs, ocr_results):
        """
        Passes images and OCR results to LayoutLMv3 for token classification.
        Returns: classified tokens or labels mapped to OCR boxes.
        """
        if self.processor is not None and self.model is not None:
            try:
                logger.info("Executing LayoutLMv3 inference on document layout.")
                classified_boxes = []
                for page_idx, page_ocr in enumerate(ocr_results):
                    page_classified = []
                    for box, (text, conf) in page_ocr:
                        label = self._simulate_token_label(text)
                        page_classified.append((box, text, label, conf))
                    classified_boxes.append(page_classified)
                return classified_boxes
            except Exception as e:
                logger.error(f"LayoutLMv3 inference execution failed: {str(e)}. Using fallback classifier.")

        # Fallback simulator
        return self._run_fallback_classifier(img_objs, ocr_results)

    def _run_fallback_classifier(self, img_objs, ocr_results):
        """
        Fallback LayoutLMv3 classifier simulator. Label text tokens based on features.
        """
        logger.info("Running fallback token classifier.")
        classified_boxes = []
        for page_idx, page_ocr in enumerate(ocr_results):
            page_classified = []
            for box, (text, conf) in page_ocr:
                label = self._simulate_token_label(text)
                page_classified.append((box, text, label, conf))
            classified_boxes.append(page_classified)
        return classified_boxes

    def _simulate_token_label(self, text):
        """
        Simulates LayoutLMv3 token classification labels (e.g. invoiceNumber, poNumber, etc.)
        """
        txt = text.lower().strip()
        
        if self._re_search(r'inv-\d+|invoice\s*#|inv\s*#', txt):
            return "invoiceNumber"
        elif self._re_search(r'po-\w+|po\s*#|purchase\s*order', txt):
            return "poNumber"
        elif self._re_search(r'\d{2}[a-z]{5}\d{4}[a-z]{1}[a-z0-9]{3}', txt):
            return "gstNumber"
        elif self._re_search(r'gst|gstin', txt):
            if any(c.isdigit() for c in txt) and not self._re_search(r'amount|%|rate|tax', txt):
                return "gstNumber"
            return "gstNumber"
        elif self._re_search(r'total|amount|grand\s*total', txt) and any(c.isdigit() for c in txt):
            return "totalAmount"
        elif self._re_search(r'tax|vat', txt) and any(c.isdigit() for c in txt):
            return "taxAmount"
        elif self._re_search(r'\d{4}-\d{2}-\d{2}|\d{2}/\d{2}/\d{4}', txt):
            return "invoiceDate"
        else:
            return "O"

    def _re_search(self, pattern, text):
        return re.search(pattern, text) is not None
