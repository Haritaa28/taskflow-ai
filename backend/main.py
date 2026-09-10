from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from pathlib import Path
from datetime import datetime, timedelta, timezone
from jose import jwt, JWTError
import bcrypt

from database import get_connection


# ============================================================
# PATHS
# ============================================================

BASE_DIR = Path(__file__).resolve().parent
FRONTEND_DIR = BASE_DIR.parent / "frontend"


# ============================================================
# FASTAPI APPLICATION
# ============================================================

app = FastAPI(
    title="TaskFlow AI API",
    description="Backend API for TaskFlow AI",
    version="2.0.0"
)


# ============================================================
# CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)


# ============================================================
# JWT CONFIGURATION
# ============================================================

SECRET_KEY = "taskflow-ai-secret-key-change-this-later"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24

security = HTTPBearer()


# ============================================================
# PASSWORD FUNCTIONS
# ============================================================

def hash_password(password: str) -> str:
    """
    Hash a password using bcrypt.

    bcrypt supports a maximum of 72 bytes.
    """

    password_bytes = password.encode("utf-8")

    if len(password_bytes) > 72:
        raise HTTPException(
            status_code=400,
            detail="Password must be 72 bytes or fewer."
        )

    hashed = bcrypt.hashpw(
        password_bytes,
        bcrypt.gensalt()
    )

    return hashed.decode("utf-8")


def verify_password(password: str, hashed_password: str) -> bool:
    """
    Verify a plain password against a bcrypt hash.
    """

    password_bytes = password.encode("utf-8")
    hashed_bytes = hashed_password.encode("utf-8")

    if len(password_bytes) > 72:
        return False

    return bcrypt.checkpw(
        password_bytes,
        hashed_bytes
    )


# ============================================================
# JWT FUNCTIONS
# ============================================================

