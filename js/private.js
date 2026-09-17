const API_URL =
    "https://leobay-school.leonelbayon268.workers.dev";

const TOKEN_KEY = "school_token";

const token = () =>
    localStorage.getItem(TOKEN_KEY);

const api = async (url, options = {}) => {

    const response = await fetch(
        API_URL + url,
        {
            ...options,
            headers: {
                ...(options.headers || {}),
                Authorization: `Bearer ${token()}`
            }
        }
    );

    if (response.status === 401) {
        localStorage.removeItem(TOKEN_KEY);
        location.href = "login.html";
        return null;
    }

    return response;
};


/* =========================
   CARGAR PROYECTOS
========================= */

async function loadProjects() {

    const container =
        document.getElementById("projectsContainer");

    if (!container) return;

    container.innerHTML =
        "<p>Cargando proyectos...</p>";

    try {

        const response =
            await api("/api/projects");

        if (!response) return;

        const data =
            await response.json();

        if (!response.ok) {

            container.innerHTML =
                `<p>${data.error || "Error al cargar proyectos."}</p>`;

            return;
        }

        const projects =
            data.projects || [];

        if (!projects.length) {

            container.innerHTML =
                "<p>No hay proyectos publicados.</p>";

            return;
        }

        container.innerHTML =
            projects.map(project => `

                <article class="project-card">

                    <h3>
                        ${escapeHTML(
                            project.name || "Sin título"
                        )}
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
                                        ${escapeHTML(asset.name)}
                                    </span>

                                    <button
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

            `).join("");

    } catch (error) {

        console.error(error);

        container.innerHTML =
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

        if (!response || !response.ok) {

            const data =
                await response?.json()
                    .catch(() => ({}));

            alert(
                data?.error ||
                "No se pudo descargar el archivo."
            );

            return;
        }

        const blob =
            await response.blob();

        const url =
            URL.createObjectURL(blob);

        const link =
            document.createElement("a");

        link.href = url;

        link.download =
            "proyecto";

        link.click();

        URL.revokeObjectURL(url);

    } catch (error) {

        console.error(error);

        alert(
            "Error al descargar."
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

                    body: JSON.stringify({
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
            "Proyecto eliminado."
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

const form =
    document.getElementById(
        "addProjectForm"
    );

if (form) {

    form.addEventListener(
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

            const name =
                file.name.toLowerCase();

            if (
                !name.endsWith(".zip") &&
                !name.endsWith(".rar") &&
                !name.endsWith(".7z")
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

                form.reset();

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

    logoutButton.onclick = () => {

        localStorage.removeItem(
            TOKEN_KEY
        );

        location.href =
            "login.html";
    };
}


/* =========================
   SEGURIDAD / INICIO
========================= */

function escapeHTML(text) {

    const div =
        document.createElement("div");

    div.textContent =
        text ?? "";

    return div.innerHTML;
}


if (!token()) {

    location.replace(
        "login.html"
    );

} else {

    loadProjects();
}
