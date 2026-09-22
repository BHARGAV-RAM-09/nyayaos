import fitz


class PDFService:

    @staticmethod
    def extract_text(file_data: bytes) -> str:
        """
        Extract text from a PDF provided as bytes.
        """

        document = fitz.open(
            stream=file_data,
            filetype="pdf"
        )

        extracted_text = []

        for page in document:
            text = page.get_text()

            if text:
                extracted_text.append(text)

        document.close()

        return "\n".join(extracted_text).strip()