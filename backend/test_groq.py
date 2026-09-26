from app.services.groq_service import GroqService


def main():
    service = GroqService()
    result = service.test_connection()

    print("RESULT:", result)


if __name__ == "__main__":
    main()