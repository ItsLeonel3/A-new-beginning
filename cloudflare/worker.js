const ALLOWED_ORIGIN = "https://leobay23.github.io";
const TOKEN_TTL_SECONDS = 60 * 60 * 8;

function corsHeaders() {
    return {
        "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Vary": "Origin"
    };
}

function json(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            "Content-Type": "application/json; charset=utf-8",
            ...corsHeaders()
        }
    });
}

function base64UrlEncode(value) {
    const bytes = value instanceof Uint8Array ? value : new TextEncoder().encode(value);
    let binary = "";
    bytes.forEach(byte => binary += String.fromCharCode(byte));
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(value) {
    const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((value.length + 3) % 4);
    const binary = atob(padded);
    return Uint8Array.from(binary, char => char.charCodeAt(0));
}

async function sign(payload, secret) {
    const key = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(secret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
    );

    const signature = await crypto.subtle.sign(
        "HMAC",
        key,
        new TextEncoder().encode(payload)
    );

    return base64UrlEncode(new Uint8Array(signature));
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
        mismatch |= signature.charCodeAt(i) ^ expected.charCodeAt(i);
    }

    if (mismatch !== 0) {
        return false;
    }

    try {
        const data = JSON.parse(new TextDecoder().decode(base64UrlDecode(payload)));
        return data.exp > Math.floor(Date.now() / 1000);
    } catch {
        return false;
    }
}

function getToken(request) {
    const header = request.headers.get("Authorization") || "";
    return header.startsWith("Bearer ") ? header.slice(7) : "";
}

export default {
    async fetch(request, env) {
        if (request.method === "OPTIONS") {
            return new Response(null, { status: 204, headers: corsHeaders() });
        }

        const url = new URL(request.url);

        if (url.pathname === "/api/login" && request.method === "POST") {
            try {
                const body = await request.json();

                if (!env.SCHOOL_PASSWORD) {
                    return json({ error: "SCHOOL_PASSWORD no está configurada." }, 500);
                }

                if (body.password !== env.SCHOOL_PASSWORD) {
                    return json({ error: "Contraseña incorrecta." }, 401);
                }

                return json({ token: await createToken(env.TOKEN_SECRET) });
            } catch {
                return json({ error: "Solicitud inválida." }, 400);
            }
        }

        if (url.pathname === "/api/codes" && request.method === "GET") {
            const token = getToken(request);

            if (!token || !(await verifyToken(token, env.TOKEN_SECRET))) {
                return json({ error: "Sesión no válida o vencida." }, 401);
            }

            const { results } = await env.DB.prepare(
                "SELECT id, title, language, description, content FROM codes ORDER BY id DESC"
            ).all();

            return json({ codes: results });
        }

        return json({ error: "Ruta no encontrada." }, 404);
    }
};
