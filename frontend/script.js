// ============================================================
// TASKFLOW AI
// COMPLETE FRONTEND
// Authentication + JWT + Tasks + Dashboard + Analytics + AI
// ============================================================

const API_URL = "/api";

const TOKEN_KEY = "taskflow_token";
const USER_KEY = "taskflow_user";


// ============================================================
// GLOBAL STATE
// ============================================================

let allTasks = [];
let filteredTasks = [];

let currentEditTaskId = null;

let currentView = "all";


// ============================================================
// AUTHENTICATION STORAGE
// ============================================================

function getToken() {

    return localStorage.getItem(
        TOKEN_KEY
    );
}


function getSavedUser() {

    try {

        return JSON.parse(
            localStorage.getItem(USER_KEY)
        );

    } catch {

        return null;
    }
}


function saveSession(
    token,
    user = null
) {

    localStorage.setItem(
        TOKEN_KEY,
        token
    );

    if (user) {

        localStorage.setItem(
            USER_KEY,
            JSON.stringify(user)
        );
    }
}


function clearSession() {

    localStorage.removeItem(
        TOKEN_KEY
    );

    localStorage.removeItem(
        USER_KEY
    );
}


// ============================================================
// PAGE INITIALIZATION
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        initializeApplication();

    }
);


async function initializeApplication() {

    try {

        setupEventListeners();

        setupDarkMode();

        const token = getToken();

        if (!token) {

            showAuthScreen();

            showLoginPanel();

            return;
        }

        const user =
            await getCurrentUser();

        if (user) {

            saveSession(
                token,
                user
            );

            showDashboard(user);

            await loadTasks();

        } else {

            clearSession();

            showAuthScreen();

            showLoginPanel();
        }

    } catch (error) {

        console.error(
            "Initialization error:",
            error
        );

        clearSession();

        showAuthScreen();

        showLoginPanel();

    } finally {

        hidePageLoader();
    }
}


// ============================================================
// API HELPER
// ============================================================

async function apiFetch(
    endpoint,
    options = {},
    requiresAuth = true
) {

    const headers = {
        ...(options.headers || {})
    };


    if (
        options.body &&
        !(options.body instanceof FormData)
    ) {

        headers["Content-Type"] =
            "application/json";
    }


    if (requiresAuth) {

        const token = getToken();

        if (!token) {

            handleSessionExpired();

            throw new Error(
                "You are not logged in."
            );
        }

        headers["Authorization"] =
            `Bearer ${token}`;
    }


    const response = await fetch(
        `${API_URL}${endpoint}`,
        {
            ...options,
            headers
        }
    );


    if (
        response.status === 401 &&
        requiresAuth
    ) {

        handleSessionExpired();

        throw new Error(
            "Your session has expired. Please login again."
        );
    }


    let data = null;

    const contentType =
        response.headers.get(
            "content-type"
        ) || "";


    if (
        contentType.includes(
            "application/json"
        )
    ) {

        data = await response.json();

    } else {

        const text =
            await response.text();

        try {

            data = JSON.parse(text);

        } catch {

            data = {
                detail: text
            };
        }
    }


    if (!response.ok) {

        let message =
            "Something went wrong.";


        if (data) {

            if (
                typeof data.detail ===
                "string"
            ) {

                message =
                    data.detail;

            } else if (
                data.message
            ) {

                message =
                    data.message;
            }
        }


        throw new Error(message);
    }


    return data;
}


// ============================================================
// CURRENT USER
// ============================================================

async function getCurrentUser() {

    try {

        return await apiFetch(
            "/auth/me",
            {
                method: "GET"
            },
            true
        );

    } catch (error) {

        console.error(
            "getCurrentUser:",
            error
        );

        return null;
    }
}


// ============================================================
// AUTH SCREEN
// ============================================================

function showAuthScreen() {

    const authScreen =
        document.getElementById(
            "authScreen"
        );

    const app =
        document.getElementById(
            "app"
        );


    if (authScreen) {

        authScreen.classList.remove(
            "hidden"
        );
    }


    if (app) {

        app.classList.add(
            "hidden"
        );
    }
}


