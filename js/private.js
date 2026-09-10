const TOKEN_KEY = "school_token";

const loginForm = document.getElementById("loginForm");
const schoolPassword = document.getElementById("schoolPassword");
const schoolMessage = document.getElementById("schoolMessage");

const schoolLock = document.getElementById("schoolLock");

const addProjectButton = document.getElementById("addProjectButton");
const addProjectPanel = document.getElementById("addProjectPanel");
const addProjectForm = document.getElementById("addProjectForm");
const cancelProject = document.getElementById("cancelProject");
const uploadProjectButton = document.getElementById("uploadProjectButton");

const projectTitle = document.getElementById("projectTitle");
const projectDescription = document.getElementById("projectDescription");
const projectVersion = document.getElementById("projectVersion");
const projectFile = document.getElementById("projectFile");
const selectedFile = document.getElementById("selectedFile");
const projectMessage = document.getElementById("projectMessage");

const projectStatus = document.getElementById("projectStatus");
const projectGrid = document.getElementById("projectGrid");


// =========================
// TOKEN
// =========================

function getToken() {
    return localStorage.getItem(TOKEN_KEY) || "";
}


// =========================
// FORMATO
// =========================

function formatBytes(bytes) {
    if (!Number.isFinite(bytes) || bytes <= 0) {
        return "0 B";
    }

    const units = ["B", "KB", "MB", "GB"];
    const index = Math.min(
        Math.floor(Math.log(bytes) / Math.log(1024)),
        units.length - 1
    );

    return `${(bytes / Math.pow(1024, index)).toFixed(index === 0 ? 0 : 2)} ${units[index]}`;
}

function formatDate(value) {
    if (!value) {
        return "Sin fecha";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "Sin fecha";
    }

    return new Intl.DateTimeFormat("es-AR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
    }).format(date);
}

function escapeHTML(text) {
    const div = document.createElement("div");
    div.textContent = text ?? "";
    return div.innerHTML;
}

function getExtension(filename) {
    const parts = filename.split(".");

    if (parts.length < 2) {
        return "FILE";
    }

    return parts.pop().toUpperCase();
}


// =========================
// LOGIN
// =========================

if (loginForm) {
    loginForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        const password = schoolPassword.value;

        schoolMessage.textContent = "Verificando...";

        try {
            const response = await fetch(
                `${SCHOOL_API_URL}/api/login`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ password })
                }
            );

            const data = await response.json();

            if (!response.ok) {
                schoolMessage.textContent =
                    data.error || "Contraseña incorrecta.";
                return;
            }

            localStorage.setItem(TOKEN_KEY, data.token);
            window.location.href = "private.html";
        } catch (error) {
            console.error(error);
            schoolMessage.textContent =
                "No se pudo conectar con el servidor.";
        }
    });
}


// =========================
// CARGAR PROYECTOS
// =========================

if (projectGrid) {
    loadProjects();
}

