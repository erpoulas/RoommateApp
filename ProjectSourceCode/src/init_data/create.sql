DROP TABLE IF EXISTS users;
CREATE TABLE users (
    username VARCHAR(50) PRIMARY KEY,
    password CHAR(60) NOT NULL,
    easy_high_score INT DEFAULT 0,
    medium_high_score INT DEFAULT 0,
    hard_high_score INT DEFAULT 0
);