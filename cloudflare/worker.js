const ALLOWED_ORIGINS = [
    "https://leobay23.github.io",
    "http://127.0.0.1:5502",
    "http://localhost:5502"
];

const TOKEN_TTL_SECONDS = 60 * 60 * 8;
const MAX_FILE_SIZE = 100 * 1024 * 1024;

function corsHeaders(origin) {
    const allowedOrigin = ALLOWED_ORIGINS.includes(origin)
        ? origin
        : ALLOWED_ORIGINS[0];

    return {
        "Access-Control-Allow-Origin": allowedOrigin,
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
        "Access-Control-Expose-Headers": "Content-Disposition, Content-Length",
        "Vary": "Origin"
    };
}

function json(data, status = 200, origin = "") {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            "Content-Type": "application/json; charset=utf-8",
            ...corsHeaders(origin)
        }
    });
}

function base64UrlEncode(value) {
    const bytes = value instanceof Uint8Array
        ? value
        : new TextEncoder().encode(value);

    let binary = "";

    bytes.forEach(byte => {
        binary += String.fromCharCode(byte);
    });

    return btoa(binary)
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
}

function base64UrlDecode(value) {
    const padded =
        value.replace(/-/g, "+").replace(/_/g, "/") +
        "===".slice((value.length + 3) % 4);

    const binary = atob(padded);

    return Uint8Array.from(
        binary,
        char => char.charCodeAt(0)
    );
}

async function sign(payload, secret) {
    const key = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(secret),
        {
            name: "HMAC",
            hash: "SHA-256"
        },
        false,
        ["sign"]
    );

    const signature = await crypto.subtle.sign(
        "HMAC",
        key,
        new TextEncoder().encode(payload)
    );

    return base64UrlEncode(
        new Uint8Array(signature)
    );
}

async function createToken(secret) {
    const payload = JSON.stringify({
        sub: "school-user",
        exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS
    });

    const encodedPayload = base64UrlEncode(payload);
    const signature = await sign(encodedPayload, secret);

    return `${encodedPayload}.${signature}`;
}

async function verifyToken(token, secret) {
    if (!token || !secret) {
        return false;
    }

    const parts = token.split(".");

    if (parts.length !== 2) {
        return false;
    }

    const [payload, signature] = parts;
    const expected = await sign(payload, secret);

    if (signature.length !== expected.length) {
        return false;
    }

    let mismatch = 0;

    for (let i = 0; i < signature.length; i++) {
        mismatch |=
            signature.charCodeAt(i) ^
            expected.charCodeAt(i);
    }

    if (mismatch !== 0) {
        return false;
    }

    try {
        const data = JSON.parse(
            new TextDecoder().decode(
                base64UrlDecode(payload)
            )
        );

        return data.exp > Math.floor(Date.now() / 1000);
    } catch {
        return false;
    }
}

function getToken(request) {
    const header =
        request.headers.get("Authorization") || "";

    if (!header.startsWith("Bearer ")) {
        return "";
    }

    return header.slice(7);
}

function githubHeaders(env, contentType = "application/vnd.github+json") {
    return {
        "Accept": "application/vnd.github+json",
        "Authorization": `Bearer ${env.GITHUB_TOKEN}`,
        "X-GitHub-Api-Version": "2026-03-10",
        "Content-Type": contentType,
        "User-Agent": "LEOBAY23-School-Projects"
    };
}

function githubRepo(env) {
    if (!env.GITHUB_OWNER || !env.GITHUB_REPO) {
        throw new Error("GITHUB_OWNER o GITHUB_REPO no están configurados.");
    }

    return `${env.GITHUB_OWNER}/${env.GITHUB_REPO}`;
}

async function requireSession(request, env, origin) {
    const token = getToken(request);

    if (!token || !(await verifyToken(token, env.TOKEN_SECRET))) {
        return {
            ok: false,
            response: json({
                error: "Sesión no válida o vencida."
            }, 401, origin)
        };
    }

    return { ok: true };
}