function showDashboard(user) {

    const authScreen =
        document.getElementById(
            "authScreen"
        );

    const app =
        document.getElementById(
            "app"
        );


    if (authScreen) {

        authScreen.classList.add(
            "hidden"
        );
    }


    if (app) {

        app.classList.remove(
            "hidden"
        );
    }


    updateUserInformation(user);
}


function showLoginPanel() {

    const loginPanel =
        document.getElementById(
            "loginPanel"
        );

    const signupPanel =
        document.getElementById(
            "signupPanel"
        );


    if (loginPanel) {

        loginPanel.classList.remove(
            "hidden"
        );
    }


    if (signupPanel) {

        signupPanel.classList.add(
            "hidden"
        );
    }
}


function showSignupPanel() {

    const loginPanel =
        document.getElementById(
            "loginPanel"
        );

    const signupPanel =
        document.getElementById(
            "signupPanel"
        );


    if (loginPanel) {

        loginPanel.classList.add(
            "hidden"
        );
    }


    if (signupPanel) {

        signupPanel.classList.remove(
            "hidden"
        );
    }
}


// ============================================================
// EVENT LISTENERS
// ============================================================

function setupEventListeners() {


    // LOGIN

    const loginForm =
        document.getElementById(
            "loginForm"
        );

    if (loginForm) {

        loginForm.addEventListener(
            "submit",
            handleLogin
        );
    }


    // SIGNUP

    const signupForm =
        document.getElementById(
            "signupForm"
        );

    if (signupForm) {

        signupForm.addEventListener(
            "submit",
            handleSignup
        );
    }


    // SHOW SIGNUP

    const showSignupButton =
        document.getElementById(
            "showSignupButton"
        );

    if (showSignupButton) {

        showSignupButton.addEventListener(
            "click",
            (event) => {

                event.preventDefault();

                showSignupPanel();

            }
        );
    }


    // SHOW LOGIN

    const showLoginButton =
        document.getElementById(
            "showLoginButton"
        );

    if (showLoginButton) {

        showLoginButton.addEventListener(
            "click",
            (event) => {

                event.preventDefault();

                showLoginPanel();

            }
        );
    }


    // LOGOUT

    const logoutButton =
        document.getElementById(
            "logoutButton"
        );

    if (logoutButton) {

        logoutButton.addEventListener(
            "click",
            handleLogout
        );
    }


    // DARK MODE

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


    // TASK FORM

    const taskForm =
        document.getElementById(
            "taskForm"
        );

    if (taskForm) {

        taskForm.addEventListener(
            "submit",
            handleCreateTask
        );
    }


    // SEARCH

    const searchInput =
        document.getElementById(
            "searchInput"
        );

    if (searchInput) {

        searchInput.addEventListener(
            "input",
            applyFilters
        );
    }


    // PRIORITY FILTER

    const priorityFilter =
        document.getElementById(
            "priorityFilter"
        );

    if (priorityFilter) {

        priorityFilter.addEventListener(
            "change",
            applyFilters
        );
    }


    // CATEGORY FILTER

    const categoryFilter =
        document.getElementById(
            "categoryFilter"
        );

    if (categoryFilter) {

        categoryFilter.addEventListener(
            "change",
            applyFilters
        );
    }


    // AI PLAN

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


    // CLOSE MODAL

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


    // CANCEL EDIT

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


    // EDIT FORM

    const editTaskForm =
        document.getElementById(
            "editTaskForm"
        );

    if (editTaskForm) {

        editTaskForm.addEventListener(
            "submit",
            handleEditTask
        );
    }


    // PRODUCTIVITY CARDS

    document
        .querySelectorAll(
            "[data-view]"
        )
        .forEach(card => {

            card.addEventListener(
                "click",
                () => {

                    const view =
                        card.getAttribute(
                            "data-view"
                        );

                    setProductivityView(
                        view
                    );
                }
            );
        });


    // CLEAR VIEW

    const clearViewButton =
        document.getElementById(
            "clearViewButton"
        );

    if (clearViewButton) {

        clearViewButton.addEventListener(
            "click",
            () => {

                currentView =
                    "all";

                applyFilters();

            }
        );
    }


    // PASSWORD TOGGLES

    setupPasswordToggles();
}


