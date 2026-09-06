// =========================================
// TASKFLOW AI - FRONTEND JAVASCRIPT
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

const taskForm = document.getElementById("taskForm");
const titleInput = document.getElementById("title");
const descriptionInput = document.getElementById("description");
const priorityInput = document.getElementById("priority");
const categoryInput = document.getElementById("category");
const dateInput = document.getElementById("date");

const taskList = document.getElementById("taskList");
const emptyState = document.getElementById("emptyState");
const emptyTitle = document.getElementById("emptyTitle");
const emptyDescription = document.getElementById("emptyDescription");

const searchInput = document.getElementById("searchInput");
const priorityFilter = document.getElementById("priorityFilter");
const categoryFilter = document.getElementById("categoryFilter");

const editModal = document.getElementById("editModal");
const editTaskForm = document.getElementById("editTaskForm");

const editTaskId = document.getElementById("editTaskId");
const editTitle = document.getElementById("editTitle");
const editDescription = document.getElementById("editDescription");
const editPriority = document.getElementById("editPriority");
const editCategory = document.getElementById("editCategory");
const editDate = document.getElementById("editDate");

const toastContainer = document.getElementById("toastContainer");
const aiPlan = document.getElementById("aiPlan");

// =========================================
// PAGE INITIALIZATION
// =========================================

document.addEventListener("DOMContentLoaded", async () => {

    try {

        setupEventListeners();

        loadDarkMode();

        await loadTasks();

    } catch (error) {

        console.error("Initialization error:", error);

    } finally {

        hidePageLoader();

    }

});

// =========================================
// EVENT LISTENERS
// =========================================

