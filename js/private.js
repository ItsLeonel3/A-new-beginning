const API_URL =
    "https://leobay-school.leonelbayon268.workers.dev";

const TOKEN_KEY = "school_token";

/* =========================
   UTILIDADES
========================= */

function getToken() {
    return localStorage.getItem(TOKEN_KEY);
}

function logout() {
    localStorage.removeItem(TOKEN_KEY);
    location.href = "login.html";
}

function escapeHTML(text) {
    const div = document.createElement("div");
    div.textContent = text ?? "";
    return div.innerHTML;
}

function formatSize(bytes) {
    if (!bytes || bytes <= 0) {
        return "0 B";
    }

    const units = ["B", "KB", "MB", "GB"];

    let size = Number(bytes);
    let index = 0;

    while (
        size >= 1024 &&
        index < units.length - 1
    ) {
        size /= 1024;
        index++;
    }

    return `${size.toFixed(index === 0 ? 0 : 2)} ${units[index]}`;
}

function formatDate(date) {
    if (!date) {
        return "Sin fecha";
    }

    const parsed = new Date(date);

    if (Number.isNaN(parsed.getTime())) {
        return "Sin fecha";
    }

    return parsed.toLocaleDateString("es-AR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
    });
}

/* =========================
   API
========================= */

async function api(endpoint, options = {}) {
    const token = getToken();

    if (!token) {
        logout();
        return null;
    }

    try {
        const response = await fetch(
            API_URL + endpoint,
            {
                ...options,

                headers: {
                    ...(options.headers || {}),
                    Authorization: `Bearer ${token}`
                }
            }
        );

        /*
         * Solamente cerramos sesión si el Worker
         * realmente rechaza el token.
         */
        if (response.status === 401) {
            localStorage.removeItem(TOKEN_KEY);
            location.href = "login.html";
            return null;
        }

        return response;

    } catch (error) {
        console.error("Error API:", error);
        throw error;
    }
}

/* =========================
   LOGIN
========================= */

const loginForm =
    document.getElementById("loginForm");

if (loginForm) {

    loginForm.addEventListener(
        "submit",
        async event => {

            event.preventDefault();

            const password =
                document.getElementById(
                    "schoolPassword"
                ).value;

            const message =
                document.getElementById(
                    "schoolMessage"
                );

            message.textContent =
                "Verificando...";

            try {

                const response =
                    await fetch(
                        API_URL + "/api/login",
                        {
                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body:
                                JSON.stringify({
                                    password: password
                                })
                        }
                    );

                const data =
                    await response.json();

                if (!response.ok) {

                    message.textContent =
                        data.error ||
                        "Contraseña incorrecta.";

                    return;
                }

                if (!data.token) {

                    message.textContent =
                        "El servidor no devolvió un token.";

                    return;
                }

                localStorage.setItem(
                    TOKEN_KEY,
                    data.token
                );

                location.href =
                    "private.html";

            } catch (error) {

                console.error(error);

                message.textContent =
                    "No se pudo conectar con el servidor.";
            }
        }
    );
}

/* =========================
   ELEMENTOS DE PROYECTOS
========================= */

const projectGrid =
    document.getElementById("projectGrid");

const projectStatus =
    document.getElementById("projectStatus");

const addProjectButton =
    document.getElementById(
        "addProjectButton"
    );

const addProjectPanel =
    document.getElementById(
        "addProjectPanel"
    );

const addProjectForm =
    document.getElementById(
        "addProjectForm"
    );

const cancelProject =
    document.getElementById(
        "cancelProject"
    );

const projectMessage =
    document.getElementById(
        "projectMessage"
    );

const selectedFile =
    document.getElementById(
        "selectedFile"
    );

const projectFile =
    document.getElementById(
        "projectFile"
    );

const editReleasePanel =
    document.getElementById(
        "editReleasePanel"
    );

const editReleaseForm =
    document.getElementById(
        "editReleaseForm"
    );

const editReleaseTitle =
    document.getElementById(
        "editReleaseTitle"
    );

const editReleaseDescription =
    document.getElementById(
        "editReleaseDescription"
    );

const editReleaseVersion =
    document.getElementById(
        "editReleaseVersion"
    );

const editReleaseFile =
    document.getElementById(
        "editReleaseFile"
    );

const editReleaseSelectedFile =
    document.getElementById(
        "editReleaseSelectedFile"
    );

