DROP TABLE IF EXISTS expenses;
DROP TABLE IF EXISTS groups;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
                       id         SERIAL PRIMARY KEY,
                       email      VARCHAR(255) UNIQUE NOT NULL,
                       password   VARCHAR(255) NOT NULL,
                       created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE groups (
                        id         SERIAL PRIMARY KEY,
                        name       VARCHAR(255) NOT NULL,
                        owner_id   INTEGER NOT NULL REFERENCES users(id),
                        created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE expenses (
                          id         SERIAL PRIMARY KEY,
                          title      VARCHAR(255) NOT NULL,
                          amount     NUMERIC(10, 2) NOT NULL,
                          group_id   INTEGER NOT NULL REFERENCES groups(id),
                          paid_by    INTEGER NOT NULL REFERENCES users(id),
                          created_at TIMESTAMP NOT NULL DEFAULT NOW()
);