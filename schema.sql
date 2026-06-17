DROP TABLE IF EXISTS expenses;
DROP TABLE IF EXISTS group_members;
DROP TABLE IF EXISTS groups;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
                       id         SERIAL PRIMARY KEY,
                       email      VARCHAR(255) UNIQUE NOT NULL,
                       username   VARCHAR(255) UNIQUE NOT NULL,
                       password   VARCHAR(255) NOT NULL,
                       nickname   VARCHAR(255),
                       created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE groups (
                        id         SERIAL PRIMARY KEY,
                        name       VARCHAR(255) NOT NULL,
                        owner_id   INTEGER NOT NULL REFERENCES users(id),
                        created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE group_members (
                        group_id  INTEGER NOT NULL REFERENCES groups(id),
                        user_id   INTEGER NOT NULL REFERENCES users(id),
                        joined_at TIMESTAMP NOT NULL DEFAULT NOW(),
                        PRIMARY KEY (group_id, user_id)
);

CREATE TABLE expenses (
                          id         SERIAL PRIMARY KEY,
                          title      VARCHAR(255) NOT NULL,
                          amount     NUMERIC(10, 2) NOT NULL,
                          group_id   INTEGER NOT NULL REFERENCES groups(id),
                          paid_by    INTEGER NOT NULL REFERENCES users(id),
                          created_at TIMESTAMP NOT NULL DEFAULT NOW()
);