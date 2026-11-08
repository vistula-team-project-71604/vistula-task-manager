
let supabaseUrl;
let supabaseKey;
let tableName;

let editingTaskId = null;

const form = document.getElementById("task-form");
const titleInput = document.getElementById("task-title");
const descriptionInput = document.getElementById("task-description");
const taskList = document.getElementById("task-list");
const statusMessage = document.getElementById("status-message");
const submitButton = document.getElementById("task-submit");

async function initializeApp() {
    try {
        const response = await fetch("config.json");

        if (!response.ok) {
            throw new Error("Cannot load configuration.");
        }

        const config = await response.json();

        supabaseUrl = config.supabaseUrl;
        supabaseKey = config.supabasePublishableKey;
        tableName = config.tableName;

        await loadTasks();

    } catch (error) {
        showMessage(error.message);
    }
}
function showMessage(message) {
    statusMessage.textContent = message;
}
async function apiRequest(endpoint, options = {}) {
    const response = await fetch(
        `${supabaseUrl}/rest/v1/${tableName}${endpoint}`,
        {
            ...options,
            headers: {
                "apikey": supabaseKey,
                "Authorization": `Bearer ${supabaseKey}`,
                "Content-Type": "application/json",
                "Prefer": "return=representation",
                ...options.headers
            }
        }
    );

    if (!response.ok) {
        const error = await response.text();
        throw new Error(error || "Database request failed.");
    }

    if (response.status === 204) {
        return null;
    }

    return response.json();
}
async function loadTasks() {
    try {
        const tasks = await apiRequest("?select=*&order=id.asc");

        taskList.innerHTML = "";

        tasks.forEach(task => {
            displayTask(task);
        });

        showMessage("");

    } catch (error) {
        showMessage("Error loading tasks: " + error.message);
    }
}
function displayTask(task) {
    const item = document.createElement("div");
    item.className = "task-item";
    item.dataset.id = task.id;

    const title = document.createElement("h3");
    title.className = "task-title";
    title.textContent = task.title;

    const description = document.createElement("p");
    description.className = "task-description";
    description.textContent = task.description || "";

    const status = document.createElement("p");
    status.className = "task-status";
    status.textContent = task.completed ? "Completed" : "Incomplete";

    const toggleButton = document.createElement("button");
    toggleButton.className = "toggle-task";
    toggleButton.textContent = task.completed ? "Mark Incomplete" : "Complete";
    toggleButton.addEventListener("click", () => toggleTask(task));

    const editButton = document.createElement("button");
    editButton.className = "edit-task";
    editButton.textContent = "Edit";
    editButton.addEventListener("click", () => editTask(task));

    const deleteButton = document.createElement("button");
    deleteButton.className = "delete-task";
    deleteButton.textContent = "Delete";
    deleteButton.addEventListener("click", () => deleteTask(task.id));

    item.append(
        title,
        description,
        status,
        toggleButton,
        editButton,
        deleteButton
    );

    taskList.appendChild(item);
}
form.addEventListener("submit", async function(event) {
    event.preventDefault();

    const title = titleInput.value.trim();
    const description = descriptionInput.value.trim();

    if (!title) {
        showMessage("Please enter a task title.");
        return;
    }

    try {
        if (editingTaskId !== null) {
            await apiRequest(`?id=eq.${editingTaskId}`, {
                method: "PATCH",
                body: JSON.stringify({
                    title: title,
                    description: description
                })
            });

            showMessage("Task updated successfully.");

        } else {
            await apiRequest("", {
                method: "POST",
                body: JSON.stringify({
                    title: title,
                    description: description,
                    completed: false
                })
            });

            showMessage("Task added successfully.");
        }

        form.reset();
        editingTaskId = null;
        submitButton.textContent = "Add Task";

        await loadTasks();

    } catch (error) {
        showMessage("Error: " + error.message);
    }
});
function editTask(task) {
    editingTaskId = task.id;

    titleInput.value = task.title;
    descriptionInput.value = task.description || "";

    submitButton.textContent = "Save Changes";
    showMessage("Editing task #" + task.id);
}
async function toggleTask(task) {
    try {
        await apiRequest(`?id=eq.${task.id}`, {
            method: "PATCH",
            body: JSON.stringify({
                completed: !task.completed
            })
        });

        await loadTasks();

    } catch (error) {
        showMessage("Error updating task: " + error.message);
    }
}
async function deleteTask(id) {
    if (!confirm("Are you sure you want to delete this task?")) {
        return;
    }

    try {
        await apiRequest(`?id=eq.${id}`, {
            method: "DELETE"
        });

        showMessage("Task deleted successfully.");
        await loadTasks();

    } catch (error) {
        showMessage("Error deleting task: " + error.message);
    }
}
initializeApp();