def create_access_token(user_id: int):
    """
    Create JWT access token.
    """

    expire = datetime.now(timezone.utc) + timedelta(
        minutes=ACCESS_TOKEN_EXPIRE_MINUTES
    )

    payload = {
        "sub": str(user_id),
        "exp": expire
    }

    token = jwt.encode(
        payload,
        SECRET_KEY,
        algorithm=ALGORITHM
    )

    return token


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    Get the logged-in user from JWT token.
    """

    token = credentials.credentials

    try:
        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM]
        )

        user_id = payload.get("sub")

        if user_id is None:
            raise HTTPException(
                status_code=401,
                detail="Invalid authentication token."
            )

        return int(user_id)

    except (JWTError, ValueError):
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired authentication token."
        )


# ============================================================
# PYDANTIC MODELS
# ============================================================

class UserCreate(BaseModel):
    username: str
    email: str
    password: str


class UserLogin(BaseModel):
    email: str
    password: str


class Task(BaseModel):
    title: str
    description: str = ""
    priority: str = "medium"
    category: str = "Other"
    date: str = ""


# ============================================================
# HOME
# ============================================================

@app.get("/")
def home():
    return FileResponse(
        FRONTEND_DIR / "index.html"
    )


# ============================================================
# AUTHENTICATION
# ============================================================

@app.post("/api/auth/signup")
def signup(user: UserCreate):

    username = user.username.strip()
    email = user.email.strip().lower()
    password = user.password

    if not username:
        raise HTTPException(
            status_code=400,
            detail="Username is required."
        )

    if not email:
        raise HTTPException(
            status_code=400,
            detail="Email is required."
        )

    if len(password) < 6:
        raise HTTPException(
            status_code=400,
            detail="Password must contain at least 6 characters."
        )

    connection = get_connection()

    existing_user = connection.execute(
        """
        SELECT id
        FROM users
        WHERE email = ? OR username = ?
        """,
        (email, username)
    ).fetchone()

    if existing_user:
        connection.close()

        raise HTTPException(
            status_code=400,
            detail="Username or email already exists."
        )

    hashed_password = hash_password(password)

    cursor = connection.execute(
        """
        INSERT INTO users
        (username, email, password)
        VALUES (?, ?, ?)
        """,
        (
            username,
            email,
            hashed_password
        )
    )

    connection.commit()

    user_id = cursor.lastrowid

    connection.close()

    token = create_access_token(user_id)

    return {
        "message": "Account created successfully.",
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user_id,
            "username": username,
            "email": email
        }
    }


# ============================================================
# LOGIN
# ============================================================

@app.post("/api/auth/login")
def login(user: UserLogin):

    email = user.email.strip().lower()
    password = user.password

    connection = get_connection()

    existing_user = connection.execute(
        """
        SELECT *
        FROM users
        WHERE email = ?
        """,
        (email,)
    ).fetchone()

    connection.close()

    if existing_user is None:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password."
        )

    if not verify_password(
        password,
        existing_user["password"]
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password."
        )

    token = create_access_token(
        existing_user["id"]
    )

    return {
        "message": "Login successful.",
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": existing_user["id"],
            "username": existing_user["username"],
            "email": existing_user["email"]
        }
    }


# ============================================================
# CURRENT USER
# ============================================================

@app.get("/api/auth/me")
def get_me(
    current_user_id: int = Depends(get_current_user)
):

    connection = get_connection()

    user = connection.execute(
        """
        SELECT id, username, email, created_at
        FROM users
        WHERE id = ?
        """,
        (current_user_id,)
    ).fetchone()

    connection.close()

    if user is None:
        raise HTTPException(
            status_code=404,
            detail="User not found."
        )

    return {
        "id": user["id"],
        "username": user["username"],
        "email": user["email"],
        "created_at": user["created_at"]
    }


# ============================================================
# GET TASKS
# ============================================================

@app.get("/api/tasks")
def get_tasks(
    current_user_id: int = Depends(get_current_user)
):

    connection = get_connection()

    cursor = connection.execute(
        """
        SELECT *
        FROM tasks
        WHERE user_id = ?
        ORDER BY id DESC
        """,
        (current_user_id,)
    )

    rows = cursor.fetchall()

    connection.close()

    tasks = []

    for row in rows:

        tasks.append({
            "id": row["id"],
            "title": row["title"],
            "description": row["description"],
            "priority": row["priority"],
            "category": row["category"],
            "date": row["date"],
            "completed": bool(row["completed"])
        })

    return tasks


# ============================================================
# CREATE TASK
# ============================================================

@app.post("/api/tasks")
def create_task(
    task: Task,
    current_user_id: int = Depends(get_current_user)
):

    if not task.title.strip():
        raise HTTPException(
            status_code=400,
            detail="Task title is required."
        )

    connection = get_connection()

    cursor = connection.execute(
        """
        INSERT INTO tasks
        (
            title,
            description,
            priority,
            category,
            date,
            completed,
            user_id
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (
            task.title.strip(),
            task.description,
            task.priority,
            task.category,
            task.date,
            0,
            current_user_id
        )
    )

    connection.commit()

    task_id = cursor.lastrowid

    connection.close()

    return {
        "message": "Task created successfully.",
        "id": task_id
    }


# ============================================================
# UPDATE TASK
# ============================================================

@app.put("/api/tasks/{task_id}")
def update_task(
    task_id: int,
    task: Task,
    current_user_id: int = Depends(get_current_user)
):

    connection = get_connection()

    existing_task = connection.execute(
        """
        SELECT *
        FROM tasks
        WHERE id = ?
        AND user_id = ?
        """,
        (
            task_id,
            current_user_id
        )
    ).fetchone()

    if existing_task is None:
        connection.close()

        raise HTTPException(
            status_code=404,
            detail="Task not found."
        )

    connection.execute(
        """
        UPDATE tasks
        SET
            title = ?,
            description = ?,
            priority = ?,
            category = ?,
            date = ?
        WHERE id = ?
        AND user_id = ?
        """,
        (
            task.title,
            task.description,
            task.priority,
            task.category,
            task.date,
            task_id,
            current_user_id
        )
    )

    connection.commit()

    connection.close()

    return {
        "message": "Task updated successfully."
    }


