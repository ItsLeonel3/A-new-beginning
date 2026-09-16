const API_URL =
    "https://leobay-school.leonelbayon268.workers.dev";

const TOKEN_KEY =
    "TOKEN_SECRET";


/* =========================================================
   ELEMENTOS
========================================================= */

const projectsContainer =
    document.getElementById("projectsContainer");

const addProjectButton =
    document.getElementById("addProjectButton");

const addProjectPanel =
    document.getElementById("addProjectPanel");

const addProjectForm =
    document.getElementById("addProjectForm");

const cancelProject =
    document.getElementById("cancelProject");

const projectTitle =
    document.getElementById("projectTitle");

const projectDescription =
    document.getElementById("projectDescription");

const projectFile =
    document.getElementById("projectFile");

const addProjectMessage =
    document.getElementById("addProjectMessage");

const logoutButton =
    document.getElementById("logoutButton");


/* =========================================================
   TOKEN
========================================================= */

function getToken() {

    return localStorage.getItem(
        TOKEN_KEY
    );
}


/* =========================================================
   CERRAR SESIÓN
========================================================= */

function logout() {

    localStorage.removeItem(
        TOKEN_KEY
    );

    window.location.href =
        "login.html";
}


/* =========================================================
   PETICIÓN API
========================================================= */

async function apiFetch(
    endpoint,
    options = {}
) {

    const token =
        getToken();

    if (!token) {

        logout();

        throw new Error(
            "Sesión no iniciada."
        );
    }


    const headers = {
        ...(options.headers || {}),
        "Authorization":
            `Bearer ${token}`
    };


    const response =
        await fetch(
            API_URL + endpoint,
            {
                ...options,
                headers
            }
        );


    if (
        response.status === 401
    ) {

        localStorage.removeItem(
            TOKEN_KEY
        );

        window.location.href =
            "login.html";

        throw new Error(
            "Sesión vencida."
        );
    }


    return response;
}


/* =========================================================
   ESCAPAR HTML
========================================================= */

function escapeHTML(value) {

    const div =
        document.createElement(
            "div"
        );

    div.textContent =
        value ?? "";

    return div.innerHTML;
}


/* =========================================================
   FORMATEAR TAMAÑO
========================================================= */

function formatSize(bytes) {

    if (
        !bytes ||
        bytes <= 0
    ) {
        return "0 B";
    }

    const units = [
        "B",
        "KB",
        "MB",
        "GB"
    ];

    let size =
        bytes;

    let index = 0;

    while (
        size >= 1024 &&
        index <
            units.length - 1
    ) {

        size /= 1024;
        index++;
    }

    return (
        size.toFixed(
            index === 0
                ? 0
                : 2
        ) +
        " " +
        units[index]
    );
}


/* =========================================================
   FECHA
========================================================= */

function formatDate(date) {

    if (!date) {
        return "";
    }

    const parsed =
        new Date(date);

    if (
        Number.isNaN(
            parsed.getTime()
        )
    ) {
        return date;
    }

    return parsed.toLocaleDateString(
        "es-AR",
        {
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
        }
    );
}


/* =========================================================
   CARGAR PROYECTOS
========================================================= */

async function loadProjects() {

    if (!projectsContainer) {
        return;
    }


    projectsContainer.innerHTML = `
        <div class="loading-projects">
            Cargando proyectos...
        </div>
    `;


    try {

        const response =
            await apiFetch(
                "/api/projects",
                {
                    method: "GET"
                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            console.error(
                "Error /api/projects:",
                data
            );

            projectsContainer.innerHTML = `
                <div class="projects-error">
                    ${escapeHTML(
                        data.error ||
                        "No se pudieron cargar los proyectos."
                    )}
                </div>
            `;

            return;
        }


        const projects =
            Array.isArray(
                data.projects
            )
                ? data.projects
                : [];


        renderProjects(
            projects
        );


    } catch (error) {

        console.error(
            "Error cargando proyectos:",
            error
        );


        projectsContainer.innerHTML = `
            <div class="projects-error">
                No se pudieron cargar los proyectos.
            </div>
        `;
    }
}


/* =========================================================
   MOSTRAR PROYECTOS
========================================================= */

function renderProjects(
    projects
) {

    if (!projectsContainer) {
        return;
    }


    if (
        projects.length === 0
    ) {

        projectsContainer.innerHTML = `
            <div class="no-projects">
                <h3>No hay proyectos</h3>
                <p>
                    Todavía no se ha publicado ningún proyecto.
                </p>
            </div>
        `;

        return;
    }


    projectsContainer.innerHTML =
        projects
            .map(
                project =>
                    createProjectHTML(
                        project
                    )
            )
            .join("");


    /*
     * Eventos de descarga
     */

    document
        .querySelectorAll(
            "[data-download-project]"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        const releaseId =
                            button.dataset
                                .releaseId;

                        const assetId =
                            button.dataset
                                .assetId;

                        downloadProject(
                            releaseId,
                            assetId
                        );
                    }
                );
            }
        );


    /*
     * Eventos de eliminación
     */

    document
        .querySelectorAll(
            "[data-delete-project]"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        const projectId =
                            button.dataset
                                .projectId;

                        deleteProject(
                            projectId
                        );
                    }
                );
            }
        );
}


