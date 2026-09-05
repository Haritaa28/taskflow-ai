// =========================================
// CONFIGURATION
// =========================================

const API_URL = "/api";


// =========================================
// GLOBAL STATE
// =========================================

let tasks = [];

let currentView = "all";

let editingTaskId = null;


// =========================================
// DOM ELEMENTS
// =========================================

const taskForm =
    document.getElementById("taskForm");

const titleInput =
    document.getElementById("title");

const descriptionInput =
    document.getElementById("description");

const priorityInput =
    document.getElementById("priority");

const categoryInput =
    document.getElementById("category");

const dateInput =
    document.getElementById("date");

const taskList =
    document.getElementById("taskList");

const emptyState =
    document.getElementById("emptyState");

const emptyTitle =
    document.getElementById("emptyTitle");

const emptyDescription =
    document.getElementById("emptyDescription");

const searchInput =
    document.getElementById("searchInput");

const priorityFilter =
    document.getElementById("priorityFilter");

const categoryFilter =
    document.getElementById("categoryFilter");

const editModal =
    document.getElementById("editModal");

const editTaskForm =
    document.getElementById("editTaskForm");

const editTaskId =
    document.getElementById("editTaskId");

const editTitle =
    document.getElementById("editTitle");

const editDescription =
    document.getElementById("editDescription");

const editPriority =
    document.getElementById("editPriority");

const editCategory =
    document.getElementById("editCategory");

const editDate =
    document.getElementById("editDate");

const toastContainer =
    document.getElementById("toastContainer");

const aiPlan =
    document.getElementById("aiPlan");


// =========================================
// PAGE INITIALIZATION
// =========================================

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        setupEventListeners();

        loadDarkMode();

        await loadTasks();

        hidePageLoader();

    }
);


// =========================================
// EVENT LISTENERS
// =========================================

function setupEventListeners() {

    // Add task

    taskForm.addEventListener(
        "submit",
        createTask
    );


    // Edit task

    editTaskForm.addEventListener(
        "submit",
        updateTask
    );


    // Search

    searchInput.addEventListener(
        "input",
        displayTasks
    );


    // Priority filter

    priorityFilter.addEventListener(
        "change",
        displayTasks
    );


    // Category filter

    categoryFilter.addEventListener(
        "change",
        displayTasks
    );


    // Productivity cards

    document
        .querySelectorAll(".productivity-card")
        .forEach(card => {

            card.addEventListener(
                "click",
                () => {

                    const view =
                        card.dataset.view;

                    setProductivityView(view);

                }
            );

        });


    // Clear productivity view

    document
        .getElementById("clearViewButton")
        .addEventListener(
            "click",
            clearProductivityView
        );


    // Dark mode

    document
        .getElementById("darkModeButton")
        .addEventListener(
            "click",
            toggleDarkMode
        );


    // AI plan

    document
        .getElementById("generatePlanButton")
        .addEventListener(
            generateAIPlan
        );


    // Modal buttons

    document
        .getElementById("closeModalButton")
        .addEventListener(
            closeEditModal
        );


    document
        .getElementById("cancelEditButton")
        .addEventListener(
            closeEditModal
        );


    document
        .querySelector(".modal-overlay")
        .addEventListener(
            "click",
            closeEditModal
        );


    // Escape key

    document.addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Escape" &&
                !editModal.classList.contains("hidden")
            ) {

                closeEditModal();

            }

        }
    );

}


// =========================================
// LOAD TASKS
// =========================================

async function loadTasks() {

    try {

        const response =
            await fetch(`${API_URL}/tasks`);


        if (!response.ok) {

            throw new Error(
                "Unable to load tasks"
            );

        }


        tasks =
            await response.json();


        displayTasks();

        updateStats();

        updateProductivityCards();

        updateAnalytics();

    }

    catch (error) {

        console.error(error);

        showToast(
            "Could not connect to the TaskFlow AI server.",
            "error"
        );

    }

}


// =========================================
// DISPLAY TASKS
// =========================================

function displayTasks() {

    const searchText =
        searchInput.value
            .trim()
            .toLowerCase();


    const selectedPriority =
        priorityFilter.value;


    const selectedCategory =
        categoryFilter.value;


    let filteredTasks =
        tasks.filter(task => {

            const matchesSearch =
                task.title
                    .toLowerCase()
                    .includes(searchText) ||

                (task.description || "")
                    .toLowerCase()
                    .includes(searchText);


            const matchesPriority =
                selectedPriority === "all" ||
                task.priority === selectedPriority;


            const matchesCategory =
                selectedCategory === "all" ||
                task.category === selectedCategory;


            const matchesView =
                matchesProductivityView(task);


            return (
                matchesSearch &&
                matchesPriority &&
                matchesCategory &&
                matchesView
            );

        });


    taskList.innerHTML = "";


    updateTaskCountText(
        filteredTasks.length
    );


    if (filteredTasks.length === 0) {

        showEmptyState();

        return;

    }


    hideEmptyState();


    filteredTasks.forEach(
        task => {

            const taskElement =
                createTaskElement(task);

            taskList.appendChild(
                taskElement
            );

        }
    );

}