// ============================================================
// PASSWORD TOGGLES
// ============================================================

function setupPasswordToggles() {

    document
        .querySelectorAll(
            "[data-target]"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    const targetId =
                        button.getAttribute(
                            "data-target"
                        );

                    const input =
                        document.getElementById(
                            targetId
                        );

                    if (!input) {
                        return;
                    }


                    if (
                        input.type ===
                        "password"
                    ) {

                        input.type =
                            "text";

                    } else {

                        input.type =
                            "password";
                    }
                }
            );
        });
}


// ============================================================
// LOGIN
// ============================================================

async function handleLogin(event) {

    event.preventDefault();


    const emailInput =
        document.getElementById(
            "loginEmail"
        );

    const passwordInput =
        document.getElementById(
            "loginPassword"
        );

    const loginButton =
        document.getElementById(
            "loginButton"
        );

    const loginError =
        document.getElementById(
            "loginError"
        );


    if (
        !emailInput ||
        !passwordInput
    ) {

        showToast(
            "Login form not found.",
            "error"
        );

        return;
    }


    const email =
        emailInput.value
            .trim()
            .toLowerCase();

    const password =
        passwordInput.value;


    if (!email || !password) {

        showError(
            loginError,
            "Please enter email and password."
        );

        return;
    }


    clearError(loginError);


    if (loginButton) {

        loginButton.disabled =
            true;

        loginButton.textContent =
            "Logging in...";
    }


    try {

        const response =
            await apiFetch(
                "/auth/login",
                {
                    method: "POST",
                    body: JSON.stringify({
                        email: email,
                        password: password
                    })
                },
                false
            );


        const token =
            response.access_token;


        if (!token) {

            throw new Error(
                "Login succeeded but no token was returned."
            );
        }


        saveSession(
            token,
            response.user
        );


        const user =
            await getCurrentUser();


        if (!user) {

            clearSession();

            throw new Error(
                "Unable to verify login session."
            );
        }


        saveSession(
            token,
            user
        );


        showDashboard(user);


        showToast(
            "Login successful! Welcome back.",
            "success"
        );


        await loadTasks();


        const form =
            document.getElementById(
                "loginForm"
            );

        if (form) {

            form.reset();
        }


    } catch (error) {

        console.error(
            "LOGIN ERROR:",
            error
        );


        showError(
            loginError,
            error.message
        );


        showToast(
            error.message ||
            "Unable to login.",
            "error"
        );


    } finally {

        if (loginButton) {

            loginButton.disabled =
                false;

            loginButton.textContent =
                "Login";
        }
    }
}


// ============================================================
// SIGNUP
// ============================================================

async function handleSignup(event) {

    event.preventDefault();


    const usernameInput =
        document.getElementById(
            "signupUsername"
        );

    const emailInput =
        document.getElementById(
            "signupEmail"
        );

    const passwordInput =
        document.getElementById(
            "signupPassword"
        );

    const signupButton =
        document.getElementById(
            "signupButton"
        );

    const signupError =
        document.getElementById(
            "signupError"
        );


    if (
        !usernameInput ||
        !emailInput ||
        !passwordInput
    ) {

        showToast(
            "Signup form not found.",
            "error"
        );

        return;
    }


    const username =
        usernameInput.value.trim();

    const email =
        emailInput.value
            .trim()
            .toLowerCase();

    const password =
        passwordInput.value;


    if (
        !username ||
        !email ||
        !password
    ) {

        showError(
            signupError,
            "Please fill all fields."
        );

        return;
    }


    if (username.length < 3) {

        showError(
            signupError,
            "Username must contain at least 3 characters."
        );

        return;
    }


    if (password.length < 6) {

        showError(
            signupError,
            "Password must contain at least 6 characters."
        );

        return;
    }


    if (
        new TextEncoder()
            .encode(password)
            .length > 72
    ) {

        showError(
            signupError,
            "Password must be 72 bytes or fewer."
        );

        return;
    }


    clearError(signupError);


    if (signupButton) {

        signupButton.disabled =
            true;

        signupButton.textContent =
            "Creating account...";
    }


    try {

        const response =
            await apiFetch(
                "/auth/signup",
                {
                    method: "POST",
                    body: JSON.stringify({
                        username:
                            username,
                        email:
                            email,
                        password:
                            password
                    })
                },
                false
            );


        console.log(
            "SIGNUP RESPONSE:",
            response
        );


        showToast(
            "Account created successfully! Please login.",
            "success"
        );


        const form =
            document.getElementById(
                "signupForm"
            );

        if (form) {

            form.reset();
        }


        showLoginPanel();


        const loginEmail =
            document.getElementById(
                "loginEmail"
            );

        if (loginEmail) {

            loginEmail.value =
                email;
        }


        const loginPassword =
            document.getElementById(
                "loginPassword"
            );

        if (loginPassword) {

            loginPassword.focus();
        }


    } catch (error) {

        console.error(
            "SIGNUP ERROR:",
            error
        );


        showError(
            signupError,
            error.message
        );


        showToast(
            error.message ||
            "Unable to create account.",
            "error"
        );


    } finally {

        if (signupButton) {

            signupButton.disabled =
                false;

            signupButton.textContent =
                "Create Account";
        }
    }
}