/* =========================================================
   HTML DE UN PROYECTO
========================================================= */

function createProjectHTML(
    project
) {

    const assets =
        Array.isArray(
            project.assets
        )
            ? project.assets
            : [];


    const assetsHTML =
        assets.length > 0

            ? assets
                .map(
                    asset => `
                        <div class="project-file">

                            <div class="project-file-info">

                                <span class="project-file-name">
                                    ${escapeHTML(
                                        asset.name
                                    )}
                                </span>

                                <span class="project-file-size">
                                    ${formatSize(
                                        asset.size
                                    )}
                                </span>

                            </div>

                            <button
                                class="download-project"
                                data-download-project
                                data-release-id="${project.id}"
                                data-asset-id="${asset.id}"
                                type="button"
                            >
                                Descargar
                            </button>

                        </div>
                    `
                )
                .join("")

            : `
                <div class="project-no-files">
                    Este proyecto no tiene archivos.
                </div>
            `;


    return `
        <article
            class="project-card"
            data-project-id="${project.id}"
        >

            <div class="project-card-header">

                <div>

                    <h3 class="project-title">
                        ${escapeHTML(
                            project.name ||
                            "Proyecto sin nombre"
                        )}
                    </h3>

                    <span class="project-tag">
                        ${escapeHTML(
                            project.tag ||
                            ""
                        )}
                    </span>

                </div>

            </div>


            <div class="project-card-body">

                <p class="project-description">
                    ${escapeHTML(
                        project.description ||
                        "Sin descripción."
                    )}
                </p>


                <div class="project-meta">

                    <span>
                        Publicado:
                        ${formatDate(
                            project.published_at ||
                            project.created_at
                        )}
                    </span>

                </div>


                <div class="project-files">

                    ${assetsHTML}

                </div>


                <div class="project-actions">

                    <button
                        type="button"
                        class="delete-project"
                        data-delete-project
                        data-project-id="${project.id}"
                    >
                        Eliminar
                    </button>

                </div>

            </div>

        </article>
    `;
}


/* =========================================================
   DESCARGAR PROYECTO
========================================================= */

async function downloadProject(
    releaseId,
    assetId
) {

    try {

        const response =
            await apiFetch(
                `/api/projects/${releaseId}/assets/${assetId}`,
                {
                    method: "GET"
                }
            );


        if (!response.ok) {

            let data = {};

            try {
                data =
                    await response.json();
            } catch {
                // No hacemos nada.
            }


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
         * desde Content-Disposition.
         */

        let filename =
            "proyecto";


        const disposition =
            response.headers.get(
                "Content-Disposition"
            );


        if (disposition) {

            const match =
                disposition.match(
                    /filename="?([^"]+)"?/i
                );

            if (match) {
                filename =
                    match[1];
            }
        }


        /*
         * Si no conseguimos nombre,
         * usamos uno genérico.
         */

        if (
            filename ===
            "proyecto"
        ) {

            filename =
                "proyecto-descargable";
        }


        const blobUrl =
            URL.createObjectURL(
                blob
            );


        const link =
            document.createElement(
                "a"
            );


        link.href =
            blobUrl;

        link.download =
            filename;

        document.body.appendChild(
            link
        );

        link.click();

        link.remove();


        setTimeout(
            () => {
                URL.revokeObjectURL(
                    blobUrl
                );
            },
            1000
        );


    } catch (error) {

        console.error(
            "Error descargando:",
            error
        );

        alert(
            "No se pudo descargar el archivo."
        );
    }
}


/* =========================================================
   ELIMINAR PROYECTO
========================================================= */