// =========================================
// CREATE TASK ELEMENT
// =========================================

function createTaskElement(task) {

    const card =
        document.createElement("div");


    card.className =
        "task-card";


    if (task.completed) {

        card.classList.add("completed");

    }


    if (
        isOverdue(task) &&
        !task.completed
    ) {

        card.classList.add("overdue");

    }


    const dueStatus =
        getDueStatus(task);


    const priorityClass =
        `priority-${task.priority}`;


    const formattedDate =
        task.date
            ? formatDate(task.date)
            : "No due date";


    card.innerHTML = `

        <div class="task-top">

            <div class="task-main">

                <input
                    type="checkbox"
                    class="task-checkbox"
                    ${task.completed ? "checked" : ""}
                    aria-label="Complete task"
                >

                <div class="task-content">

                    <div class="task-title">
                        ${escapeHTML(task.title)}
                    </div>

                    ${
                        task.description
                        ?
                        `
                        <div class="task-description">
                            ${escapeHTML(task.description)}
                        </div>
                        `
                        :
                        ""
                    }

                    <div class="task-meta">

                        <span class="badge ${priorityClass}">
                            ${capitalize(task.priority)}
                        </span>

                        <span class="badge">
                            ${escapeHTML(task.category)}
                        </span>

                        <span class="badge">
                            📅 ${formattedDate}
                        </span>

                        <span class="task-status ${dueStatus.className}">
                            ${dueStatus.text}
                        </span>

                    </div>

                </div>

            </div>


            <div class="task-actions">

                <button
                    class="task-action-button edit-button"
                    title="Edit task"
                >
                    ✏️
                </button>

                <button
                    class="task-action-button delete-button"
                    title="Delete task"
                >
                    🗑️
                </button>

            </div>

        </div>
    `;


    // Checkbox

    const checkbox =
        card.querySelector(".task-checkbox");


    checkbox.addEventListener(
        "change",
        () => toggleTask(task.id)
    );


    // Edit

    card
        .querySelector(".edit-button")
        .addEventListener(
            "click",
            () => openEditModal(task.id)
        );


    // Delete

    card
        .querySelector(".delete-button")
        .addEventListener(
            "click",
            () => deleteTask(task.id)
        );


    return card;

}


// =========================================
// CREATE TASK
// =========================================

async function createTask(event) {

    event.preventDefault();


    const title =
        titleInput.value.trim();


    if (!title) {

        showToast(
            "Please enter a task title.",
            "warning"
        );

        return;

    }


    const taskData = {

        title: title,

        description:
            descriptionInput.value.trim(),

        priority:
            priorityInput.value,

        category:
            categoryInput.value,

        date:
            dateInput.value

    };


    const button =
        document.getElementById(
            "addTaskButton"
        );


    setButtonLoading(
        button,
        true
    );


    try {

        const response =
            await fetch(
                `${API_URL}/tasks`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify(taskData)
                }
            );


        if (!response.ok) {

            throw new Error(
                "Failed to create task"
            );

        }


        taskForm.reset();


        priorityInput.value =
            "medium";


        categoryInput.value =
            "Other";


        showToast(
            "Task created successfully! 🎉",
            "success"
        );


        await loadTasks();

    }

    catch (error) {

        console.error(error);

        showToast(
            "Could not create the task.",
            "error"
        );

    }

    finally {

        setButtonLoading(
            button,
            false
        );

    }

}


// =========================================
// TOGGLE TASK
// =========================================

async function toggleTask(taskId) {

    try {

        const response =
            await fetch(
                `${API_URL}/tasks/${taskId}/complete`,
                {
                    method: "PATCH"
                }
            );


        if (!response.ok) {

            throw new Error(
                "Failed to update task"
            );

        }


        const result =
            await response.json();


        if (result.completed) {

            showToast(
                "Task completed! 🎉",
                "success"
            );

        }
        else {

            showToast(
                "Task moved back to pending.",
                "warning"
            );

        }


        await loadTasks();

    }

    catch (error) {

        console.error(error);

        showToast(
            "Could not update the task.",
            "error"
        );

    }

}


