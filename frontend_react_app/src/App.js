import React, { useEffect, useMemo, useRef, useState } from 'react';
import './App.css';

const STORAGE_KEY = 'kavia_todos_v1';

const FILTERS = {
    ALL: 'all',
    ACTIVE: 'active',
    COMPLETED: 'completed',
};

/**
 * @typedef {Object} Todo
 * @property {string} id
 * @property {string} text
 * @property {boolean} completed
 * @property {number} createdAt
 * @property {number} updatedAt
 */

/**
 * PUBLIC_INTERFACE
 * Safely load todos from localStorage.
 * @return {Todo[]} The stored todo list or an empty list if missing/corrupt.
 */
function loadTodosFromStorage() {
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) {
            return [];
        }
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) {
            return [];
        }
        return parsed
            .filter((t) => t && typeof t === 'object')
            .map((t) => ({
                id: String(t.id ?? ''),
                text: String(t.text ?? ''),
                completed: Boolean(t.completed),
                createdAt: Number(t.createdAt ?? Date.now()),
                updatedAt: Number(t.updatedAt ?? Date.now()),
            }))
            .filter((t) => t.id && t.text.trim().length > 0);
    } catch (e) {
        return [];
    }
}

/**
 * PUBLIC_INTERFACE
 * Persist todos to localStorage.
 * @param {Todo[]} todos
 * @return {void}
 */
function saveTodosToStorage(todos) {
    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
    } catch (e) {
        // If storage is unavailable (privacy mode, quota exceeded), fail silently.
    }
}

/**
 * PUBLIC_INTERFACE
 * Create a stable unique id for a todo.
 * @return {string}
 */
