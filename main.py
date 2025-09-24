from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import hashlib
import os
import json


app = FastAPI()

# Enable CORS so that the frontend hosted on a different origin can make API calls.
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify the exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Determine paths to data files relative to this file's directory
BASE_DIR = os.path.dirname(__file__)
USERS_FILE = os.path.join(BASE_DIR, 'users.json')
CONTRACTORS_FILE = os.path.join(BASE_DIR, 'contractors.json')

# Additional data files for orders and posts
ORDERS_FILE = os.path.join(BASE_DIR, 'orders.json')
POSTS_FILE = os.path.join(BASE_DIR, 'posts.json')


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


# Helper functions to load and save various data sets

def load_contractors():
    """Load contractors from JSON file."""
    try:
        with open(CONTRACTORS_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception:
        return []


def save_contractors(contractors):
    """Save contractors to JSON file."""
    with open(CONTRACTORS_FILE, 'w', encoding='utf-8') as f:
        json.dump(contractors, f, ensure_ascii=False, indent=2)


def load_orders():
    """Load orders from JSON file."""
    try:
        with open(ORDERS_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception:
        return []


def save_orders(orders):
    """Save orders to JSON file."""
    with open(ORDERS_FILE, 'w', encoding='utf-8') as f:
        json.dump(orders, f, ensure_ascii=False, indent=2)


def load_posts():
    """Load posts from JSON file."""
    try:
        with open(POSTS_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception:
        return []


def save_posts(posts):
    """Save posts to JSON file."""
    with open(POSTS_FILE, 'w', encoding='utf-8') as f:
        json.dump(posts, f, ensure_ascii=False, indent=2)


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


class ContractorProfile(BaseModel):
    """Data model for contractor profile."""
    username: str
    full_name: str | None = None
    category: str | None = None
    city: str | None = None
    description: str | None = None
    rating: float | None = None
    experience_years: int | None = None
    socials: dict[str, str] | None = None


class OrderRequest(BaseModel):
    """Data model for a task/order."""
    username: str  # owner of the order
    title: str
    category: str
    description: str
    budget: float | None = None
    deadline: str | None = None
    address: str | None = None


class PostRequest(BaseModel):
    """Data model for a social post."""
    username: str
    content: str
    image: str | None = None  # optional URL or base64


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
    return load_contractors()


# Additional API endpoints for full platform functionality

@app.get('/api/contractors/{username}')
def get_contractor(username: str):
    """Get a single contractor profile by username."""
    contractors = load_contractors()
    for c in contractors:
        if c.get('username') == username:
            return c
    raise HTTPException(status_code=404, detail="Contractor not found")


@app.post('/api/contractors/{username}')
def update_contractor(username: str, profile: ContractorProfile):
    """Create or update a contractor profile."""
    # Ensure path username matches body username
    if profile.username != username:
        raise HTTPException(status_code=400, detail="Username mismatch")
    contractors = load_contractors()
    updated = False
    for idx, c in enumerate(contractors):
        if c.get('username') == username:
            contractors[idx] = profile.dict()
            updated = True
            break
    if not updated:
        contractors.append(profile.dict())
    save_contractors(contractors)
    return {"message": "Profile saved", "profile": profile.dict()}


@app.post('/api/orders')
def create_order(order: OrderRequest):
    """Create a new order (task)."""
    orders = load_orders()
    new_id = (orders[-1]['id'] + 1) if orders else 1
    order_dict = order.dict()
    order_dict['id'] = new_id
    order_dict['status'] = 'open'
    orders.append(order_dict)
    save_orders(orders)
    return {"message": "Order created", "order": order_dict}


@app.get('/api/orders')
def list_orders(category: str | None = None, username: str | None = None):
    """List orders, optionally filtered by category or owner username."""
    orders = load_orders()
    filtered = orders
    if category:
        filtered = [o for o in filtered if o.get('category') == category]
    if username:
        filtered = [o for o in filtered if o.get('username') == username]
    return filtered


@app.get('/api/orders/{order_id}')
def get_order(order_id: int):
    """Get single order by id."""
    orders = load_orders()
    for o in orders:
        if o.get('id') == order_id:
            return o
    raise HTTPException(status_code=404, detail="Order not found")


@app.post('/api/posts')
def create_post(post: PostRequest):
    """Create a new social post."""
    posts = load_posts()
    new_id = (posts[-1]['id'] + 1) if posts else 1
    post_dict = post.dict()
    post_dict['id'] = new_id
    posts.append(post_dict)
    save_posts(posts)
    return {"message": "Post created", "post": post_dict}


@app.get('/api/posts')
def list_posts(username: str | None = None):
    """List social posts, optionally filtered by username."""
    posts = load_posts()
    if username:
        posts = [p for p in posts if p.get('username') == username]
    posts_sorted = sorted(posts, key=lambda p: p.get('id', 0), reverse=True)
    return posts_sorted