const editReleasePassword =
    document.getElementById(
        "editReleasePassword"
    );

const cancelEditRelease =
    document.getElementById(
        "cancelEditRelease"
    );

const editReleaseMessage =
    document.getElementById(
        "editReleaseMessage"
    );

let editingReleaseId = null;


/* =========================
   ABRIR PANEL
========================= */

if (addProjectButton) {

    addProjectButton.addEventListener(
        "click",
        () => {

            if (editReleasePanel) {
                editReleasePanel.classList.remove("active");
            }

            addProjectPanel.classList.toggle(
                "active"
            );

            if (
                addProjectPanel.classList.contains(
                    "active"
                )
            ) {

                document
                    .getElementById(
                        "projectTitle"
                    )
                    ?.focus();
            }
        }
    );
}

/* =========================
   CANCELAR SUBIDA
========================= */

if (cancelProject) {

    cancelProject.addEventListener(
        "click",
        () => {

            addProjectForm.reset();

            addProjectPanel.classList.remove(
                "active"
            );

            if (selectedFile) {
                selectedFile.textContent =
                    "Ningún archivo seleccionado.";
            }

            if (projectMessage) {
                projectMessage.textContent =
                    "";
            }
        }
    );
}

/* =========================
   MOSTRAR ARCHIVO ELEGIDO
========================= */

if (projectFile) {

    projectFile.addEventListener(
        "change",
        () => {

            const file =
                projectFile.files[0];

            if (!file) {

                selectedFile.textContent =
                    "Ningún archivo seleccionado.";

                return;
            }

            selectedFile.textContent =
                `${file.name} — ${formatSize(file.size)}`;
        }
    );
}

/* =========================
   CARGAR PROYECTOS
========================= */

async function loadProjects() {

    if (!projectGrid) {
        return;
    }

    projectGrid.innerHTML =
        "<p>Cargando proyectos...</p>";

    if (projectStatus) {

        projectStatus.textContent =
            "Cargando proyectos...";
    }

    try {

        const response =
            await api("/api/projects");

        if (!response) {
            return;
        }

        const data =
            await response.json();

        if (!response.ok) {

            const errorMessage =
                data.error ||
                "No se pudieron cargar los proyectos.";

            projectGrid.innerHTML =
                `<p>${escapeHTML(errorMessage)}</p>`;

            if (projectStatus) {
                projectStatus.textContent =
                    errorMessage;
            }

            return;
        }

        const projects =
            Array.isArray(data.projects)
                ? data.projects
                : [];

        if (!projects.length) {

            projectGrid.innerHTML =
                "<p>No hay proyectos publicados.</p>";

            if (projectStatus) {
                projectStatus.textContent =
                    "No hay proyectos publicados.";
            }

            return;
        }

        if (projectStatus) {

            projectStatus.textContent =
                `${projects.length} proyecto(s) disponible(s).`;
        }

        projectGrid.innerHTML =
            projects
                .map(project => {

                    const title =
                        project.title ||
                        project.name ||
                        "Sin título";

                    const description =
                        project.description ||
                        "Sin descripción.";

                    const version =
                        project.version ||
                        "Sin versión";

                    const date =
                        project.created_at ||
                        project.createdAt ||
                        project.date ||
                        project.published_at;

                    const assets =
                        Array.isArray(project.assets)
                            ? project.assets
                            : [];

                    /*
                     * Si hay varios archivos,
                     * mostramos todos.
                     */

                    const filesHTML =
                        assets.length
                            ? assets
                                .map(asset => {

                                    return `
                                        <div class="project-file">

                                            <div class="project-file-info">

                                                <strong>
                                                    ${escapeHTML(
                                                        asset.name ||
                                                        "Archivo"
                                                    )}
                                                </strong>

                                                <span>
                                                    ${formatSize(
                                                        asset.size
                                                    )}
                                                </span>

                                            </div>

                                            <button
                                                class="btn cyan"
                                                type="button"
                                                onclick="downloadProject(
                                                    ${project.id},
                                                    ${asset.id}
                                                )"
                                            >
                                                Descargar
                                            </button>

                                        </div>
                                    `;
                                })
                                .join("")
                            : `
                                <p>
                                    No hay archivos disponibles.
                                </p>
                            `;

                    return `
                        <article class="card project-card">

                            <div class="project-card-top">

                                <div class="project-icon">
                                    📦
                                </div>

                                <span class="project-badge">
                                    PROJECT
                                </span>

                            </div>

                            <label>
                                PROYECTO
                            </label>

                            <h3>
                                ${escapeHTML(title)}
                            </h3>

                            <p class="project-description">
                                ${escapeHTML(description)}
                            </p>

                            <div class="project-meta">

                                <span>
                                    <span>Versión</span>
                                    <b>
                                        ${escapeHTML(version)}
                                    </b>
                                </span>

                                <span>
                                    <span>Fecha</span>
                                    <b>
                                        ${escapeHTML(
                                            formatDate(date)
                                        )}
                                    </b>
                                </span>

                            </div>

                            <div class="project-files">

                                ${filesHTML}

                            </div>

                            <div class="project-actions">

                                <button
                                    class="btn"
                                    type="button"
                                    onclick="editRelease(
                                        ${project.id},
                                        decodeURIComponent('${encodeURIComponent(title)}'),
                                        decodeURIComponent('${encodeURIComponent(description)}'),
                                        decodeURIComponent('${encodeURIComponent(project.tag || "")}'),
                                        decodeURIComponent('${encodeURIComponent(version)}'),
                                        decodeURIComponent('${encodeURIComponent(assets[0]?.name || "")}')
                                    )"
                                >
                                    ✏️ Editar Release
                                </button>

                                <button
                                    class="delete-project"
                                    type="button"
                                    onclick="deleteProject(
                                        ${project.id}
                                    )"
                                >
                                    🗑 Eliminar
                                </button>

                            </div>

                        </article>
                    `;
                })
                .join("");

    } catch (error) {

        console.error(
            "Error cargando proyectos:",
            error
        );

        projectGrid.innerHTML =
            "<p>No se pudo conectar con el servidor.</p>";

        if (projectStatus) {

            projectStatus.textContent =
                "No se pudo conectar con el servidor.";
        }
    }
}

