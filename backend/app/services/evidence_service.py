from app.services.supabase_client import supabase


BUCKET_NAME = "evidence"


class EvidenceStorageService:

    @staticmethod
    def upload_file(
        file_path: str,
        file_data: bytes,
        content_type: str
    ):
        return supabase.storage.from_(BUCKET_NAME).upload(
            path=file_path,
            file=file_data,
            file_options={
                "content-type": content_type,
                "upsert": False
            }
        )

    @staticmethod
    def download_file(file_path: str):
        return supabase.storage.from_(BUCKET_NAME).download(file_path)

    @staticmethod
    def delete_file(file_path: str):
        return supabase.storage.from_(BUCKET_NAME).remove([file_path])

    @staticmethod
    def get_file_path(file_path: str):
        return f"{BUCKET_NAME}/{file_path}"