// =========================================
// DELETE TASK
// =========================================

async function deleteTask(taskId) {

    const confirmed =
        confirm(
            "Are you sure you want to delete this task?"
        );


    if (!confirmed) {

        return;

    }


    try {

        const response =
            await fetch(
                `${API_URL}/tasks/${taskId}`,
                {
                    method: "DELETE"
                }
            );


        if (!response.ok) {

            throw new Error(
                "Failed to delete task"
            );

        }


        showToast(
            "Task deleted successfully.",
            "success"
        );


        await loadTasks();

    }

    catch (error) {

        console.error(error);

        showToast(
            "Could not delete the task.",
            "error"
        );

    }

}


// =========================================
// OPEN EDIT MODAL
// =========================================

function openEditModal(taskId) {

    const task =
        tasks.find(
            item => item.id === taskId
        );


    if (!task) {

        showToast(
            "Task not found.",
            "error"
        );

        return;

    }


    editingTaskId =
        taskId;


    editTaskId.value =
        task.id;


    editTitle.value =
        task.title;


    editDescription.value =
        task.description || "";


    editPriority.value =
        task.priority;


    editCategory.value =
        task.category;


    editDate.value =
        task.date || "";


    editModal.classList.remove(
        "hidden"
    );


    document.body.style.overflow =
        "hidden";


    setTimeout(
        () => editTitle.focus(),
        100
    );

}


// =========================================
// CLOSE EDIT MODAL
// =========================================

function closeEditModal() {

    editModal.classList.add(
        "hidden"
    );


    document.body.style.overflow =
        "";


    editingTaskId =
        null;

}


// =========================================
// UPDATE TASK
// =========================================

async function updateTask(event) {

    event.preventDefault();


    if (!editingTaskId) {

        return;

    }


    const taskData = {

        title:
            editTitle.value.trim(),

        description:
            editDescription.value.trim(),

        priority:
            editPriority.value,

        category:
            editCategory.value,

        date:
            editDate.value

    };


    if (!taskData.title) {

        showToast(
            "Task title cannot be empty.",
            "warning"
        );

        return;

    }


    try {

        const response =
            await fetch(
                `${API_URL}/tasks/${editingTaskId}`,
                {
                    method: "PUT",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify(taskData)
                }
            );


        if (!response.ok) {

            throw new Error(
                "Failed to update task"
            );

        }


        closeEditModal();


        showToast(
            "Task updated successfully! ✨",
            "success"
        );


        await loadTasks();

    }

    catch (error) {

        console.error(error);

        showToast(
            "Could not update the task.",
            "error"
        );

    }

}


// =========================================
// PRODUCTIVITY VIEWS
// =========================================

function setProductivityView(view) {

    currentView =
        view;


    document
        .querySelectorAll(".productivity-card")
        .forEach(card => {

            card.classList.toggle(
                "active",
                card.dataset.view === view
            );

        });


    updateViewText();

    displayTasks();

}


function clearProductivityView() {

    currentView =
        "all";


    document
        .querySelectorAll(".productivity-card")
        .forEach(card => {

            card.classList.remove(
                "active"
            );

        });


    updateViewText();

    displayTasks();

}


function matchesProductivityView(task) {

    if (currentView === "all") {

        return true;

    }


    if (currentView === "today") {

        return isDueToday(task);

    }


    if (currentView === "upcoming") {

        return isUpcoming(task);

    }


    if (currentView === "overdue") {

        return isOverdue(task) &&
            !task.completed;

    }


    if (currentView === "completed") {

        return task.completed;

    }


    return true;

}


// =========================================
// PRODUCTIVITY VIEW TEXT
// =========================================

function updateViewText() {

    const element =
        document.getElementById(
            "activeViewText"
        );


    const labels = {

        all: "Showing all tasks",

        today: "Showing tasks due today",

        upcoming:
            "Showing upcoming tasks",

        overdue:
            "Showing overdue tasks",

        completed:
            "Showing completed tasks"

    };


    element.textContent =
        labels[currentView] ||
        labels.all;

}


// =========================================
// DATE HELPERS
// =========================================

function getTodayString() {

    const today =
        new Date();


    const year =
        today.getFullYear();


    const month =
        String(
            today.getMonth() + 1
        ).padStart(2, "0");


    const day =
        String(
            today.getDate()
        ).padStart(2, "0");


    return `${year}-${month}-${day}`;

}


function isDueToday(task) {

    return (
        task.date === getTodayString()
    );

}