async function deleteProject(
    projectId
) {

    if (!projectId) {

        console.error(
            "No se recibió projectId."
        );

        return;
    }


    const confirmed =
        confirm(
            "¿Seguro que querés eliminar este proyecto?\n\n" +
            "Se eliminará el Release y sus archivos de GitHub."
        );


    if (!confirmed) {
        return;
    }


    /*
     * Pedimos la contraseña de administrador.
     */

    const adminPassword =
        prompt(
            "Ingresá la contraseña de administrador:"
        );


    if (
        adminPassword === null
    ) {
        return;
    }


    if (
        adminPassword.trim() === ""
    ) {

        alert(
            "La contraseña de administrador es obligatoria."
        );

        return;
    }


    try {

        const response =
            await apiFetch(
                `/api/projects/${projectId}`,
                {

                    method: "DELETE",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    /*
                     * ESTE ES EL CAMBIO IMPORTANTE.
                     * El Worker espera adminPassword
                     * dentro del JSON.
                     */

                    body:
                        JSON.stringify({
                            adminPassword:
                                adminPassword
                        })
                }
            );


        let data = {};

        try {

            data =
                await response.json();

        } catch {
            // Respuesta sin JSON.
        }


        if (!response.ok) {

            console.error(
                "Error eliminando proyecto:",
                {
                    status:
                        response.status,
                    data
                }
            );


            if (
                response.status ===
                403
            ) {

                alert(
                    "La contraseña de administrador es incorrecta."
                );

                return;
            }


            if (
                response.status ===
                401
            ) {

                alert(
                    "La sesión expiró."
                );

                logout();

                return;
            }


            alert(
                data.error ||
                "No se pudo eliminar el proyecto."
            );

            return;
        }


        alert(
            "Proyecto eliminado correctamente."
        );


        /*
         * Actualizamos la lista.
         */

        await loadProjects();


    } catch (error) {

        console.error(
            "Error de conexión al eliminar:",
            error
        );

        alert(
            "No se pudo conectar con el servidor."
        );
    }
}


/* =========================================================
   MOSTRAR / OCULTAR PANEL
========================================================= */

if (
    addProjectButton &&
    addProjectPanel
) {

    addProjectButton.addEventListener(
        "click",
        () => {

            addProjectPanel.hidden =
                !addProjectPanel.hidden;

        }
    );
}


if (cancelProject) {

    cancelProject.addEventListener(
        "click",
        () => {

            if (
                addProjectPanel
            ) {

                addProjectPanel.hidden =
                    true;
            }


            if (
                addProjectForm
            ) {

                addProjectForm.reset();
            }


            if (
                addProjectMessage
            ) {

                addProjectMessage.textContent =
                    "";
            }
        }
    );
}


/* =========================================================
   SUBIR PROYECTO
========================================================= */

if (addProjectForm) {

    addProjectForm.addEventListener(
        "submit",
        async event => {

            event.preventDefault();


            const title =
                projectTitle
                    ? projectTitle.value.trim()
                    : "";


            const description =
                projectDescription
                    ? projectDescription.value.trim()
                    : "";


            const file =
                projectFile
                    ? projectFile.files[0]
                    : null;


            if (!title) {

                showProjectMessage(
                    "Ingresá un título.",
                    true
                );

                return;
            }


            if (!file) {

                showProjectMessage(
                    "Seleccioná un archivo.",
                    true
                );

                return;
            }


            const filename =
                file.name.toLowerCase();


            const allowed =
                filename.endsWith(".zip") ||
                filename.endsWith(".rar") ||
                filename.endsWith(".7z");


            if (!allowed) {

                showProjectMessage(
                    "Solo se permiten archivos .zip, .rar o .7z.",
                    true
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

                showProjectMessage(
                    "Subiendo proyecto...",
                    false
                );


                const response =
                    await apiFetch(
                        "/api/projects",
                        {

                            method: "POST",

                            body:
                                formData
                        }
                    );


                const data =
                    await response.json();


                if (!response.ok) {

                    console.error(
                        "Error subiendo proyecto:",
                        data
                    );


                    showProjectMessage(
                        data.error ||
                        "No se pudo subir el proyecto.",
                        true
                    );

                    return;
                }


                showProjectMessage(
                    "Proyecto subido correctamente.",
                    false
                );


                addProjectForm.reset();


                await loadProjects();


                setTimeout(
                    () => {

                        if (
                            addProjectPanel
                        ) {

                            addProjectPanel.hidden =
                                true;
                        }

                        if (
                            addProjectMessage
                        ) {

                            addProjectMessage.textContent =
                                "";
                        }

                    },
                    1500
                );


            } catch (error) {

                console.error(
                    "Error subiendo:",
                    error
                );


                showProjectMessage(
                    "No se pudo conectar con el servidor.",
                    true
                );
            }
        }
    );
}


/* =========================================================
   MENSAJE DEL FORMULARIO
========================================================= */

function showProjectMessage(
    message,
    error = false
) {

    if (
        !addProjectMessage
    ) {
        return;
    }


    addProjectMessage.textContent =
        message;


    addProjectMessage.classList.toggle(
        "error",
        error
    );


    addProjectMessage.classList.toggle(
        "success",
        !error
    );
}


/* =========================================================
   LOGOUT
========================================================= */

if (logoutButton) {

    logoutButton.addEventListener(
        "click",
        event => {

            event.preventDefault();

            logout();
        }
    );
}


/* =========================================================
   INICIO
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        if (!getToken()) {

            window.location.href =
                "login.html";

            return;
        }


        loadProjects();
    }
);
