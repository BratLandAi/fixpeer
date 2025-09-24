from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import hashlib
import os
import json


app = FastAPI()

# Determine paths to data files relative to this file's directory
BASE_DIR = os.path.dirname(__file__)
USERS_FILE = os.path.join(BASE_DIR, 'users.json')
CONTRACTORS_FILE = os.path.join(BASE_DIR, 'contractors.json')


def load_users():
    """Load users from JSON file."""
    try:
        with open(USERS_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception:
        return {}


def save_users(users):
    """Save users to JSON file."""
    with open(USERS_FILE, 'w', encoding='utf-8') as f:
        json.dump(users, f, ensure_ascii=False, indent=2)


def hash_password(password: str, salt: str | None = None) -> str:
    """Hash a password with an optional salt. If no salt is provided, generate one."""
    if salt is None:
        # Generate a random 16-byte salt and convert to hex for storage
        salt = os.urandom(16).hex()
    # Prepend salt to password before hashing
    hashed = hashlib.sha256((salt + password).encode('utf-8')).hexdigest()
    return f"{salt}:{hashed}"


def verify_password(stored: str, provided: str) -> bool:
    """Verify a provided password against the stored salted hash."""
    try:
        salt, _ = stored.split(':')
    except ValueError:
        return False
    return hash_password(provided, salt) == stored


class RegisterRequest(BaseModel):
    username: str
    password: str
    email: str


class LoginRequest(BaseModel):
    username: str
    password: str


@app.post('/api/register')
def register(req: RegisterRequest):
    """Register a new user with username, email and password."""
    users = load_users()
    if req.username in users:
        raise HTTPException(status_code=400, detail="User already exists")
    password_hash = hash_password(req.password)
    users[req.username] = {
        "username": req.username,
        "email": req.email,
        "password": password_hash
    }
    save_users(users)
    return {"message": "User registered"}


@app.post('/api/login')
def login(req: LoginRequest):
    """Authenticate user by username and password."""
    users = load_users()
    user = users.get(req.username)
    if not user or not verify_password(user['password'], req.password):
        raise HTTPException(status_code=400, detail="Invalid username or password")
    return {"message": "Login successful", "username": req.username}


@app.get('/api/contractors')
def get_contractors():
    """Return a list of contractor profiles."""
    try:
        with open(CONTRACTORS_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception:
        return []