async function githubRequest(url, env, options = {}) {
    return fetch(url, {
        ...options,
        headers: {
            ...githubHeaders(env),
            ...(options.headers || {})
        }
    });
}

export default {
    async fetch(request, env) {
        const origin =
            request.headers.get("Origin") || "";

        if (request.method === "OPTIONS") {
            return new Response(null, {
                status: 204,
                headers: corsHeaders(origin)
            });
        }

        const url = new URL(request.url);

        // =========================
        // LOGIN
        // =========================

        if (
            url.pathname === "/api/login" &&
            request.method === "POST"
        ) {
            try {
                const body = await request.json();

                if (!env.SCHOOL_PASSWORD) {
                    return json({
                        error: "SCHOOL_PASSWORD no está configurada."
                    }, 500, origin);
                }

                if (!env.TOKEN_SECRET) {
                    return json({
                        error: "TOKEN_SECRET no está configurado."
                    }, 500, origin);
                }

                if (body.password !== env.SCHOOL_PASSWORD) {
                    return json({
                        error: "Contraseña incorrecta."
                    }, 401, origin);
                }

                return json({
                    token: await createToken(env.TOKEN_SECRET)
                }, 200, origin);
            } catch {
                return json({
                    error: "Solicitud inválida."
                }, 400, origin);
            }
        }

        // =========================
        // LISTAR PROYECTOS
        // =========================

        if (
            url.pathname === "/api/projects" &&
            request.method === "GET"
        ) {
            const session = await requireSession(
                request,
                env,
                origin
            );

            if (!session.ok) {
                return session.response;
            }

            try {
                const repo = githubRepo(env);

                const response = await githubRequest(
                    `https://api.github.com/repos/${repo}/releases?per_page=100`,
                    env
                );

                const data = await response.json();

                if (!response.ok) {
                    return json({
                        error: data.message || "No se pudieron cargar los proyectos."
                    }, response.status, origin);
                }

                const projects = data
                    .filter(release => !release.draft)
                    .map(release => ({
                        id: release.id,
                        tag: release.tag_name,
                        title: release.name || release.tag_name,
                        description: release.body || "",
                        created_at: release.published_at || release.created_at,
                        url: release.html_url,
                        assets: release.assets.map(asset => ({
                            id: asset.id,
                            name: asset.name,
                            size: asset.size,
                            download_count: asset.download_count,
                            content_type: asset.content_type
                        }))
                    }));

                return json({ projects }, 200, origin);
            } catch (error) {
                return json({
                    error: error.message || "No se pudieron cargar los proyectos."
                }, 500, origin);
            }
        }

        // =========================
        // SUBIR PROYECTO COMPRIMIDO
        // =========================

        if (
            url.pathname === "/api/projects" &&
            request.method === "POST"
        ) {
            const session = await requireSession(
                request,
                env,
                origin
            );

            if (!session.ok) {
                return session.response;
            }

            try {
                if (!env.GITHUB_TOKEN) {
                    return json({
                        error: "GITHUB_TOKEN no está configurado."
                    }, 500, origin);
                }

                const form = await request.formData();
                const title = String(form.get("title") || "").trim();
                const description = String(form.get("description") || "").trim();
                const version = String(form.get("version") || "").trim();
                const file = form.get("file");

                if (!title || !(file instanceof File)) {
                    return json({
                        error: "Faltan el título o el archivo."
                    }, 400, origin);
                }

                const filename = file.name || "proyecto.zip";
                const lowerName = filename.toLowerCase();

                if (
                    !lowerName.endsWith(".zip") &&
                    !lowerName.endsWith(".rar") &&
                    !lowerName.endsWith(".7z")
                ) {
                    return json({
                        error: "Solo se permiten archivos .zip, .rar o .7z."
                    }, 400, origin);
                }

                if (file.size > MAX_FILE_SIZE) {
                    return json({
                        error: "El archivo supera el límite de 100 MB."
                    }, 413, origin);
                }

                const repo = githubRepo(env);
                const safeVersion =
                    version
                        .replace(/[^a-zA-Z0-9._-]/g, "-")
                        .replace(/-+/g, "-")
                        .replace(/^-|-$/g, "") ||
                    `release-${Date.now()}`;

                const tag = safeVersion.startsWith("v")
                    ? safeVersion
                    : `v${safeVersion}`;

                // Crear Release
                const releaseResponse = await githubRequest(
                    `https://api.github.com/repos/${repo}/releases`,
                    env,
                    {
                        method: "POST",
                        body: JSON.stringify({
                            tag_name: tag,
                            name: title,
                            body: description,
                            draft: false,
                            prerelease: false,
                            generate_release_notes: false
                        })
                    }
                );

                const release = await releaseResponse.json();

                if (!releaseResponse.ok) {
                    return json({
                        error: release.message || "No se pudo crear la Release."
                    }, releaseResponse.status, origin);
                }

                // Subir el archivo como asset
                const uploadUrl =
                    `https://uploads.github.com/repos/${repo}/releases/${release.id}/assets?name=${encodeURIComponent(filename)}`;

                const uploadResponse = await fetch(uploadUrl, {
                    method: "POST",
                    headers: {
                        "Accept": "application/vnd.github+json",
                        "Authorization": `Bearer ${env.GITHUB_TOKEN}`,
                        "X-GitHub-Api-Version": "2026-03-10",
                        "Content-Type": file.type || "application/octet-stream",
                        "Content-Length": String(file.size),
                        "User-Agent": "LEOBAY23-School-Projects"
                    },
                    body: file.stream()
                });

                const asset = await uploadResponse.json();

                if (!uploadResponse.ok) {
                    await githubRequest(
                        `https://api.github.com/repos/${repo}/releases/${release.id}`,
                        env,
                        { method: "DELETE" }
                    );

                    return json({
                        error: asset.message || "No se pudo subir el archivo."
                    }, uploadResponse.status, origin);
                }

                return json({
                    success: true,
                    project: {
                        id: release.id,
                        tag: release.tag_name,
                        title: release.name,
                        description: release.body || "",
                        url: release.html_url,
                        asset: {
                            id: asset.id,
                            name: asset.name,
                            size: asset.size
                        }
                    }
                }, 201, origin);
            } catch (error) {
                return json({
                    error: error.message || "No se pudo subir el proyecto."
                }, 500, origin);
            }
        }

        // =========================
        // DESCARGAR ARCHIVO
        // =========================

        if (
            url.pathname.startsWith("/api/projects/") &&
            url.pathname.endsWith("/download") &&
            request.method === "GET"
        ) {
            const session = await requireSession(
                request,
                env,
                origin
            );

            if (!session.ok) {
                return session.response;
            }

            try {
                const parts = url.pathname.split("/");
                const assetId = parts[3];

                if (!assetId || !/^\d+$/.test(assetId)) {
                    return json({
                        error: "Archivo inválido."
                    }, 400, origin);
                }

                const repo = githubRepo(env);

                const response = await fetch(
                    `https://api.github.com/repos/${repo}/releases/assets/${assetId}`,
                    {
                        headers: {
                            "Accept": "application/octet-stream",
                            "Authorization": `Bearer ${env.GITHUB_TOKEN}`,
                            "X-GitHub-Api-Version": "2026-03-10",
                            "User-Agent": "LEOBAY23-School-Projects"
                        }
                    }
                );

                if (!response.ok) {
                    const data = await response.text();

                    return json({
                        error: `GitHub respondió ${response.status}. ${data.slice(0, 200)}`
                    }, response.status, origin);
                }

                const headers = new Headers(response.headers);
                headers.set(
                    "Content-Disposition",
                    headers.get("Content-Disposition") || "attachment"
                );
                headers.set(
                    "Cache-Control",
                    "private, no-store"
                );
                headers.set(
                    "Access-Control-Allow-Origin",
                    ALLOWED_ORIGINS.includes(origin)
                        ? origin
                        : ALLOWED_ORIGINS[0]
                );
                headers.set(
                    "Access-Control-Expose-Headers",
                    "Content-Disposition, Content-Length"
                );

                return new Response(response.body, {
                    status: response.status,
                    headers
                });
            } catch (error) {
                return json({
                    error: error.message || "No se pudo descargar el archivo."
                }, 500, origin);
            }
        }
        // =========================
// ELIMINAR RELEASE
// =========================

if (
    url.pathname.startsWith("/api/projects/") &&
    request.method === "DELETE"
) {

    const session = await requireSession(
        request,
        env,
        origin
    );

    if (!session.ok) {
        return session.response;
    }

    try {

        const parts =
            url.pathname.split("/");

        const releaseId =
            parts[3];

        if (
            !releaseId ||
            !/^\d+$/.test(releaseId)
        ) {

            return json({
                error:
                    "Release inválida."
            }, 400, origin);
        }


        // =========================
        // VERIFICAR PASSWORD ADMIN
        // =========================

        if (!env.SCHOOL_ADMIN_PASSWORD) {

            return json({
                error:
                    "SCHOOL_ADMIN_PASSWORD no está configurada en Cloudflare."
            }, 500, origin);
        }


        let body;

        try {

            body =
                await request.json();

        } catch {

            return json({
                error:
                    "Solicitud inválida. Falta la contraseña de administrador."
            }, 400, origin);
        }


        const adminPassword =
            String(
                body.adminPassword || ""
            );


        if (!adminPassword) {

            return json({
                error:
                    "Debés ingresar la contraseña de administrador."
            }, 400, origin);
        }


        if (
            adminPassword !==
            env.SCHOOL_ADMIN_PASSWORD
        ) {

            return json({
                error:
                    "Contraseña de administrador incorrecta."
            }, 403, origin);
        }


        // =========================
        // GITHUB
        // =========================

        const repo =
            githubRepo(env);


        // =========================
        // OBTENER RELEASE
        // =========================

        const releaseResponse =
            await githubRequest(
                `https://api.github.com/repos/${repo}/releases/${releaseId}`,
                env
            );


        const releaseData =
            await releaseResponse
                .json()
                .catch(() => ({}));


        if (
            !releaseResponse.ok
        ) {

            return json({
                error:
                    releaseData.message ||
                    "No se pudo encontrar la Release.",

                githubStatus:
                    releaseResponse.status
            }, releaseResponse.status, origin);
        }


        // =========================
        // ELIMINAR RELEASE
        // =========================

        const deleteResponse =
            await githubRequest(
                `https://api.github.com/repos/${repo}/releases/${releaseId}`,
                env,
                {
                    method: "DELETE"
                }
            );


        if (
            !deleteResponse.ok
        ) {

            const deleteData =
                await deleteResponse
                    .json()
                    .catch(() => ({}));


            return json({
                error:
                    deleteData.message ||
                    "GitHub no pudo eliminar la Release.",

                githubStatus:
                    deleteResponse.status
            }, deleteResponse.status, origin);
        }


        // =========================
        // ELIMINAR TAG
        // =========================

        if (
            releaseData.tag_name
        ) {

            const tag =
                encodeURIComponent(
                    releaseData.tag_name
                );


            const tagResponse =
                await githubRequest(
                    `https://api.github.com/repos/${repo}/git/refs/tags/${tag}`,
                    env,
                    {
                        method: "DELETE"
                    }
                );


            /*
             * No hacemos fallar toda la operación
             * si el tag ya no existe.
             */

            if (
                !tagResponse.ok &&
                tagResponse.status !== 404
            ) {

                console.error(
                    "No se pudo eliminar el tag:",
                    tagResponse.status
                );
            }
        }


        return json({
            success: true,

            message:
                "Proyecto eliminado correctamente."
        }, 200, origin);


    } catch (error) {

        console.error(
            "DELETE PROJECT ERROR:",
            error
        );


        return json({
            error:
                error.message ||
                "No se pudo eliminar el proyecto."
        }, 500, origin);
    }
}
        // =========================
        // LOGOUT
        // =========================

        if (
            url.pathname === "/api/logout" &&
            request.method === "POST"
        ) {
            return json({
                success: true
            }, 200, origin);
        }

        return json({
            error: "Ruta no encontrada."
        }, 404, origin);
    }
};