async function loadProjects() {
    const token = getToken();

    if (!token) {
        window.location.href = "login.html";
        return;
    }

    projectStatus.textContent = "Cargando proyectos...";

    try {
        const response = await fetch(
            `${SCHOOL_API_URL}/api/projects`,
            {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );

        const data = await response.json();

        if (!response.ok) {
            localStorage.removeItem(TOKEN_KEY);
            window.location.href = "login.html";
            return;
        }

        const projects = data.projects || [];

        if (projects.length === 0) {
            projectStatus.textContent =
                "Todavía no hay proyectos disponibles.";
            projectGrid.innerHTML = "";
            return;
        }

        projectStatus.textContent =
            `${projects.length} proyecto(s) disponible(s).`;

        projectGrid.innerHTML = "";

        projects.forEach(project => {
            renderProject(project);
        });
    } catch (error) {
        console.error(error);

        projectStatus.textContent =
            "No se pudo conectar con el servidor.";
    }
}


// =========================
// CREAR TARJETA
// =========================

function renderProject(project) {
    const article = document.createElement("article");
    article.className = "card project-card";

    const asset = project.assets?.[0];

    if (!asset) {
        article.innerHTML = `
            <div class="project-card-top">
                <div class="project-icon">📦</div>
                <span class="project-badge">SIN ARCHIVO</span>
            </div>

            <h3>${escapeHTML(project.title)}</h3>
            <p>${escapeHTML(project.description || "Sin descripción.")}</p>
        `;

        projectGrid.appendChild(article);
        return;
    }

    const extension = getExtension(asset.name);

    article.innerHTML = `
        <div class="project-card-top">
            <div class="project-icon">📦</div>
            <span class="project-badge">${escapeHTML(extension)}</span>
        </div>

        <label>PROJECT RELEASE</label>

        <h3>${escapeHTML(project.title)}</h3>

        <p class="project-description">
            ${escapeHTML(project.description || "Sin descripción.")}
        </p>

        <div class="project-meta">
            <span>VERSION <b>${escapeHTML(project.tag)}</b></span>
            <span>FILE <b>${escapeHTML(asset.name)}</b></span>
            <span>SIZE <b>${formatBytes(asset.size)}</b></span>
            <span>DATE <b>${formatDate(project.created_at)}</b></span>
        </div>

        <div class="project-actions">
            <button
                class="btn cyan download-project"
                type="button"
                data-asset-id="${asset.id}"
                data-filename="${escapeHTML(asset.name)}"
            >
                ↓ Descargar
            </button>

            <button
                class="btn delete-project"
                type="button"
                data-release-id="${project.id}"
            >
                🗑 Eliminar
            </button>
        </div>

        <a
            class="release-link"
            href="${escapeHTML(project.url)}"
            target="_blank"
            rel="noopener noreferrer"
        >
            Ver Release en GitHub ↗
        </a>
    `;

    const downloadButton =
        article.querySelector(".download-project");

    downloadButton.addEventListener("click", function () {
        downloadProject(
            asset.id,
            asset.name,
            downloadButton
        );
    });

    const deleteButton =
        article.querySelector(".delete-project");

    deleteButton.addEventListener("click", function () {
        deleteProject(
            project.id,
            project.title,
            deleteButton
        );
    });

    projectGrid.appendChild(article);
}


// =========================
// DESCARGAR
// =========================

async function downloadProject(assetId, filename, button) {
    const token = getToken();

    if (!token) {
        window.location.href = "login.html";
        return;
    }

    const originalText = button.textContent;
    button.disabled = true;
    button.textContent = "Descargando...";

    try {
        const response = await fetch(
            `${SCHOOL_API_URL}/api/projects/${assetId}/download`,
            {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );

        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(
                data.error || "No se pudo descargar el archivo."
            );
        }

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");

        anchor.href = url;
        anchor.download = filename;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();

        setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
        console.error(error);
        alert(error.message);
    } finally {
        button.disabled = false;
        button.textContent = originalText;
    }
}


// =========================
// ABRIR PANEL
// =========================

if (addProjectButton) {
    addProjectButton.addEventListener("click", function () {
        addProjectPanel.classList.toggle("active");

        if (addProjectPanel.classList.contains("active")) {
            projectTitle.focus();
        }
    });
}


// =========================
// ARCHIVO SELECCIONADO
// =========================

if (projectFile) {
    projectFile.addEventListener("change", function () {
        const file = projectFile.files[0];

        if (!file) {
            selectedFile.textContent =
                "Ningún archivo seleccionado.";
            return;
        }

        selectedFile.textContent =
            `${file.name} — ${formatBytes(file.size)}`;
    });
}


// =========================
// CANCELAR
// =========================

if (cancelProject) {
    cancelProject.addEventListener("click", function () {
        addProjectForm.reset();
        selectedFile.textContent =
            "Ningún archivo seleccionado.";
        projectMessage.textContent = "";
        addProjectPanel.classList.remove("active");
    });
}


// =========================
// SUBIR PROYECTO
// =========================

if (addProjectForm) {
    addProjectForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        const token = getToken();
        const file = projectFile.files[0];

        if (!token) {
            window.location.href = "login.html";
            return;
        }

        if (!file) {
            projectMessage.textContent =
                "Seleccioná un archivo comprimido.";
            return;
        }

        const lowerName = file.name.toLowerCase();
        const validExtension =
            lowerName.endsWith(".zip") ||
            lowerName.endsWith(".rar") ||
            lowerName.endsWith(".7z");

        if (!validExtension) {
            projectMessage.textContent =
                "Solo se permiten .zip, .rar o .7z.";
            return;
        }

        if (file.size > 100 * 1024 * 1024) {
            projectMessage.textContent =
                "El archivo supera el límite de 100 MB.";
            return;
        }

        const formData = new FormData();

        formData.append("title", projectTitle.value.trim());
        formData.append(
            "description",
            projectDescription.value.trim()
        );
        formData.append(
            "version",
            projectVersion.value.trim()
        );
        formData.append("file", file);

        uploadProjectButton.disabled = true;
        uploadProjectButton.textContent = "Subiendo...";
        projectMessage.textContent =
            "Subiendo proyecto a GitHub...";

        try {
            const response = await fetch(
                `${SCHOOL_API_URL}/api/projects`,
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token}`
                    },
                    body: formData
                }
            );

            const data = await response.json();

            if (!response.ok) {
                projectMessage.textContent =
                    data.error || "No se pudo subir el proyecto.";
                return;
            }

            projectMessage.textContent =
                "Proyecto subido correctamente.";

            addProjectForm.reset();
            selectedFile.textContent =
                "Ningún archivo seleccionado.";

            setTimeout(() => {
                addProjectPanel.classList.remove("active");
                projectMessage.textContent = "";
                loadProjects();
            }, 900);
        } catch (error) {
            console.error(error);
            projectMessage.textContent =
                "No se pudo conectar con el servidor.";
        } finally {
            uploadProjectButton.disabled = false;
            uploadProjectButton.textContent = "Subir archivo";
        }
    });
}


// =========================
// ELIMINAR PROYECTO
// =========================

async function deleteProject(releaseId, title, button) {
    const token = getToken();

    if (!token) {
        window.location.href = "login.html";
        return;
    }

    const confirmed = confirm(
        `¿Eliminar el proyecto "${title}"?\n\nEsto eliminará la Release y sus archivos de GitHub.`
    );

    if (!confirmed) {
        return;
    }

    button.disabled = true;
    button.textContent = "Eliminando...";

    try {
        const response = await fetch(
            `${SCHOOL_API_URL}/api/projects/${releaseId}`,
            {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.error || "No se pudo eliminar el proyecto."
            );
        }

        loadProjects();
    } catch (error) {
        console.error(error);
        alert(error.message);
        button.disabled = false;
        button.textContent = "🗑 Eliminar";
    }
}


// =========================
// CERRAR SESIÓN
// =========================

if (schoolLock) {
    schoolLock.addEventListener("click", async function () {
        const token = getToken();

        if (token) {
            try {
                await fetch(
                    `${SCHOOL_API_URL}/api/logout`,
                    {
                        method: "POST",
                        headers: {
                            Authorization: `Bearer ${token}`
                        }
                    }
                );
            } catch (error) {
                console.warn(error);
            }
        }

        localStorage.removeItem(TOKEN_KEY);
        window.location.href = "login.html";
    });
}