function isUpcoming(task) {

    if (
        !task.date ||
        task.completed
    ) {

        return false;

    }


    return (
        task.date > getTodayString()
    );

}


function isOverdue(task) {

    if (!task.date) {

        return false;

    }


    return (
        task.date < getTodayString()
    );

}


function getDueStatus(task) {

    if (task.completed) {

        return {

            text: "Completed",

            className:
                "status-completed"

        };

    }


    if (isOverdue(task)) {

        return {

            text: "Overdue",

            className:
                "status-overdue"

        };

    }


    if (isDueToday(task)) {

        return {

            text: "Due Today",

            className:
                "status-pending"

        };

    }


    return {

        text: "Pending",

        className:
            "status-pending"

    };

}


// =========================================
// DATE FORMAT
// =========================================

function formatDate(dateString) {

    if (!dateString) {

        return "No due date";

    }


    const date =
        new Date(
            `${dateString}T00:00:00`
        );


    return date.toLocaleDateString(
        "en-IN",
        {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }
    );

}


// =========================================
// STATS
// =========================================

function updateStats() {

    const total =
        tasks.length;


    const completed =
        tasks.filter(
            task => task.completed
        ).length;


    const pending =
        total - completed;


    const completionRate =
        total === 0
            ? 0
            : Math.round(
                (completed / total) * 100
            );


    document.getElementById(
        "totalTasks"
    ).textContent = total;


    document.getElementById(
        "pendingTasks"
    ).textContent = pending;


    document.getElementById(
        "completedTasks"
    ).textContent = completed;


    document.getElementById(
        "completionRate"
    ).textContent =
        `${completionRate}%`;

}


// =========================================
// PRODUCTIVITY CARDS
// =========================================

function updateProductivityCards() {

    const today =
        tasks.filter(
            task =>
                isDueToday(task) &&
                !task.completed
        ).length;


    const upcoming =
        tasks.filter(
            task =>
                isUpcoming(task)
        ).length;


    const overdue =
        tasks.filter(
            task =>
                isOverdue(task) &&
                !task.completed
        ).length;


    const completed =
        tasks.filter(
            task =>
                task.completed
        ).length;


    document.getElementById(
        "todayCount"
    ).textContent = today;


    document.getElementById(
        "upcomingCount"
    ).textContent = upcoming;


    document.getElementById(
        "overdueCount"
    ).textContent = overdue;


    document.getElementById(
        "dashboardCompletedCount"
    ).textContent = completed;

}


// =========================================
// ANALYTICS
// =========================================

function updateAnalytics() {

    const high =
        tasks.filter(
            task =>
                task.priority === "high"
        ).length;


    const medium =
        tasks.filter(
            task =>
                task.priority === "medium"
        ).length;


    const low =
        tasks.filter(
            task =>
                task.priority === "low"
        ).length;


    const completed =
        tasks.filter(
            task =>
                task.completed
        ).length;


    const rate =
        tasks.length === 0
            ? 0
            : Math.round(
                (completed / tasks.length) * 100
            );


    document.getElementById(
        "highPriorityCount"
    ).textContent = high;


    document.getElementById(
        "mediumPriorityCount"
    ).textContent = medium;


    document.getElementById(
        "lowPriorityCount"
    ).textContent = low;


    document.getElementById(
        "analyticsCompletionRate"
    ).textContent =
        `${rate}%`;

}


// =========================================
// TASK COUNT
// =========================================

function updateTaskCountText(count) {

    const text =
        count === 1
            ? "1 task"
            : `${count} tasks`;


    document.getElementById(
        "taskCountText"
    ).textContent = text;

}


// =========================================
// EMPTY STATE
// =========================================

function showEmptyState() {

    emptyState.classList.remove(
        "hidden"
    );


    if (
        currentView !== "all"
    ) {

        emptyTitle.textContent =
            "No tasks in this view";


        emptyDescription.textContent =
            "Try another productivity view or clear the current filter.";

        return;

    }


    const hasFilters =
        searchInput.value.trim() !== "" ||
        priorityFilter.value !== "all" ||
        categoryFilter.value !== "all";


    if (hasFilters) {

        emptyTitle.textContent =
            "No matching tasks";


        emptyDescription.textContent =
            "Try changing your search or filters.";

    }
    else {

        emptyTitle.textContent =
            "No tasks yet";


        emptyDescription.textContent =
            "Create your first task and start making progress.";

    }

}


function hideEmptyState() {

    emptyState.classList.add(
        "hidden"
    );

}


// =========================================
// AI DAILY PLAN
// =========================================

