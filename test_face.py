from app.face_service import generate_embedding

embedding = generate_embedding(
    r"C:\Users\HP\Downloads\AVAR-main\backend\app\uploads\faces\5092f314-7c62-4be0-81e0-e6def830c8fa.jpg"
)

print(len(embedding))