// ============================================================
// LOGOUT
// ============================================================

function handleLogout() {

    clearSession();

    allTasks = [];

    filteredTasks = [];

    currentView = "all";

    showAuthScreen();

    showLoginPanel();

    showToast(
        "You have been logged out.",
        "success"
    );
}


// ============================================================
// SESSION EXPIRED
// ============================================================

function handleSessionExpired() {

    clearSession();

    allTasks = [];

    filteredTasks = [];

    currentView = "all";

    showAuthScreen();

    showLoginPanel();
}


// ============================================================
// USER INFORMATION
// ============================================================

function updateUserInformation(user) {

    if (!user) {
        return;
    }


    const username =
        user.username ||
        user.email ||
        "User";


    const usernameDisplay =
        document.getElementById(
            "usernameDisplay"
        );

    if (usernameDisplay) {

        usernameDisplay.textContent =
            username;
    }


    const userInitial =
        document.getElementById(
            "userInitial"
        );

    if (userInitial) {

        userInitial.textContent =
            username
                .charAt(0)
                .toUpperCase();
    }
}


// ============================================================
// LOAD TASKS
// ============================================================

async function loadTasks() {

    try {

        const tasks =
            await apiFetch(
                "/tasks",
                {
                    method: "GET"
                },
                true
            );


        allTasks =
            Array.isArray(tasks)
                ? tasks
                : [];


        applyFilters();


        updateDashboardStats();

        updateProductivityCounts();

        updateAnalytics();


    } catch (error) {

        console.error(
            "LOAD TASKS ERROR:",
            error
        );

        if (
            !error.message
                .toLowerCase()
                .includes(
                    "session"
                )
        ) {

            showToast(
                error.message ||
                "Unable to load tasks.",
                "error"
            );
        }
    }
}


// ============================================================
// CREATE TASK
// ============================================================