async function generateAIPlan() {

    const button =
        document.getElementById(
            "generatePlanButton"
        );


    setButtonLoading(
        button,
        true
    );


    try {

        const response =
            await fetch(
                `${API_URL}/ai/plan`,
                {
                    method: "POST"
                }
            );


        if (!response.ok) {

            throw new Error(
                "Failed to generate plan"
            );

        }


        const data =
            await response.json();


        displayAIPlan(data);


        showToast(
            "Daily plan generated! 🤖",
            "success"
        );

    }

    catch (error) {

        console.error(error);

        showToast(
            "Could not generate the daily plan.",
            "error"
        );

    }

    finally {

        setButtonLoading(
            button,
            false
        );

    }

}


// =========================================
// DISPLAY AI PLAN
// =========================================

function displayAIPlan(data) {

    aiPlan.classList.remove(
        "hidden"
    );


    if (
        !data.plan ||
        data.plan.length === 0
    ) {

        aiPlan.innerHTML = `

            <div class="ai-suggestion">

                ${escapeHTML(
                    data.suggestion ||
                    "You're all caught up!"
                )}

            </div>

        `;

        return;

    }


    let html = "";


    data.plan.forEach(
        item => {

            html += `

                <div class="plan-item">

                    <div class="plan-time">
                        ${escapeHTML(item.time)}
                    </div>

                    <div class="plan-title">
                        ${escapeHTML(item.title)}
                    </div>

                    <div class="plan-description">

                        ${
                            escapeHTML(
                                item.description ||
                                "Focus on completing this task."
                            )
                        }

                        <br>

                        <strong>
                            Priority:
                        </strong>

                        ${escapeHTML(item.priority)}

                        &nbsp; • &nbsp;

                        <strong>
                            Category:
                        </strong>

                        ${escapeHTML(item.category)}

                    </div>

                </div>

            `;

        }
    );


    if (data.suggestion) {

        html += `

            <div class="ai-suggestion">

                💡
                ${escapeHTML(
                    data.suggestion
                )}

            </div>

        `;

    }


    aiPlan.innerHTML =
        html;

}


// =========================================
// TOAST NOTIFICATIONS
// =========================================

function showToast(
    message,
    type = "success"
) {

    const toast =
        document.createElement("div");


    toast.className =
        `toast ${type}`;


    const icons = {

        success: "✅",

        error: "❌",

        warning: "⚠️",

        info: "ℹ️"

    };


    toast.innerHTML = `

        <span>
            ${icons[type] || "ℹ️"}
        </span>

        <span>
            ${escapeHTML(message)}
        </span>

    `;


    toastContainer.appendChild(
        toast
    );


    setTimeout(
        () => {

            toast.classList.add(
                "hide"
            );


            setTimeout(
                () => toast.remove(),
                300
            );

        },
        3000
    );

}


// =========================================
// BUTTON LOADING
// =========================================

function setButtonLoading(
    button,
    loading
) {

    if (!button) {

        return;

    }


    if (loading) {

        button.disabled = true;

        button.classList.add(
            "loading"
        );

    }
    else {

        button.disabled = false;

        button.classList.remove(
            "loading"
        );

    }

}


// =========================================
// DARK MODE
// =========================================

function toggleDarkMode() {

    document.body.classList.toggle(
        "dark"
    );


    const darkModeEnabled =
        document.body.classList.contains(
            "dark"
        );


    localStorage.setItem(
        "taskflowDarkMode",
        darkModeEnabled
            ? "enabled"
            : "disabled"
    );


    updateDarkModeIcon();

}


function loadDarkMode() {

    const savedMode =
        localStorage.getItem(
            "taskflowDarkMode"
        );


    if (savedMode === "enabled") {

        document.body.classList.add(
            "dark"
        );

    }


    updateDarkModeIcon();

}


function updateDarkModeIcon() {

    const button =
        document.getElementById(
            "darkModeButton"
        );


    const dark =
        document.body.classList.contains(
            "dark"
        );


    button.textContent =
        dark ? "☀️" : "🌙";

}


// =========================================
// PAGE LOADER
// =========================================

function hidePageLoader() {

    const loader =
        document.getElementById(
            "pageLoader"
        );


    setTimeout(
        () => {

            loader.classList.add(
                "hidden"
            );

        },
        300
    );

}


// =========================================
// CAPITALIZE
// =========================================

function capitalize(text) {

    if (!text) {

        return "";

    }


    return (
        text.charAt(0).toUpperCase() +
        text.slice(1)
    );

}


// =========================================
// HTML SECURITY
// =========================================

function escapeHTML(value) {

    if (value === null ||
        value === undefined) {

        return "";

    }


    return String(value)
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );

}