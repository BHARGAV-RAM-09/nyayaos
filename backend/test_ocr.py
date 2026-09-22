from pathlib import Path

from app.services.ocr_service import OCRService


IMAGE_FILE = Path("test_ocr.png")


def main():
    if not IMAGE_FILE.exists():
        print(f"Image not found: {IMAGE_FILE}")
        return

    file_data = IMAGE_FILE.read_bytes()

    extracted_text = OCRService.extract_text(file_data)

    print("\n==============================")
    print("OCR TEST")
    print("==============================")

    print(f"File: {IMAGE_FILE.name}")
    print(f"Size: {len(file_data)} bytes")
    print(f"Extracted characters: {len(extracted_text)}")

    print("\n========== EXTRACTED TEXT ==========\n")

    print(extracted_text)

    print("\n====================================")


if __name__ == "__main__":
    main()