/* =========================
   DESCARGAR
========================= */

async function downloadProject(
    projectId,
    assetId
) {

    try {

        const response =
            await api(
                `/api/projects/${projectId}/assets/${assetId}`
            );

        if (!response) {
            return;
        }

        if (!response.ok) {

            const data =
                await response
                    .json()
                    .catch(() => ({}));

            alert(
                data.error ||
                "No se pudo descargar el archivo."
            );

            return;
        }

        const blob =
            await response.blob();

        /*
         * Intentamos obtener el nombre
         * real enviado por el Worker.
         */

        const disposition =
            response.headers.get(
                "Content-Disposition"
            );

        let filename =
            "proyecto";

        if (disposition) {

            const match =
                disposition.match(
                    /filename\*?=(?:UTF-8'')?"?([^"]+)"?/i
                );

            if (match && match[1]) {

                filename =
                    decodeURIComponent(
                        match[1]
                    );
            }
        }

        const url =
            URL.createObjectURL(blob);

        const link =
            document.createElement("a");

        link.href = url;

        link.download =
            filename;

        document.body.appendChild(link);

        link.click();

        link.remove();

        URL.revokeObjectURL(url);

    } catch (error) {

        console.error(error);

        alert(
            "Error al descargar el archivo."
        );
    }
}

/* =========================
   ELIMINAR PROYECTO
========================= */

function editRelease(
    projectId,
    currentTitle,
    currentDescription,
    currentTag,
    currentVersion,
    currentAssetName
) {
    if (!editReleasePanel || !editReleaseForm) {
        return;
    }

    editingReleaseId = projectId;

    if (addProjectPanel) {
        addProjectPanel.classList.remove("active");
    }

    editReleaseTitle.value = currentTitle || "";
    editReleaseDescription.value = currentDescription || "";
    editReleaseVersion.value = currentVersion || "";
    editReleasePassword.value = "";
    editReleaseFile.value = "";

    if (editReleaseSelectedFile) {
        editReleaseSelectedFile.textContent =
            currentAssetName
                ? `Archivo actual: ${currentAssetName}`
                : "Ningún archivo seleccionado.";
    }

    if (editReleaseMessage) {
        editReleaseMessage.textContent = "";
    }

    editReleasePanel.classList.add("active");

    editReleasePanel.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });

    editReleaseTitle.focus();
}

