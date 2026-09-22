from pathlib import Path

from app.services.pdf_service import PDFService


PDF_FILE = Path("W26_FEES_merged.pdf")


def main():
    if not PDF_FILE.exists():
        print(f"PDF not found: {PDF_FILE}")
        return

    file_data = PDF_FILE.read_bytes()

    extracted_text = PDFService.extract_text(file_data)

    print("\n==============================")
    print("PDF EXTRACTION TEST")
    print("==============================")

    print(f"File: {PDF_FILE.name}")
    print(f"Size: {len(file_data)} bytes")
    print(f"Extracted characters: {len(extracted_text)}")

    print("\n========== EXTRACTED TEXT ==========\n")

    print(extracted_text[:5000])

    print("\n====================================")


if __name__ == "__main__":
    main()