# ============================================================
# TOGGLE TASK COMPLETION
# ============================================================

@app.patch("/api/tasks/{task_id}/complete")
def toggle_task(
    task_id: int,
    current_user_id: int = Depends(get_current_user)
):

    connection = get_connection()

    task = connection.execute(
        """
        SELECT completed
        FROM tasks
        WHERE id = ?
        AND user_id = ?
        """,
        (
            task_id,
            current_user_id
        )
    ).fetchone()

    if task is None:
        connection.close()

        raise HTTPException(
            status_code=404,
            detail="Task not found."
        )

    current_status = task["completed"]

    new_status = 0 if current_status == 1 else 1

    connection.execute(
        """
        UPDATE tasks
        SET completed = ?
        WHERE id = ?
        AND user_id = ?
        """,
        (
            new_status,
            task_id,
            current_user_id
        )
    )

    connection.commit()

    connection.close()

    return {
        "message": "Task status updated.",
        "completed": bool(new_status)
    }


# ============================================================
# DELETE TASK
# ============================================================

@app.delete("/api/tasks/{task_id}")
def delete_task(
    task_id: int,
    current_user_id: int = Depends(get_current_user)
):

    connection = get_connection()

    task = connection.execute(
        """
        SELECT *
        FROM tasks
        WHERE id = ?
        AND user_id = ?
        """,
        (
            task_id,
            current_user_id
        )
    ).fetchone()

    if task is None:
        connection.close()

        raise HTTPException(
            status_code=404,
            detail="Task not found."
        )

    connection.execute(
        """
        DELETE FROM tasks
        WHERE id = ?
        AND user_id = ?
        """,
        (
            task_id,
            current_user_id
        )
    )

    connection.commit()

    connection.close()

    return {
        "message": "Task deleted successfully."
    }


# ============================================================
# AI DAILY PLAN
# ============================================================

@app.post("/api/ai/plan")
def generate_ai_plan(
    current_user_id: int = Depends(get_current_user)
):

    connection = get_connection()

    cursor = connection.execute(
        """
        SELECT *
        FROM tasks
        WHERE completed = 0
        AND user_id = ?
        ORDER BY
            CASE priority
                WHEN 'high' THEN 1
                WHEN 'medium' THEN 2
                WHEN 'low' THEN 3
                ELSE 4
            END,
            CASE
                WHEN date = '' THEN 1
                ELSE 0
            END,
            date ASC
        """,
        (current_user_id,)
    )

    rows = cursor.fetchall()

    connection.close()

    if not rows:

        return {
            "message": "No pending tasks available.",
            "plan": [],
            "suggestion": "You're all caught up! Great work."
        }

    time_slots = [
        "09:00 AM",
        "10:00 AM",
        "11:00 AM",
        "12:00 PM",
        "02:00 PM",
        "03:00 PM",
        "04:00 PM"
    ]

    plan = []

    for index, row in enumerate(rows):

        if index >= len(time_slots):
            break

        plan.append({
            "time": time_slots[index],
            "title": row["title"],
            "description": row["description"] or "",
            "priority": row["priority"],
            "category": row["category"],
            "date": row["date"] or "No due date"
        })

    suggestion = (
        "Start with high-priority tasks, "
        "then work on tasks with the nearest "
        "deadlines. Take short breaks between "
        "focused work sessions."
    )

    return {
        "message": "Daily plan generated successfully.",
        "plan": plan,
        "suggestion": suggestion
    }


# ============================================================
# STATIC FRONTEND
# ============================================================

app.mount(
    "/",
    StaticFiles(
        directory=FRONTEND_DIR,
        html=True
    ),
    name="frontend"
)