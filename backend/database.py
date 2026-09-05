import sqlite3

DATABASE = "taskflow.db"


def get_connection():
    connection = sqlite3.connect(DATABASE)
    connection.row_factory = sqlite3.Row
    return connection


def create_table():

    connection = get_connection()

    connection.execute("""
        CREATE TABLE IF NOT EXISTS tasks (

            id INTEGER PRIMARY KEY AUTOINCREMENT,

            title TEXT NOT NULL,

            description TEXT,

            priority TEXT,

            category TEXT,

            date TEXT,

            completed INTEGER DEFAULT 0

        )
    """)

    connection.commit()
    connection.close()


create_table()