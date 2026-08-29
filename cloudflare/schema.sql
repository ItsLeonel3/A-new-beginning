CREATE TABLE IF NOT EXISTS codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    language TEXT NOT NULL,
    description TEXT,
    content TEXT NOT NULL
);

-- Ejemplo:
-- INSERT INTO codes (title, language, description, content)
-- VALUES ('Ejercicio Python 1', 'Python', 'Primer ejercicio escolar', 'print("Hola mundo")');