async function handleCreateTask(event) {

    event.preventDefault();


    const titleInput =
        document.getElementById(
            "title"
        );

    const descriptionInput =
        document.getElementById(
            "description"
        );

    const priorityInput =
        document.getElementById(
            "priority"
        );

    const categoryInput =
        document.getElementById(
            "category"
        );

    const dateInput =
        document.getElementById(
            "date"
        );


    if (!titleInput) {
        return;
    }


    const title =
        titleInput.value.trim();


    if (!title) {

        showToast(
            "Please enter a task title.",
            "error"
        );

        return;
    }


    const task = {

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


    if (button) {

        button.disabled =
            true;
    }


    try {

        await apiFetch(
            "/tasks",
            {
                method: "POST",
                body: JSON.stringify(task)
            },
            true
        );


        showToast(
            "Task created successfully.",
            "success"
        );


        const form =
            document.getElementById(
                "taskForm"
            );

        if (form) {

            form.reset();
        }


        await loadTasks();


    } catch (error) {

        console.error(
            "CREATE TASK ERROR:",
            error
        );


        showToast(
            error.message ||
            "Unable to create task.",
            "error"
        );


    } finally {

        if (button) {

            button.disabled =
                false;
        }
    }
}


// ============================================================
// COMPLETE TASK
// ============================================================

async function toggleTask(taskId) {

    try {

        await apiFetch(
            `/tasks/${taskId}/complete`,
            {
                method: "PATCH"
            },
            true
        );


        await loadTasks();


    } catch (error) {

        console.error(
            "TOGGLE TASK ERROR:",
            error
        );


        showToast(
            error.message ||
            "Unable to update task.",
            "error"
        );
    }
}


// ============================================================
// DELETE TASK
// ============================================================

async function deleteTask(taskId) {

    const confirmed =
        confirm(
            "Are you sure you want to delete this task?"
        );


    if (!confirmed) {
        return;
    }


    try {

        await apiFetch(
            `/tasks/${taskId}`,
            {
                method: "DELETE"
            },
            true
        );


        showToast(
            "Task deleted successfully.",
            "success"
        );


        await loadTasks();


    } catch (error) {

        console.error(
            "DELETE TASK ERROR:",
            error
        );


        showToast(
            error.message ||
            "Unable to delete task.",
            "error"
        );
    }
}


// ============================================================
// EDIT TASK
// ============================================================

function openEditModal(taskId) {

    const task =
        allTasks.find(
            item =>
                Number(item.id) ===
                Number(taskId)
        );


    if (!task) {

        showToast(
            "Task not found.",
            "error"
        );

        return;
    }


    currentEditTaskId =
        taskId;


    setValue(
        "editTaskId",
        task.id
    );

    setValue(
        "editTitle",
        task.title
    );

    setValue(
        "editDescription",
        task.description
    );

    setValue(
        "editPriority",
        task.priority
    );

    setValue(
        "editCategory",
        task.category
    );

    setValue(
        "editDate",
        task.date
    );


    const modal =
        document.getElementById(
            "editModal"
        );


    if (modal) {

        modal.classList.remove(
            "hidden"
        );
    }
}


function closeEditModal() {

    currentEditTaskId =
        null;


    const modal =
        document.getElementById(
            "editModal"
        );


    if (modal) {

        modal.classList.add(
            "hidden"
        );
    }
}


async function handleEditTask(event) {

    event.preventDefault();


    if (!currentEditTaskId) {
        return;
    }


    const title =
        getValue(
            "editTitle"
        ).trim();


    if (!title) {

        showToast(
            "Task title cannot be empty.",
            "error"
        );

        return;
    }


    const task = {

        title: title,

        description:
            getValue(
                "editDescription"
            ).trim(),

        priority:
            getValue(
                "editPriority"
            ) || "medium",

        category:
            getValue(
                "editCategory"
            ) || "Other",

        date:
            getValue(
                "editDate"
            )
    };


    try {

        await apiFetch(
            `/tasks/${currentEditTaskId}`,
            {
                method: "PUT",
                body: JSON.stringify(task)
            },
            true
        );


        closeEditModal();


        showToast(
            "Task updated successfully.",
            "success"
        );


        await loadTasks();


    } catch (error) {

        console.error(
            "EDIT TASK ERROR:",
            error
        );


        showToast(
            error.message ||
            "Unable to update task.",
            "error"
        );
    }
}


// ============================================================
// FILTERS
// ============================================================

function applyFilters() {

    const search =
        (
            document.getElementById(
                "searchInput"
            )?.value || ""
        )
            .toLowerCase()
            .trim();


    const priority =
        document.getElementById(
            "priorityFilter"
        )?.value || "all";


    const category =
        document.getElementById(
            "categoryFilter"
        )?.value || "all";


    filteredTasks =
        allTasks.filter(
            task => {

                const matchesSearch =
                    !search ||
                    String(
                        task.title || ""
                    )
                        .toLowerCase()
                        .includes(
                            search
                        ) ||
                    String(
                        task.description || ""
                    )
                        .toLowerCase()
                        .includes(
                            search
                        );


                const matchesPriority =
                    priority === "all" ||
                    task.priority ===
                        priority;


                const matchesCategory =
                    category === "all" ||
                    task.category ===
                        category;


                const matchesView =
                    matchesCurrentView(
                        task
                    );


                return (
                    matchesSearch &&
                    matchesPriority &&
                    matchesCategory &&
                    matchesView
                );
            }
        );


    renderTasks();


    updateViewText();
}


// ============================================================
// PRODUCTIVITY VIEW
// ============================================================

function setProductivityView(
    view
) {

    currentView =
        view || "all";


    applyFilters();
}


function matchesCurrentView(
    task
) {

    const today =
        new Date()
            .toISOString()
            .split("T")[0];


    if (currentView === "all") {

        return true;
    }


    if (currentView === "today") {

        return (
            task.date === today &&
            !task.completed
        );
    }


    if (currentView === "completed") {

        return Boolean(
            task.completed
        );
    }


    if (currentView === "upcoming") {

        if (
            !task.date ||
            task.completed
        ) {

            return false;
        }


        return task.date >= today;
    }


    if (currentView === "overdue") {

        if (
            !task.date ||
            task.completed
        ) {

            return false;
        }


        return task.date < today;
    }


    return true;
}


function updateViewText() {

    const element =
        document.getElementById(
            "activeViewText"
        );


    if (!element) {
        return;
    }


    const labels = {

        all: "Showing all tasks",

        today: "Showing today's tasks",

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


// ============================================================
// RENDER TASKS
// ============================================================

function renderTasks() {

    const container =
        document.getElementById(
            "taskList"
        );

    const emptyState =
        document.getElementById(
            "emptyState"
        );


    if (!container) {
        return;
    }


    if (
        filteredTasks.length === 0
    ) {

        container.innerHTML =
            "";


        if (emptyState) {

            emptyState.classList.remove(
                "hidden"
            );
        }

        updateTaskCountText();

        return;
    }


    if (emptyState) {

        emptyState.classList.add(
            "hidden"
        );
    }


    container.innerHTML =
        filteredTasks
            .map(task =>
                createTaskHTML(
                    task
                )
            )
            .join("");


    updateTaskCountText();
}


function createTaskHTML(task) {

    const completed =
        Boolean(
            task.completed
        );


    const priority =
        String(
            task.priority ||
            "medium"
        ).toLowerCase();


    const title =
        escapeHTML(
            task.title || ""
        );


    const description =
        escapeHTML(
            task.description || ""
        );


    const category =
        escapeHTML(
            task.category ||
            "Other"
        );


    const date =
        task.date
            ? escapeHTML(
                task.date
            )
            : "No due date";


    return `

        <div class="task-card ${
            completed
                ? "completed"
                : ""
        }">

            <div class="task-check">

                <button
                    class="complete-button"
                    onclick="toggleTask(${task.id})"
                    title="${
                        completed
                            ? "Mark pending"
                            : "Mark complete"
                    }"
                >
                    ${
                        completed
                            ? "✓"
                            : ""
                    }
                </button>

            </div>


            <div class="task-content">

                <div class="task-title-row">

                    <h3>
                        ${title}
                    </h3>

                    <span
                        class="priority-badge ${priority}"
                    >
                        ${priority}
                    </span>

                </div>


                ${
                    description
                        ? `<p>${description}</p>`
                        : ""
                }


                <div class="task-meta">

                    <span>
                        ${category}
                    </span>

                    <span>
                        ${date}
                    </span>

                </div>

            </div>


            <div class="task-actions">

                <button
                    onclick="openEditModal(${task.id})"
                    title="Edit task"
                >
                    Edit
                </button>


                <button
                    onclick="deleteTask(${task.id})"
                    title="Delete task"
                >
                    Delete
                </button>

            </div>

        </div>

    `;
}


// ============================================================
// TASK COUNT
// ============================================================

function updateTaskCountText() {

    const element =
        document.getElementById(
            "taskCountText"
        );


    if (!element) {
        return;
    }


    const count =
        filteredTasks.length;


    element.textContent =
        `${count} ${
            count === 1
                ? "task"
                : "tasks"
        }`;
}


// ============================================================
// DASHBOARD STATS
// ============================================================

function updateDashboardStats() {

    const total =
        allTasks.length;


    const completed =
        allTasks.filter(
            task =>
                Boolean(
                    task.completed
                )
        ).length;


    const pending =
        total - completed;


    const rate =
        total === 0
            ? 0
            : Math.round(
                (
                    completed /
                    total
                ) * 100
            );


    setText(
        "totalTasks",
        total
    );


    setText(
        "pendingTasks",
        pending
    );


    setText(
        "completedTasks",
        completed
    );


    setText(
        "completionRate",
        `${rate}%`
    );


    setText(
        "analyticsCompletionRate",
        `${rate}%`
    );
}


// ============================================================
// PRODUCTIVITY COUNTS
// ============================================================

function updateProductivityCounts() {

    const today =
        new Date()
            .toISOString()
            .split("T")[0];


    const todayCount =
        allTasks.filter(
            task =>
                task.date ===
                today &&
                !task.completed
        ).length;


    const upcomingCount =
        allTasks.filter(
            task =>
                task.date &&
                task.date >= today &&
                !task.completed
        ).length;


    const overdueCount =
        allTasks.filter(
            task =>
                task.date &&
                task.date < today &&
                !task.completed
        ).length;


    const completedCount =
        allTasks.filter(
            task =>
                Boolean(
                    task.completed
                )
        ).length;


    setText(
        "todayCount",
        todayCount
    );


    setText(
        "upcomingCount",
        upcomingCount
    );


    setText(
        "overdueCount",
        overdueCount
    );


    setText(
        "dashboardCompletedCount",
        completedCount
    );
}


// ============================================================
// ANALYTICS
// ============================================================

function updateAnalytics() {

    const high =
        allTasks.filter(
            task =>
                !task.completed &&
                task.priority ===
                    "high"
        ).length;


    const medium =
        allTasks.filter(
            task =>
                !task.completed &&
                task.priority ===
                    "medium"
        ).length;


    const low =
        allTasks.filter(
            task =>
                !task.completed &&
                task.priority ===
                    "low"
        ).length;


    setText(
        "highPriorityCount",
        high
    );


    setText(
        "mediumPriorityCount",
        medium
    );


    setText(
        "lowPriorityCount",
        low
    );


    const total =
        allTasks.length;


    const completed =
        allTasks.filter(
            task =>
                Boolean(
                    task.completed
                )
        ).length;


    const rate =
        total === 0
            ? 0
            : Math.round(
                (
                    completed /
                    total
                ) * 100
            );


    setText(
        "analyticsCompletionRate",
        `${rate}%`
    );
}


// ============================================================
// AI DAILY PLAN
// ============================================================

async function generateAIPlan() {

    const button =
        document.getElementById(
            "generatePlanButton"
        );


    if (button) {

        button.disabled =
            true;

        button.textContent =
            "Generating...";
    }


    try {

        const response =
            await apiFetch(
                "/ai/plan",
                {
                    method: "POST"
                },
                true
            );


        displayAIPlan(
            response
        );


        showToast(
            "Daily plan generated successfully.",
            "success"
        );


    } catch (error) {

        console.error(
            "AI PLAN ERROR:",
            error
        );


        showToast(
            error.message ||
            "Unable to generate daily plan.",
            "error"
        );


    } finally {

        if (button) {

            button.disabled =
                false;

            button.textContent =
                "✨ Generate Plan";
        }
    }
}


function displayAIPlan(data) {

    const container =
        document.getElementById(
            "aiPlan"
        );


    if (!container) {
        return;
    }


    container.classList.remove(
        "hidden"
    );


    if (
        !data.plan ||
        data.plan.length === 0
    ) {

        container.innerHTML = `

            <div class="ai-suggestion">

                <strong>
                    ${escapeHTML(
                        data.message ||
                        "No plan available."
                    )}
                </strong>

                <p>
                    ${escapeHTML(
                        data.suggestion ||
                        "You're all caught up!"
                    )}
                </p>

            </div>

        `;

        return;
    }


    container.innerHTML = `

        <div class="ai-plan-list">

            ${
                data.plan
                    .map(item => `

                        <div class="ai-plan-item">

                            <div class="ai-plan-time">
                                ${escapeHTML(
                                    item.time
                                )}
                            </div>


                            <div class="ai-plan-details">

                                <h4>
                                    ${escapeHTML(
                                        item.title
                                    )}
                                </h4>


                                <p>
                                    ${escapeHTML(
                                        item.description ||
                                        "Focus on completing this task."
                                    )}
                                </p>


                                <small>
                                    ${escapeHTML(
                                        item.category ||
                                        "Other"
                                    )}

                                    •
                                    
                                    ${escapeHTML(
                                        item.priority ||
                                        "medium"
                                    )}
                                </small>

                            </div>

                        </div>

                    `)
                    .join("")
            }

        </div>


        <div class="ai-suggestion">

            <strong>
                Suggestion:
            </strong>

            ${escapeHTML(
                data.suggestion ||
                ""
            )}

        </div>

    `;
}


// ============================================================
// DARK MODE
// ============================================================

function setupDarkMode() {

    const saved =
        localStorage.getItem(
            "taskflow_dark_mode"
        );


    if (saved === "true") {

        document.body.classList.add(
            "dark-mode"
        );
    }


    updateDarkModeButton();
}


function toggleDarkMode() {

    document.body.classList.toggle(
        "dark-mode"
    );


    const enabled =
        document.body.classList.contains(
            "dark-mode"
        );


    localStorage.setItem(
        "taskflow_dark_mode",
        enabled
            ? "true"
            : "false"
    );


    updateDarkModeButton();
}


function updateDarkModeButton() {

    const button =
        document.getElementById(
            "darkModeButton"
        );


    if (!button) {
        return;
    }


    const dark =
        document.body.classList.contains(
            "dark-mode"
        );


    button.textContent =
        dark
            ? "☀️"
            : "🌙";
}


// ============================================================
// TOAST
// ============================================================

function showToast(
    message,
    type = "success"
) {

    let container =
        document.getElementById(
            "toastContainer"
        );


    if (!container) {

        container =
            document.createElement(
                "div"
            );

        container.id =
            "toastContainer";

        container.className =
            "toast-container";

        document.body.appendChild(
            container
        );
    }


    const toast =
        document.createElement(
            "div"
        );


    toast.className =
        `toast ${type}`;


    toast.textContent =
        message;


    container.appendChild(
        toast
    );


    requestAnimationFrame(
        () => {

            toast.classList.add(
                "show"
            );
        }
    );


    setTimeout(
        () => {

            toast.classList.remove(
                "show"
            );

            setTimeout(
                () => {

                    toast.remove();

                },
                300
            );

        },
        3500
    );
}


// ============================================================
// AUTH ERROR
// ============================================================

function showError(
    element,
    message
) {

    if (!element) {
        return;
    }


    element.textContent =
        message || "Something went wrong.";


    element.classList.remove(
        "hidden"
    );
}


function clearError(element) {

    if (!element) {
        return;
    }


    element.textContent =
        "";


    element.classList.add(
        "hidden"
    );
}


// ============================================================
// LOADER
// ============================================================

function hidePageLoader() {

    const loader =
        document.getElementById(
            "pageLoader"
        );


    if (loader) {

        loader.classList.add(
            "hidden"
        );
    }
}


// ============================================================
// HELPERS
// ============================================================

function setText(
    id,
    value
) {

    const element =
        document.getElementById(
            id
        );


    if (element) {

        element.textContent =
            value;
    }
}


function setValue(
    id,
    value
) {

    const element =
        document.getElementById(
            id
        );


    if (element) {

        element.value =
            value ?? "";
    }
}


function getValue(id) {

    const element =
        document.getElementById(
            id
        );


    return element
        ? element.value
        : "";
}


function escapeHTML(value) {

    return String(
        value ?? ""
    )
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


// ============================================================
// GLOBAL FUNCTIONS FOR HTML ONCLICK
// ============================================================

window.toggleTask =
    toggleTask;

window.deleteTask =
    deleteTask;

window.openEditModal =
    openEditModal;

window.closeEditModal =
    closeEditModal;

window.generateAIPlan =
    generateAIPlan;

window.handleLogout =
    handleLogout;

window.showLoginPanel =
    showLoginPanel;

window.showSignupPanel =
    showSignupPanel;