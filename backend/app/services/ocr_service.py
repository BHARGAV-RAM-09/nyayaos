from io import BytesIO

from PIL import Image
import pytesseract


class OCRService:

    @staticmethod
    def extract_text(file_data: bytes) -> str:
        """
        Extract text from an image using Tesseract OCR.

        Args:
            file_data: Image file as bytes.

        Returns:
            Extracted text as a string.
        """

        image = Image.open(BytesIO(file_data))

        extracted_text = pytesseract.image_to_string(
            image,
            lang="eng"
        )

        return extracted_text.strip()