const addCodeButton = document.getElementById("addCodeButton");
const addCodePanel = document.getElementById("addCodePanel");
const addCodeForm = document.getElementById("addCodeForm");
const cancelCode = document.getElementById("cancelCode");

const codeTitle = document.getElementById("codeTitle");
const codeDescription = document.getElementById("codeDescription");
const codeLanguage = document.getElementById("codeLanguage");
const codeContent = document.getElementById("codeContent");
const addCodeMessage = document.getElementById("addCodeMessage");

const loginForm = document.getElementById("loginForm");
const schoolPassword = document.getElementById("schoolPassword");
const schoolMessage = document.getElementById("schoolMessage");

const schoolLock = document.getElementById("schoolLock");
const codeStatus = document.getElementById("codeStatus");
const codeGrid = document.getElementById("codeGrid");


// =========================
// TOKEN
// =========================

function getToken() {
    return localStorage.getItem("school_token");
}


// =========================
// ESCAPAR HTML
// =========================

function escapeHTML(text) {
    const div = document.createElement("div");

    div.textContent = text ?? "";

    return div.innerHTML;
}


// =========================
// LOGIN
// =========================

if (loginForm) {

    loginForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();

            const password = schoolPassword.value;

            schoolMessage.textContent =
                "Verificando...";

            try {

                const response = await fetch(
                    `${SCHOOL_API_URL}/api/login`,
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body: JSON.stringify({
                            password: password
                        })
                    }
                );

                const data =
                    await response.json();

                if (!response.ok) {

                    schoolMessage.textContent =
                        data.error ||
                        "Contraseña incorrecta.";

                    return;
                }

                localStorage.setItem(
                    "school_token",
                    data.token
                );

                window.location.href =
                    "private.html";

            } catch (error) {

                schoolMessage.textContent =
                    "No se pudo conectar con el servidor.";
            }
        }
    );
}


// =========================
// CARGAR CÓDIGOS
// =========================

if (codeGrid) {
    loadCodes();
}


async function loadCodes() {

    const token = getToken();

    if (!token) {

        window.location.href =
            "login.html";

        return;
    }


    try {

        const response = await fetch(
            `${SCHOOL_API_URL}/api/codes`,
            {
                method: "GET",

                headers: {
                    "Authorization":
                        `Bearer ${token}`
                }
            }
        );


        const data =
            await response.json();


        if (!response.ok) {

            localStorage.removeItem(
                "school_token"
            );

            window.location.href =
                "login.html";

            return;
        }


        // =========================
        // SIN CÓDIGOS
        // =========================

        if (
            !data.codes ||
            data.codes.length === 0
        ) {

            codeStatus.textContent =
                "Todavía no hay códigos escolares guardados.";

            codeGrid.innerHTML = "";

            return;
        }


        // =========================
        // ESTADO
        // =========================

        codeStatus.textContent =
            `${data.codes.length} código(s) disponible(s).`;

        codeGrid.innerHTML = "";


        // =========================
        // CREAR TARJETAS
        // =========================

        data.codes.forEach(function (item) {

            const article =
                document.createElement("article");

            article.className =
                "mini";


            // =========================
            // PREPARAR CÓDIGO
            // =========================

            const code =
                item.code ||
                item.content ||
                "";


            const rawLines = code
                .replace(/\r\n/g, "\n")
                .split("\n");


            // =========================
            // CREAR LÍNEAS
            // =========================

            const lines = rawLines
                .map(function (line, index) {

                    return `
                        <div class="code-line">

                            <span class="line-number">
                                ${index + 1}
                            </span>

                            <span class="line-content">${escapeHTML(line) || " "}</span>

                        </div>
                    `;

                })
                .join("");


            // =========================
            // TARJETA
            // =========================

            article.innerHTML = `

                <b>
                    ${escapeHTML(item.language)}
                </b>

                <h3>
                    ${escapeHTML(item.title)}
                </h3>

                <p>
                    ${escapeHTML(item.description)}
                </p>

                <details>

                    <summary>
                        Ver código
                    </summary>

                    <div class="code-editor">

                        ${lines}

                    </div>

                </details>

            `;


            codeGrid.appendChild(article);

        });


    } catch (error) {

        console.error(error);

        codeStatus.textContent =
            "No se pudo conectar con el servidor.";

    }
}


// =========================
// ABRIR AGREGAR CÓDIGO
// =========================

if (addCodeButton) {

    addCodeButton.addEventListener(
        "click",
        function () {

            addCodePanel.classList.toggle(
                "active"
            );


            if (
                addCodePanel.classList.contains(
                    "active"
                )
            ) {

                codeTitle.focus();

            }

        }
    );
}


// =========================
// CANCELAR
// =========================

if (cancelCode) {

    cancelCode.addEventListener(
        "click",
        function () {

            addCodeForm.reset();

            addCodePanel.classList.remove(
                "active"
            );

            addCodeMessage.textContent =
                "";

        }
    );
}


// =========================
// AGREGAR CÓDIGO
// =========================

if (addCodeForm) {

    addCodeForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();


            const token =
                getToken();


            if (!token) {

                window.location.href =
                    "login.html";

                return;
            }


            // =========================
            // CONTRASEÑA ADMINISTRADOR
            // =========================

            const adminPassword =
                prompt(
                    "Ingresá la contraseña de administrador:"
                );


            if (!adminPassword) {

                addCodeMessage.textContent =
                    "Operación cancelada.";

                return;
            }


            addCodeMessage.textContent =
                "Guardando código...";


            try {

                const response =
                    await fetch(
                        `${SCHOOL_API_URL}/api/codes`,
                        {
                            method: "POST",

                            headers: {

                                "Content-Type":
                                    "application/json",

                                "Authorization":
                                    `Bearer ${token}`

                            },

                            body: JSON.stringify({

                                title:
                                    codeTitle.value,

                                description:
                                    codeDescription.value,

                                language:
                                    codeLanguage.value,

                                code:
                                    codeContent.value,

                                adminPassword:
                                    adminPassword

                            })
                        }
                    );


                const data =
                    await response.json();


                if (!response.ok) {

                    addCodeMessage.textContent =
                        data.error ||
                        "No se pudo guardar el código.";

                    return;
                }


                addCodeMessage.textContent =
                    "Código guardado correctamente.";


                addCodeForm.reset();


                setTimeout(
                    function () {

                        addCodePanel.classList.remove(
                            "active"
                        );

                        addCodeMessage.textContent =
                            "";

                        loadCodes();

                    },
                    800
                );


            } catch (error) {

                console.error(error);

                addCodeMessage.textContent =
                    "No se pudo conectar con el servidor.";

            }

        }
    );
}


// =========================
// CERRAR SESIÓN
// =========================

if (schoolLock) {

    schoolLock.addEventListener(
        "click",
        async function () {

            const token =
                getToken();


            if (token) {

                try {

                    await fetch(
                        `${SCHOOL_API_URL}/api/logout`,
                        {
                            method: "POST",

                            headers: {
                                "Authorization":
                                    `Bearer ${token}`
                            }
                        }
                    );

                } catch (error) {

                    // Aunque falle la petición,
                    // eliminamos el token local.

                }
            }


            localStorage.removeItem(
                "school_token"
            );


            window.location.href =
                "login.html";

        }
    );
}
