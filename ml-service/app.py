import os
import logging
import tempfile
import requests
from flask import Flask, jsonify, request
from flask_cors import CORS
from dotenv import load_dotenv

# Import OCR modular components
from ocr.document_loader import load_document
from ocr.ocr_engine import OCREngine
from ocr.layoutlm_processor import LayoutLMProcessor
from ocr.field_extractor import FieldExtractor
from validation.validation import validate_and_sanitize

# Initialize Logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger(__name__)

# Load Environment Variables
load_dotenv()

# Global in-memory cache for status/result retrieval
EXTRACTION_CACHE = {}

# Instantiate OCR Pipeline helpers
ocr_engine = OCREngine()
layoutlm_processor = LayoutLMProcessor()
field_extractor = FieldExtractor()

def download_file(url):
    """
    Downloads document from URL to a local temporary path.
    Optimizes for local uploads directory sharing if hosts align.
    """
    try:
        logger.info(f"Downloading file from URL: {url}")
        
        # If url points to local backend uploads directory, try to read directly to avoid networking loopbacks
        if 'localhost:5000/uploads/' in url or '127.0.0.1:5000/uploads/' in url:
            filename = url.split('/uploads/')[-1]
            local_path = os.path.abspath(os.path.join(os.getcwd(), '..', 'backend', 'uploads', filename))
            if os.path.exists(local_path):
                logger.info(f"Resolved URL to local sibling file path: {local_path}")
                return local_path

        # Fallback to standard HTTP download
        response = requests.get(url, timeout=15)
        if response.status_code != 200:
            raise Exception(f"Failed to fetch file, HTTP status code: {response.status_code}")
        
        ext = '.pdf'
        if '.png' in url.lower():
            ext = '.png'
        elif '.jpg' in url.lower():
            ext = '.jpg'
        elif '.jpeg' in url.lower():
            ext = '.jpeg'
            
        fd, temp_path = tempfile.mkstemp(suffix=ext)
        with os.fdopen(fd, 'wb') as tmp:
            tmp.write(response.content)
        logger.info(f"Downloaded file written to temp path: {temp_path}")
        return temp_path
    except Exception as e:
        logger.error(f"Download failed for URL '{url}': {str(e)}")
        raise e

def create_app():
    app = Flask(__name__)
    CORS(app)
    
    @app.route('/health', methods=['GET'])
    def health_check():
        return jsonify({
            "status": "success",
            "service": "ml-service"
        }), 200

    @app.route('/api/extract/<invoice_id>', methods=['POST'])
    def trigger_extraction(invoice_id):
        logger.info(f"Extraction attempt started for invoice: {invoice_id}")
        data = request.get_json() or {}
        file_url = data.get('fileUrl')
        
        if not file_url:
            logger.error("No fileUrl provided in request body")
            return jsonify({
                "status": "error",
                "message": "fileUrl is required in request body"
            }), 400

        # Mark status as Processing in cache
        EXTRACTION_CACHE[invoice_id] = {
            "invoiceId": invoice_id,
            "extractionStatus": "Processing",
            "extractedData": None,
            "confidenceScores": None
        }

        temp_path = None
        try:
            # 1. Download file
            temp_path = download_file(file_url)
            
            # 2. Convert PDF to images
            img_objs = load_document(temp_path)
            if not img_objs:
                raise ValueError("No images generated/loaded from document")
            
            # 3. Run PaddleOCR
            ocr_results = ocr_engine.run_ocr(img_objs, temp_path)
            if not ocr_results:
                raise ValueError("OCR Engine failed to extract text blocks")
            
            # 4. Pass OCR output to LayoutLMv3
            classified_boxes = layoutlm_processor.process_layout(img_objs, ocr_results)
            if not classified_boxes:
                raise ValueError("LayoutLM processor failed to classify tokens")
                
            # 5. Extract structured invoice fields & Confidence scores
            raw_extracted, confidence_scores = field_extractor.extract_fields(classified_boxes)
            
            # 6. Validate and Sanitize values
            extracted_data = validate_and_sanitize(raw_extracted)

            result = {
                "invoiceId": invoice_id,
                "extractionStatus": "Completed",
                "extractedData": extracted_data,
                "confidenceScores": confidence_scores
            }
            EXTRACTION_CACHE[invoice_id] = result
            
            logger.info(f"Extraction attempt completed successfully for invoice: {invoice_id}")
            return jsonify(result), 200

        except Exception as e:
            logger.error(f"Extraction attempt failed for invoice {invoice_id}: {str(e)}", exc_info=True)
            result = {
                "invoiceId": invoice_id,
                "extractionStatus": "Failed",
                "extractedData": None,
                "confidenceScores": None,
                "error": str(e)
            }
            EXTRACTION_CACHE[invoice_id] = result
            return jsonify(result), 500
            
        finally:
            # Clean up temporary downloads
            if temp_path and os.path.exists(temp_path):
                # Only delete if it's a real temp file in temporary folders
                if 'tmp' in temp_path or 'temp' in temp_path:
                    try:
                        os.remove(temp_path)
                        logger.info(f"Cleaned up temp file: {temp_path}")
                    except Exception as ex:
                        logger.error(f"Failed to remove temp file {temp_path}: {str(ex)}")

    @app.route('/api/extract/<invoice_id>', methods=['GET'])
    def get_extraction_result(invoice_id):
        logger.info(f"Retrieve extraction result for invoice: {invoice_id}")
        result = EXTRACTION_CACHE.get(invoice_id)
        if not result:
            return jsonify({
                "status": "error",
                "message": f"No extraction record found for invoice: {invoice_id}"
            }), 404
        return jsonify(result), 200

    @app.errorhandler(404)
    def not_found(error):
        return jsonify({
            "status": "error",
            "message": "Resource not found"
        }), 404

    @app.errorhandler(Exception)
    def handle_exception(e):
        logger.error(f"Unhandled exception: {str(e)}", exc_info=True)
        return jsonify({
            "status": "error",
            "message": "Internal server error"
        }), 500

    return app

app = create_app()

if __name__ == '__main__':
    port = int(os.getenv('PORT', 8000))
    debug = os.getenv('FLASK_ENV', 'development') == 'development'
    logger.info(f"Starting ML-Service on port {port}...")
    app.run(host='0.0.0.0', port=port, debug=debug)