if (cancelEditRelease) {
    cancelEditRelease.addEventListener(
        "click",
        () => {
            editingReleaseId = null;

            if (editReleaseForm) {
                editReleaseForm.reset();
            }

            if (editReleaseSelectedFile) {
                editReleaseSelectedFile.textContent =
                    "Ningún archivo seleccionado.";
            }

            if (editReleaseMessage) {
                editReleaseMessage.textContent = "";
            }

            if (editReleasePanel) {
                editReleasePanel.classList.remove("active");
            }
        }
    );
}

if (editReleaseFile) {
    editReleaseFile.addEventListener(
        "change",
        () => {
            const file =
                editReleaseFile.files[0];

            if (!file) {
                editReleaseSelectedFile.textContent =
                    "Ningún archivo seleccionado.";
                return;
            }

            editReleaseSelectedFile.textContent =
                `${file.name} — ${formatSize(file.size)}`;
        }
    );
}

if (editReleaseForm) {
    editReleaseForm.addEventListener(
        "submit",
        async event => {
            event.preventDefault();

            if (!editingReleaseId) {
                return;
            }

            const title =
                editReleaseTitle.value.trim();

            const description =
                editReleaseDescription.value.trim();

            const version =
                editReleaseVersion.value.trim();

            const file =
                editReleaseFile.files[0];

            const adminPassword =
                editReleasePassword.value;

            if (!title) {
                alert("Ingresá un título.");
                editReleaseTitle.focus();
                return;
            }

            if (!version) {
                alert("Ingresá una versión.");
                editReleaseVersion.focus();
                return;
            }

            if (!file) {
                alert("Seleccioná el nuevo archivo comprimido.");
                editReleaseFile.focus();
                return;
            }

            const filename =
                file.name.toLowerCase();

            if (
                !filename.endsWith(".zip") &&
                !filename.endsWith(".rar") &&
                !filename.endsWith(".7z")
            ) {
                alert("Solo se permiten archivos ZIP, RAR o 7Z.");
                return;
            }

            if (!adminPassword) {
                alert("Ingresá la contraseña de administrador.");
                editReleasePassword.focus();
                return;
            }

            const formData = new FormData();

            formData.append("title", title);
            formData.append("description", description);
            formData.append("version", version);
            formData.append("file", file);
            formData.append("adminPassword", adminPassword);

            const saveButton =
                document.getElementById(
                    "saveEditRelease"
                );

            try {
                if (saveButton) {
                    saveButton.disabled = true;
                    saveButton.textContent = "Guardando...";
                }

                if (editReleaseMessage) {
                    editReleaseMessage.textContent =
                        "Guardando cambios...";
                }

                const response =
                    await api(
                        `/api/projects/${editingReleaseId}`,
                        {
                            method: "PATCH",
                            body: formData
                        }
                    );

                if (!response) {
                    return;
                }

                const data =
                    await response
                        .json()
                        .catch(() => ({}));

                if (!response.ok) {
                    if (editReleaseMessage) {
                        editReleaseMessage.textContent =
                            data.error ||
                            "No se pudo modificar la Release.";
                    }

                    return;
                }

                alert(
                    "Release modificada correctamente."
                );

                editingReleaseId = null;
                editReleaseForm.reset();

                if (editReleaseSelectedFile) {
                    editReleaseSelectedFile.textContent =
                        "Ningún archivo seleccionado.";
                }

                if (editReleasePanel) {
                    editReleasePanel.classList.remove("active");
                }

                await loadProjects();

            } catch (error) {
                console.error(
                    "Error editando Release:",
                    error
                );

                if (editReleaseMessage) {
                    editReleaseMessage.textContent =
                        "No se pudo conectar con el servidor.";
                }

            } finally {
                if (saveButton) {
                    saveButton.disabled = false;
                    saveButton.textContent = "Guardar cambios";
                }
            }
        }
    );
}

async function deleteProject(
    projectId
) {

    const confirmed =
        confirm(
            "¿Eliminar este proyecto?\n\n" +
            "Esta acción no se puede deshacer."
        );

    if (!confirmed) {
        return;
    }

    /*
     * Segunda protección:
     * contraseña de administrador.
     */

    const adminPassword =
        prompt(
            "Ingresá la contraseña de administrador:"
        );

    if (!adminPassword) {
        return;
    }

    try {

        const response =
            await api(
                `/api/projects/${projectId}`,
                {
                    method: "DELETE",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify({
                            adminPassword:
                                adminPassword
                        })
                }
            );

        if (!response) {
            return;
        }

        const data =
            await response
                .json()
                .catch(() => ({}));

        if (!response.ok) {

            alert(
                data.error ||
                "No se pudo eliminar el proyecto."
            );

            return;
        }

        alert(
            "Proyecto eliminado correctamente."
        );

        loadProjects();

    } catch (error) {

        console.error(error);

        alert(
            "Error al eliminar el proyecto."
        );
    }
}

