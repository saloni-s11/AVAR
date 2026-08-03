from pymongo import MongoClient
from dotenv import load_dotenv
import os

load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI")

client = MongoClient(MONGODB_URI)

# Test the connection
client.admin.command("ping")
print("✅ Connected to MongoDB Atlas")

db = client["AVAR"]

users_collection = db["users"]
logs_collection = db["logs"]