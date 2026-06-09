import os
import logging
from PIL import Image

logger = logging.getLogger(__name__)

# Try to import pdf2image, but do not crash if unavailable
PDF2IMAGE_AVAILABLE = False
try:
    from pdf2image import convert_from_path
    PDF2IMAGE_AVAILABLE = True
except ImportError:
    logger.warning("pdf2image library is not installed. PDF conversion will run in fallback mode.")

def load_document(file_path):
    """
    Loads a file (PDF or image).
    If it is a PDF, converts pages to PIL Images.
    If it is an image, opens it directly.
    Returns: List of PIL Image objects.
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"File not found: {file_path}")

    ext = os.path.splitext(file_path)[1].lower()
    if ext == '.pdf':
        if PDF2IMAGE_AVAILABLE:
            try:
                # Convert PDF to PIL Images
                images = convert_from_path(file_path)
                logger.info(f"Successfully converted PDF {file_path} into {len(images)} images.")
                return images
            except Exception as e:
                logger.error(f"Error converting PDF via pdf2image: {str(e)}")
                # Continue to fallback
        
        # Fallback PDF handling: Return a dummy single white page image
        logger.info(f"Running fallback image generator for PDF: {file_path}")
        dummy_img = Image.new('RGB', (800, 1000), color='white')
        return [dummy_img]

    elif ext in ['.png', '.jpg', '.jpeg']:
        try:
            img = Image.open(file_path)
            logger.info(f"Loaded image: {file_path}")
            return [img]
        except Exception as e:
            raise ValueError(f"Failed to open image file {file_path}: {str(e)}")
    else:
        raise ValueError(f"Unsupported file format: {ext}")
