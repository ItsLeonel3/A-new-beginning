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
    if (!bytes) return "0 B";

    const units = ["B", "KB", "MB", "GB"];
    let size = bytes;
    let i = 0;

    while (size >= 1024 && i < units.length - 1) {
        size /= 1024;
        i++;
    }

    return `${size.toFixed(i ? 2 : 0)} ${units[i]}`;
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

    if (response.status === 401) {
        localStorage.removeItem(TOKEN_KEY);
        location.href = "login.html";
        return null;
    }

    return response;
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
                                    password
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
   PROYECTOS
========================= */

const projectGrid =
    document.getElementById("projectGrid");

async function loadProjects() {

    if (!projectGrid) return;

    projectGrid.innerHTML =
        "<p>Cargando proyectos...</p>";

    try {

        const response =
            await api("/api/projects");

        if (!response) return;

        const data =
            await response.json();

        if (!response.ok) {

            projectGrid.innerHTML =
                `<p>${escapeHTML(
                    data.error ||
                    "No se pudieron cargar los proyectos."
                )}</p>`;

            return;
        }

        const projects =
            Array.isArray(data.projects)
                ? data.projects
                : [];

        if (!projects.length) {

            projectGrid.innerHTML =
                "<p>No hay proyectos publicados.</p>";

            return;
        }

        projectGrid.innerHTML =
            projects.map(project => {

                const title =
                    project.title ||
                    project.name ||
                    "Sin título";

                return `
                    <article class="project-card">

                        <h3>
                            ${escapeHTML(title)}
                        </h3>

                        <p>
                            ${escapeHTML(
                                project.description || ""
                            )}
                        </p>

                        <div class="project-files">

                            ${(project.assets || [])
                                .map(asset => `
                                    <div class="project-file">

                                        <span>
                                            ${escapeHTML(
                                                asset.name
                                            )}

                                            <small>
                                                ${formatSize(
                                                    asset.size
                                                )}
                                            </small>
                                        </span>

                                        <button
                                            class="btn cyan"
                                            onclick="downloadProject(
                                                ${project.id},
                                                ${asset.id}
                                            )"
                                        >
                                            Descargar
                                        </button>

                                    </div>
                                `)
                                .join("")}

                        </div>

                        <button
                            class="delete-project"
                            onclick="deleteProject(${project.id})"
                        >
                            Eliminar
                        </button>

                    </article>
                `;
            }).join("");

    } catch (error) {

        console.error(error);

        projectGrid.innerHTML =
            "<p>No se pudo conectar con el servidor.</p>";
    }
}


/* =========================
   DESCARGAR
========================= */

async function downloadProject(
    releaseId,
    assetId
) {

    try {

        const response =
            await api(
                `/api/projects/${releaseId}/assets/${assetId}`
            );

        if (!response) return;

        if (!response.ok) {

            const data =
                await response.json()
                    .catch(() => ({}));

            alert(
                data.error ||
                "No se pudo descargar el archivo."
            );

            return;
        }

        const blob =
            await response.blob();

        const disposition =
            response.headers.get(
                "Content-Disposition"
            );

        let filename =
            "proyecto";

        if (disposition) {

            const match =
                disposition.match(
                    /filename="?([^"]+)"?/i
                );

            if (match) {
                filename = match[1];
            }
        }

        const url =
            URL.createObjectURL(blob);

        const link =
            document.createElement("a");

        link.href = url;
        link.download = filename;

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
   ELIMINAR
========================= */

async function deleteProject(
    projectId
) {

    if (
        !confirm(
            "¿Eliminar este proyecto?"
        )
    ) {
        return;
    }

    const password =
        prompt(
            "Contraseña de administrador:"
        );

    if (!password) return;

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
                                password
                        })
                }
            );

        if (!response) return;

        const data =
            await response.json();

        if (!response.ok) {

            alert(
                data.error ||
                "No se pudo eliminar."
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
            "Error al eliminar."
        );
    }
}


/* =========================
   SUBIR PROYECTO
========================= */

const uploadForm =
    document.getElementById(
        "addProjectForm"
    );

if (uploadForm) {

    uploadForm.addEventListener(
        "submit",
        async event => {

            event.preventDefault();

            const title =
                document.getElementById(
                    "projectTitle"
                ).value.trim();

            const description =
                document.getElementById(
                    "projectDescription"
                ).value.trim();

            const file =
                document.getElementById(
                    "projectFile"
                ).files[0];

            if (!title || !file) {

                alert(
                    "Completá el título y seleccioná un archivo."
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
                    "Solo se permiten ZIP, RAR o 7Z."
                );

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
                "file",
                file
            );

            try {

                const response =
                    await api(
                        "/api/projects",
                        {
                            method: "POST",
                            body: formData
                        }
                    );

                if (!response) return;

                const data =
                    await response.json();

                if (!response.ok) {

                    alert(
                        data.error ||
                        "No se pudo subir el proyecto."
                    );

                    return;
                }

                alert(
                    "Proyecto subido correctamente."
                );

                uploadForm.reset();

                loadProjects();

            } catch (error) {

                console.error(error);

                alert(
                    "Error al subir el proyecto."
                );
            }
        }
    );
}


/* =========================
   LOGOUT
========================= */

const logoutButton =
    document.getElementById(
        "logoutButton"
    );

if (logoutButton) {

    logoutButton.addEventListener(
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
     * No intentamos cargar proyectos.
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