function setupEventListeners() {

    // Add task
    if (taskForm) {
        taskForm.addEventListener(
            "submit",
            createTask
        );
    }

    // Edit task
    if (editTaskForm) {
        editTaskForm.addEventListener(
            "submit",
            updateTask
        );
    }

    // Search
    if (searchInput) {
        searchInput.addEventListener(
            "input",
            displayTasks
        );
    }

    // Priority filter
    if (priorityFilter) {
        priorityFilter.addEventListener(
            "change",
            displayTasks
        );
    }

    // Category filter
    if (categoryFilter) {
        categoryFilter.addEventListener(
            "change",
            displayTasks
        );
    }

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
    const clearViewButton =
        document.getElementById(
            "clearViewButton"
        );

    if (clearViewButton) {

        clearViewButton.addEventListener(
            "click",
            clearProductivityView
        );

    }

    // Dark mode
    const darkModeButton =
        document.getElementById(
            "darkModeButton"
        );

    if (darkModeButton) {

        darkModeButton.addEventListener(
            "click",
            toggleDarkMode
        );

    }

    // AI daily plan
    const generatePlanButton =
        document.getElementById(
            "generatePlanButton"
        );

    if (generatePlanButton) {

        generatePlanButton.addEventListener(
            "click",
            generateAIPlan
        );

    }

    // Close modal
    const closeModalButton =
        document.getElementById(
            "closeModalButton"
        );

    if (closeModalButton) {

        closeModalButton.addEventListener(
            "click",
            closeEditModal
        );

    }

    // Cancel edit
    const cancelEditButton =
        document.getElementById(
            "cancelEditButton"
        );

    if (cancelEditButton) {

        cancelEditButton.addEventListener(
            "click",
            closeEditModal
        );

    }

    // Modal overlay
    const modalOverlay =
        document.querySelector(
            ".modal-overlay"
        );

    if (modalOverlay) {

        modalOverlay.addEventListener(
            "click",
            event => {

                if (
                    event.target ===
                    modalOverlay
                ) {

                    closeEditModal();

                }

            }
        );

    }

    // Escape key
    document.addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Escape" &&
                editModal &&
                !editModal.classList.contains(
                    "hidden"
                )
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
            await fetch(
                `${API_URL}/tasks`
            );

        if (!response.ok) {

            throw new Error(
                `Unable to load tasks: ${response.status}`
            );

        }

        tasks =
            await response.json();

        displayTasks();

        updateStats();

        updateProductivityCards();

        updateAnalytics();

    } catch (error) {

        console.error(
            "Load tasks error:",
            error
        );

        tasks = [];

        displayTasks();

        updateStats();

        updateProductivityCards();

        updateAnalytics();

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

    if (!taskList) {
        return;
    }

    const searchText =
        searchInput
            ? searchInput.value
                .trim()
                .toLowerCase()
            : "";

    const selectedPriority =
        priorityFilter
            ? priorityFilter.value
            : "all";

    const selectedCategory =
        categoryFilter
            ? categoryFilter.value
            : "all";

    const filteredTasks =
        tasks.filter(task => {

            const title =
                (task.title || "")
                    .toLowerCase();

            const description =
                (task.description || "")
                    .toLowerCase();

            const matchesSearch =
                title.includes(searchText) ||
                description.includes(searchText);

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

    if (
        filteredTasks.length === 0
    ) {

        showEmptyState();

        return;

    }

    hideEmptyState();

    filteredTasks.forEach(task => {

        const taskElement =
            createTaskElement(task);

        taskList.appendChild(
            taskElement
        );

    });

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

        card.classList.add(
            "completed"
        );

    }

    if (
        isOverdue(task) &&
        !task.completed
    ) {

        card.classList.add(
            "overdue"
        );

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
                            ? `
                                <div class="task-description">
                                    ${escapeHTML(
                                        task.description
                                    )}
                                </div>
                            `
                            : ""
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

                        <span
                            class="task-status ${dueStatus.className}"
                        >
                            ${dueStatus.text}
                        </span>

                    </div>

                </div>

            </div>

            <div class="task-actions">

                <button
                    class="task-action-button edit-button"
                    title="Edit task"
                    type="button"
                >
                    ✏️
                </button>

                <button
                    class="task-action-button delete-button"
                    title="Delete task"
                    type="button"
                >
                    🗑️
                </button>

            </div>

        </div>

    `;

    // Checkbox
    const checkbox =
        card.querySelector(
            ".task-checkbox"
        );

    if (checkbox) {

        checkbox.addEventListener(
            "change",
            () => toggleTask(task.id)
        );

    }

    // Edit button
    const editButton =
        card.querySelector(
            ".edit-button"
        );

    if (editButton) {

        editButton.addEventListener(
            "click",
            () => openEditModal(task.id)
        );

    }

    // Delete button
    const deleteButton =
        card.querySelector(
            ".delete-button"
        );

    if (deleteButton) {

        deleteButton.addEventListener(
            "click",
            () => deleteTask(task.id)
        );

    }

    return card;

}

// =========================================
// CREATE TASK
// =========================================

async function createTask(event) {

    event.preventDefault();

    const title =
        titleInput
            ? titleInput.value.trim()
            : "";

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
            descriptionInput
                ? descriptionInput.value.trim()
                : "",

        priority:
            priorityInput
                ? priorityInput.value
                : "medium",

        category:
            categoryInput
                ? categoryInput.value
                : "Other",

        date:
            dateInput
                ? dateInput.value
                : ""

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
                        JSON.stringify(
                            taskData
                        )

                }
            );

        if (!response.ok) {

            throw new Error(
                "Failed to create task"
            );

        }

        if (taskForm) {
            taskForm.reset();
        }

        if (priorityInput) {
            priorityInput.value =
                "medium";
        }

        if (categoryInput) {
            categoryInput.value =
                "Other";
        }

        showToast(
            "Task created successfully! 🎉",
            "success"
        );

        await loadTasks();

    } catch (error) {

        console.error(
            "Create task error:",
            error
        );

        showToast(
            "Could not create the task.",
            "error"
        );

    } finally {

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

        } else {

            showToast(
                "Task moved back to pending.",
                "warning"
            );

        }

        await loadTasks();

    } catch (error) {

        console.error(
            "Toggle task error:",
            error
        );

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

    } catch (error) {

        console.error(
            "Delete task error:",
            error
        );

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

    if (editTaskId) {
        editTaskId.value =
            task.id;
    }

    if (editTitle) {
        editTitle.value =
            task.title;
    }

    if (editDescription) {
        editDescription.value =
            task.description || "";
    }

    if (editPriority) {
        editPriority.value =
            task.priority;
    }

    if (editCategory) {
        editCategory.value =
            task.category;
    }

    if (editDate) {
        editDate.value =
            task.date || "";
    }

    if (editModal) {

        editModal.classList.remove(
            "hidden"
        );

    }

    document.body.style.overflow =
        "hidden";

    setTimeout(
        () => {

            if (editTitle) {
                editTitle.focus();
            }

        },
        100
    );

}

// =========================================
// CLOSE EDIT MODAL
// =========================================

function closeEditModal() {

    if (editModal) {

        editModal.classList.add(
            "hidden"
        );

    }

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
            editTitle
                ? editTitle.value.trim()
                : "",

        description:
            editDescription
                ? editDescription.value.trim()
                : "",

        priority:
            editPriority
                ? editPriority.value
                : "medium",

        category:
            editCategory
                ? editCategory.value
                : "Other",

        date:
            editDate
                ? editDate.value
                : ""

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
                        JSON.stringify(
                            taskData
                        )

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

    } catch (error) {

        console.error(
            "Update task error:",
            error
        );

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
        .querySelectorAll(
            ".productivity-card"
        )
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
        .querySelectorAll(
            ".productivity-card"
        )
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

        return (
            isOverdue(task) &&
            !task.completed
        );

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

    if (!element) {
        return;
    }

    const labels = {

        all:
            "Showing all tasks",

        today:
            "Showing tasks due today",

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
        task.date ===
        getTodayString()
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
        task.date >
        getTodayString()
    );

}

function isOverdue(task) {

    if (!task.date) {
        return false;
    }

    return (
        task.date <
        getTodayString()
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
                (
                    completed /
                    total
                ) * 100
            );

    const totalElement =
        document.getElementById(
            "totalTasks"
        );

    const pendingElement =
        document.getElementById(
            "pendingTasks"
        );

    const completedElement =
        document.getElementById(
            "completedTasks"
        );

    const rateElement =
        document.getElementById(
            "completionRate"
        );

    if (totalElement) {
        totalElement.textContent =
            total;
    }

    if (pendingElement) {
        pendingElement.textContent =
            pending;
    }

    if (completedElement) {
        completedElement.textContent =
            completed;
    }

    if (rateElement) {
        rateElement.textContent =
            `${completionRate}%`;
    }

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

    const todayElement =
        document.getElementById(
            "todayCount"
        );

    const upcomingElement =
        document.getElementById(
            "upcomingCount"
        );

    const overdueElement =
        document.getElementById(
            "overdueCount"
        );

    const completedElement =
        document.getElementById(
            "dashboardCompletedCount"
        );

    if (todayElement) {
        todayElement.textContent =
            today;
    }

    if (upcomingElement) {
        upcomingElement.textContent =
            upcoming;
    }

    if (overdueElement) {
        overdueElement.textContent =
            overdue;
    }

    if (completedElement) {
        completedElement.textContent =
            completed;
    }

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
                (
                    completed /
                    tasks.length
                ) * 100
            );

    const highElement =
        document.getElementById(
            "highPriorityCount"
        );

    const mediumElement =
        document.getElementById(
            "mediumPriorityCount"
        );

    const lowElement =
        document.getElementById(
            "lowPriorityCount"
        );

    const rateElement =
        document.getElementById(
            "analyticsCompletionRate"
        );

    if (highElement) {
        highElement.textContent =
            high;
    }

    if (mediumElement) {
        mediumElement.textContent =
            medium;
    }

    if (lowElement) {
        lowElement.textContent =
            low;
    }

    if (rateElement) {
        rateElement.textContent =
            `${rate}%`;
    }

}

// =========================================
// TASK COUNT
// =========================================

function updateTaskCountText(count) {

    const text =
        count === 1
            ? "1 task"
            : `${count} tasks`;

    const element =
        document.getElementById(
            "taskCountText"
        );

    if (element) {
        element.textContent =
            text;
    }

}

// =========================================
// EMPTY STATE
// =========================================

function showEmptyState() {

    if (!emptyState) {
        return;
    }

    emptyState.classList.remove(
        "hidden"
    );

    if (
        currentView !== "all"
    ) {

        if (emptyTitle) {

            emptyTitle.textContent =
                "No tasks in this view";

        }

        if (emptyDescription) {

            emptyDescription.textContent =
                "Try another productivity view or clear the current filter.";

        }

        return;

    }

    const hasFilters =
        (
            searchInput &&
            searchInput.value.trim() !== ""
        ) ||
        (
            priorityFilter &&
            priorityFilter.value !== "all"
        ) ||
        (
            categoryFilter &&
            categoryFilter.value !== "all"
        );

    if (hasFilters) {

        if (emptyTitle) {

            emptyTitle.textContent =
                "No matching tasks";

        }

        if (emptyDescription) {

            emptyDescription.textContent =
                "Try changing your search or filters.";

        }

    } else {

        if (emptyTitle) {

            emptyTitle.textContent =
                "No tasks yet";

        }

        if (emptyDescription) {

            emptyDescription.textContent =
                "Create your first task and start making progress.";

        }

    }

}

function hideEmptyState() {

    if (emptyState) {

        emptyState.classList.add(
            "hidden"
        );

    }

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

    } catch (error) {

        console.error(
            "AI plan error:",
            error
        );

        showToast(
            "Could not generate the daily plan.",
            "error"
        );

    } finally {

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

    if (!aiPlan) {
        return;
    }

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

    data.plan.forEach(item => {

        html += `

            <div class="plan-item">

                <div class="plan-time">
                    ${escapeHTML(item.time)}
                </div>

                <div class="plan-title">
                    ${escapeHTML(item.title)}
                </div>

                <div class="plan-description">

                    ${escapeHTML(
                        item.description ||
                        "Focus on completing this task."
                    )}

                    <br>

                    <strong>
                        Priority:
                    </strong>

                    ${escapeHTML(
                        item.priority
                    )}

                    &nbsp; • &nbsp;

                    <strong>
                        Category:
                    </strong>

                    ${escapeHTML(
                        item.category
                    )}

                </div>

            </div>

        `;

    });

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

    if (!toastContainer) {
        return;
    }

    const toast =
        document.createElement(
            "div"
        );

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

        button.disabled =
            true;

        button.classList.add(
            "loading"
        );

    } else {

        button.disabled =
            false;

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

    if (
        savedMode === "enabled"
    ) {

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

    if (!button) {
        return;
    }

    const dark =
        document.body.classList.contains(
            "dark"
        );

    button.textContent =
        dark
            ? "☀️"
            : "🌙";

}

// =========================================
// PAGE LOADER
// =========================================

function hidePageLoader() {

    const loader =
        document.getElementById(
            "pageLoader"
        );

    if (!loader) {
        return;
    }

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

    if (
        value === null ||
        value === undefined
    ) {

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