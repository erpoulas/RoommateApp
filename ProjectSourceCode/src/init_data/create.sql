DROP TABLE IF EXISTS groups;
CREATE TABLE groups (
    id SERIAL PRIMARY KEY,
    group_name VARCHAR(100) NOT NULL,
    group_code CHAR(6) UNIQUE NOT NULL CHECK (group_code ~ '^[0-9]{6}$')
);

DROP TABLE IF EXISTS users;
CREATE TABLE users (
    username VARCHAR(50) PRIMARY KEY,
    password CHAR(60) NOT NULL,
    high_score INT DEFAULT 0,
    group_id INT REFERENCES groups(id) ON DELETE SET NULL DEFAULT NULL
);

DROP TABLE IF EXISTS tasks;
CREATE TABLE tasks (
    id SERIAL PRIMARY KEY,
    group_id INT REFERENCES groups(id) ON DELETE CASCADE,
    task_name TEXT NOT NULL,
    assigned_user VARCHAR(50) REFERENCES users(username) ON DELETE SET NULL,
    completed BOOLEAN DEFAULT FALSE,
    frequency VARCHAR(20) NOT NULL DEFAULT 'daily'
);