/* =========================
   SUBIR PROYECTO
========================= */

if (addProjectForm) {

    addProjectForm.addEventListener(
        "submit",
        async event => {

            event.preventDefault();

            const title =
                document
                    .getElementById(
                        "projectTitle"
                    )
                    .value
                    .trim();

            const description =
                document
                    .getElementById(
                        "projectDescription"
                    )
                    .value
                    .trim();

            const version =
                document
                    .getElementById(
                        "projectVersion"
                    )
                    .value
                    .trim();

            const file =
                document
                    .getElementById(
                        "projectFile"
                    )
                    .files[0];

            if (!title) {

                alert(
                    "Ingresá un título."
                );

                return;
            }

            if (!file) {

                alert(
                    "Seleccioná un archivo."
                );

                return;
            }

            const filename =
                file.name.toLowerCase();

            if (
                !filename.endsWith(".zip") &&
                !filename.endsWith(".rar") &&
                !filename.endsWith(".7z")
            ) {

                alert(
                    "Solo se permiten archivos ZIP, RAR o 7Z."
                );

                return;
            }

            /*
             * Contraseña de administrador
             * para publicar el proyecto.
             */

            const adminPassword =
                prompt(
                    "Ingresá la contraseña de administrador:"
                );

            if (!adminPassword) {
                return;
            }

            const formData =
                new FormData();

            formData.append(
                "title",
                title
            );

            formData.append(
                "description",
                description
            );

            formData.append(
                "version",
                version || "1.0.0"
            );

            formData.append(
                "file",
                file
            );

            formData.append(
                "adminPassword",
                adminPassword
            );

            const uploadButton =
                document.getElementById(
                    "uploadProjectButton"
                );

            try {

                if (uploadButton) {

                    uploadButton.disabled =
                        true;

                    uploadButton.textContent =
                        "Subiendo...";
                }

                if (projectMessage) {

                    projectMessage.textContent =
                        "Subiendo proyecto...";
                }

                const response =
                    await api(
                        "/api/projects",
                        {
                            method: "POST",
                            body: formData
                        }
                    );

                if (!response) {
                    return;
                }

                const data =
                    await response
                        .json()
                        .catch(() => ({}));

                if (!response.ok) {

                    if (projectMessage) {

                        projectMessage.textContent =
                            data.error ||
                            "No se pudo subir el proyecto.";
                    }

                    return;
                }

                if (projectMessage) {

                    projectMessage.textContent =
                        "Proyecto subido correctamente.";
                }

                alert(
                    "Proyecto subido correctamente."
                );

                addProjectForm.reset();

                if (selectedFile) {

                    selectedFile.textContent =
                        "Ningún archivo seleccionado.";
                }

                addProjectPanel.classList.remove(
                    "active"
                );

                loadProjects();

            } catch (error) {

                console.error(
                    "Error subiendo proyecto:",
                    error
                );

                if (projectMessage) {

                    projectMessage.textContent =
                        "No se pudo conectar con el servidor.";
                }

                alert(
                    "Error al subir el proyecto."
                );

            } finally {

                if (uploadButton) {

                    uploadButton.disabled =
                        false;

                    uploadButton.textContent =
                        "Subir archivo";
                }
            }
        }
    );
}

/* =========================
   CERRAR SESIÓN
========================= */

const schoolLock =
    document.getElementById(
        "schoolLock"
    );

if (schoolLock) {

    schoolLock.addEventListener(
        "click",
        event => {

            event.preventDefault();

            logout();
        }
    );
}

/* =========================
   INICIO
========================= */

if (loginForm) {

    /*
     * Estamos en login.html.
     * No hacemos nada más.
     */

} else if (projectGrid) {

    /*
     * Estamos en private.html.
     */

    if (!getToken()) {

        location.replace(
            "login.html"
        );

    } else {

        loadProjects();
    }
}