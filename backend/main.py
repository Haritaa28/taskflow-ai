
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from pathlib import Path

from database import get_connection


# ==========================================
# PATHS
# ==========================================

BASE_DIR = Path(__file__).resolve().parent
FRONTEND_DIR = BASE_DIR.parent / "frontend"


# ==========================================
# FASTAPI APPLICATION
# ==========================================

app = FastAPI(
    title="TaskFlow AI API",
    description="Backend API for TaskFlow AI",
    version="1.0.0"
)


# ==========================================
# CORS
# ==========================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)


# ==========================================
# TASK MODEL
# ==========================================

class Task(BaseModel):

    title: str
    description: str = ""
    priority: str = "medium"
    category: str = "Other"
    date: str = ""


# ==========================================
# HOME
# ==========================================

@app.get("/")
def home():

    return FileResponse(
        FRONTEND_DIR / "index.html"
    )


# ==========================================
# GET ALL TASKS
# ==========================================

@app.get("/api/tasks")
def get_tasks():

    connection = get_connection()

    cursor = connection.execute(
        """
        SELECT *
        FROM tasks
        ORDER BY id DESC
        """
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


# ==========================================
# CREATE TASK
# ==========================================

@app.post("/api/tasks")
def create_task(task: Task):

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
            completed
        )

        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (
            task.title,
            task.description,
            task.priority,
            task.category,
            task.date,
            0
        )
    )

    connection.commit()

    task_id = cursor.lastrowid

    connection.close()

    return {
        "message": "Task created successfully",
        "id": task_id
    }


# ==========================================
# UPDATE TASK
# ==========================================

@app.put("/api/tasks/{task_id}")
def update_task(task_id: int, task: Task):

    connection = get_connection()

    cursor = connection.execute(
        """
        SELECT *
        FROM tasks
        WHERE id = ?
        """,
        (task_id,)
    )

    existing_task = cursor.fetchone()

    if existing_task is None:

        connection.close()

        raise HTTPException(
            status_code=404,
            detail="Task not found"
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
        """,
        (
            task.title,
            task.description,
            task.priority,
            task.category,
            task.date,
            task_id
        )
    )

    connection.commit()

    connection.close()

    return {
        "message": "Task updated successfully"
    }


# ==========================================
# COMPLETE / UNDO TASK
# ==========================================

@app.patch("/api/tasks/{task_id}/complete")
def toggle_task(task_id: int):

    connection = get_connection()

    cursor = connection.execute(
        """
        SELECT completed
        FROM tasks
        WHERE id = ?
        """,
        (task_id,)
    )

    task = cursor.fetchone()

    if task is None:

        connection.close()

        raise HTTPException(
            status_code=404,
            detail="Task not found"
        )

    current_status = task["completed"]

    if current_status == 1:

        new_status = 0

    else:

        new_status = 1

    connection.execute(
        """
        UPDATE tasks

        SET completed = ?

        WHERE id = ?
        """,
        (
            new_status,
            task_id
        )
    )

    connection.commit()

    connection.close()

    return {
        "message": "Task status updated",
        "completed": bool(new_status)
    }


# ==========================================
# DELETE TASK
# ==========================================

@app.delete("/api/tasks/{task_id}")
def delete_task(task_id: int):

    connection = get_connection()

    cursor = connection.execute(
        """
        SELECT *
        FROM tasks
        WHERE id = ?
        """,
        (task_id,)
    )

    task = cursor.fetchone()

    if task is None:

        connection.close()

        raise HTTPException(
            status_code=404,
            detail="Task not found"
        )

    connection.execute(
        """
        DELETE FROM tasks
        WHERE id = ?
        """,
        (task_id,)
    )

    connection.commit()

    connection.close()

    return {
        "message": "Task deleted successfully"
    }


# ==========================================
# AI DAILY PLAN
# ==========================================

@app.post("/api/ai/plan")
def generate_ai_plan():

    connection = get_connection()

    cursor = connection.execute(
        """
        SELECT *

        FROM tasks

        WHERE completed = 0

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
        """
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


# ==========================================
# FRONTEND STATIC FILES
# ==========================================

app.mount(
    "/",
    StaticFiles(
        directory=FRONTEND_DIR,
        html=True
    ),
    name="frontend"
)