function createTodoId() {
    // Use crypto.randomUUID when available; fall back to time+random.
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
        return window.crypto.randomUUID();
    }
    return `todo_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

/**
 * PUBLIC_INTERFACE
 * Main application component for the retro-themed to-do app.
 * @return {JSX.Element}
 */
function App() {
    const [todos, setTodos] = useState(() => loadTodosFromStorage());
    const [filter, setFilter] = useState(FILTERS.ALL);

    const [newText, setNewText] = useState('');
    const [error, setError] = useState('');

    const [editingId, setEditingId] = useState(null);
    const [editingText, setEditingText] = useState('');

    const newInputRef = useRef(null);
    const editInputRef = useRef(null);

    useEffect(() => {
        saveTodosToStorage(todos);
    }, [todos]);

    useEffect(() => {
        if (editingId && editInputRef.current) {
            editInputRef.current.focus();
            editInputRef.current.select();
        }
    }, [editingId]);

    const stats = useMemo(() => {
        const total = todos.length;
        const completed = todos.filter((t) => t.completed).length;
        const active = total - completed;
        return { total, completed, active };
    }, [todos]);

    const visibleTodos = useMemo(() => {
        if (filter === FILTERS.ACTIVE) {
            return todos.filter((t) => !t.completed);
        }
        if (filter === FILTERS.COMPLETED) {
            return todos.filter((t) => t.completed);
        }
        return todos;
    }, [todos, filter]);

    /**
     * PUBLIC_INTERFACE
     * Add a new todo item.
     * @param {string} text
     * @return {void}
     */
    function addTodo(text) {
        const trimmed = text.trim();
        if (!trimmed) {
            setError('Please type a task before adding.');
            return;
        }
        if (trimmed.length > 140) {
            setError('Task is too long (max 140 characters).');
            return;
        }

        const now = Date.now();
        /** @type {Todo} */
        const todo = {
            id: createTodoId(),
            text: trimmed,
            completed: false,
            createdAt: now,
            updatedAt: now,
        };

        setTodos((prev) => [todo, ...prev]);
        setNewText('');
        setError('');
        if (newInputRef.current) {
            newInputRef.current.focus();
        }
    }

    /**
     * PUBLIC_INTERFACE
     * Toggle completion for a todo.
     * @param {string} id
     * @return {void}
     */
    function toggleTodo(id) {
        setTodos((prev) =>
            prev.map((t) =>
                t.id === id ? { ...t, completed: !t.completed, updatedAt: Date.now() } : t
            )
        );
    }

    /**
     * PUBLIC_INTERFACE
     * Delete a todo.
     * @param {string} id
     * @return {void}
     */
    function deleteTodo(id) {
        setTodos((prev) => prev.filter((t) => t.id !== id));
        if (editingId === id) {
            setEditingId(null);
            setEditingText('');
        }
    }

    /**
     * PUBLIC_INTERFACE
     * Start editing a todo.
     * @param {Todo} todo
     * @return {void}
     */
    function beginEdit(todo) {
        setEditingId(todo.id);
        setEditingText(todo.text);
        setError('');
    }

    /**
     * PUBLIC_INTERFACE
     * Cancel editing state.
     * @return {void}
     */
    function cancelEdit() {
        setEditingId(null);
        setEditingText('');
        setError('');
    }

    /**
     * PUBLIC_INTERFACE
     * Save edited text to the todo. If empty after trim, deletes the todo.
     * @param {string} id
     * @return {void}
     */
    function saveEdit(id) {
        const trimmed = editingText.trim();
        if (!trimmed) {
            deleteTodo(id);
            return;
        }
        if (trimmed.length > 140) {
            setError('Task is too long (max 140 characters).');
            return;
        }

        setTodos((prev) =>
            prev.map((t) => (t.id === id ? { ...t, text: trimmed, updatedAt: Date.now() } : t))
        );
        setEditingId(null);
        setEditingText('');
        setError('');
    }

    /**
     * PUBLIC_INTERFACE
     * Handle submit of the add form.
     * @param {React.FormEvent<HTMLFormElement>} e
     * @return {void}
     */
    function handleAddSubmit(e) {
        e.preventDefault();
        addTodo(newText);
    }

    /**
     * PUBLIC_INTERFACE
     * Clear completed todos.
     * @return {void}
     */
    function clearCompleted() {
        setTodos((prev) => prev.filter((t) => !t.completed));
        setError('');
    }

    /**
     * PUBLIC_INTERFACE
     * Mark all todos as completed or active based on current state.
     * @return {void}
     */
    function toggleAll() {
        const hasActive = todos.some((t) => !t.completed);
        setTodos((prev) =>
            prev.map((t) => ({
                ...t,
                completed: hasActive ? true : false,
                updatedAt: Date.now(),
            }))
        );
    }

    return (
        <div className="App">
            <main className="todoApp" aria-label="To-do application">
                <header className="todoHeader">
                    <div className="titleRow">
                        <div className="badge" aria-hidden="true">
                            8-BIT
                        </div>
                        <h1 className="todoTitle">Retro To‑Do</h1>
                    </div>
                    <p className="todoSubtitle">
                        Add tasks. Smash filters. Conquer your backlog.
                    </p>
                </header>

                <section className="todoCard" aria-label="Task entry and controls">
                    <form className="addForm" onSubmit={handleAddSubmit}>
                        <label className="srOnly" htmlFor="newTask">
                            Add a new task
                        </label>
                        <input
                            id="newTask"
                            ref={newInputRef}
                            className="textInput"
                            value={newText}
                            onChange={(e) => setNewText(e.target.value)}
                            placeholder="Type a quest... (e.g., Buy milk)"
                            maxLength={200}
                            autoComplete="off"
                        />
                        <button className="btn btnPrimary" type="submit">
                            Add
                        </button>
                    </form>

                    <div className="toolbar" role="group" aria-label="Task toolbar">
                        <button
                            className="btn btnGhost"
                            type="button"
                            onClick={toggleAll}
                            disabled={todos.length === 0}
                            title="Toggle all tasks"
                        >
                            Toggle all
                        </button>
                        <button
                            className="btn btnGhost btnDanger"
                            type="button"
                            onClick={clearCompleted}
                            disabled={stats.completed === 0}
                            title="Clear completed tasks"
                        >
                            Clear completed
                        </button>

                        <div className="stats" aria-label="Task statistics">
                            <span className="statPill">
                                Total <strong>{stats.total}</strong>
                            </span>
                            <span className="statPill">
                                Active <strong>{stats.active}</strong>
                            </span>
                            <span className="statPill statPillSuccess">
                                Done <strong>{stats.completed}</strong>
                            </span>
                        </div>
                    </div>

                    <nav className="filters" aria-label="Task filters">
                        <button
                            type="button"
                            className={`chip ${filter === FILTERS.ALL ? 'chipActive' : ''}`}
                            onClick={() => setFilter(FILTERS.ALL)}
                        >
                            All
                        </button>
                        <button
                            type="button"
                            className={`chip ${filter === FILTERS.ACTIVE ? 'chipActive' : ''}`}
                            onClick={() => setFilter(FILTERS.ACTIVE)}
                        >
                            Active
                        </button>
                        <button
                            type="button"
                            className={`chip ${filter === FILTERS.COMPLETED ? 'chipActive' : ''}`}
                            onClick={() => setFilter(FILTERS.COMPLETED)}
                        >
                            Completed
                        </button>
                    </nav>

                    {error ? (
                        <div className="errorBanner" role="alert">
                            {error}
                        </div>
                    ) : null}
                </section>

                <section className="todoListSection" aria-label="Task list">
                    {visibleTodos.length === 0 ? (
                        <div className="emptyState">
                            <div className="emptyTitle">No tasks here.</div>
                            <div className="emptyHint">
                                {todos.length === 0
                                    ? 'Add your first quest above.'
                                    : 'Try a different filter.'}
                            </div>
                        </div>
                    ) : (
                        <ul className="todoList">
                            {visibleTodos.map((todo) => {
                                const isEditing = editingId === todo.id;
                                return (
                                    <li
                                        key={todo.id}
                                        className={`todoItem ${todo.completed ? 'todoCompleted' : ''}`}
                                    >
                                        <div className="todoLeft">
                                            <button
                                                type="button"
                                                className={`checkBtn ${
                                                    todo.completed ? 'checkBtnOn' : ''
                                                }`}
                                                onClick={() => toggleTodo(todo.id)}
                                                aria-label={
                                                    todo.completed
                                                        ? `Mark "${todo.text}" as active`
                                                        : `Mark "${todo.text}" as completed`
                                                }
                                                title="Toggle completed"
                                            >
                                                {todo.completed ? '✓' : ''}
                                            </button>

                                            {isEditing ? (
                                                <div className="editRow">
                                                    <label className="srOnly" htmlFor={`edit_${todo.id}`}>
                                                        Edit task
                                                    </label>
                                                    <input
                                                        id={`edit_${todo.id}`}
                                                        ref={editInputRef}
                                                        className="textInput textInputSmall"
                                                        value={editingText}
                                                        onChange={(e) => setEditingText(e.target.value)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') {
                                                                e.preventDefault();
                                                                saveEdit(todo.id);
                                                            } else if (e.key === 'Escape') {
                                                                e.preventDefault();
                                                                cancelEdit();
                                                            }
                                                        }}
                                                        maxLength={200}
                                                        autoComplete="off"
                                                    />
                                                    <div className="actions">
                                                        <button
                                                            type="button"
                                                            className="btn btnSmall btnSuccess"
                                                            onClick={() => saveEdit(todo.id)}
                                                        >
                                                            Save
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="btn btnSmall btnGhost"
                                                            onClick={cancelEdit}
                                                        >
                                                            Cancel
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="todoTextWrap">
                                                    <span className="todoText">{todo.text}</span>
                                                </div>
                                            )}
                                        </div>

                                        {!isEditing ? (
                                            <div className="actions">
                                                <button
                                                    type="button"
                                                    className="btn btnSmall btnGhost"
                                                    onClick={() => beginEdit(todo)}
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    type="button"
                                                    className="btn btnSmall btnGhost btnDanger"
                                                    onClick={() => deleteTodo(todo.id)}
                                                    aria-label={`Delete "${todo.text}"`}
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        ) : null}
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </section>

                <footer className="todoFooter">
                    <span className="kbdHint">
                        Tip: while editing, press <kbd>Enter</kbd> to save or <kbd>Esc</kbd> to cancel.
                    </span>
                </footer>
            </main>
        </div>
    );
}

export default App;
