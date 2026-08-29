//cambiar el titulo de la pagina
const titles = [
    "A new beginning",
    "Un nuevo comienzo",
];
let titleIndex = 0;
function changeTitle() {
    document.title = titles[titleIndex];
    titleIndex++;
    if (titleIndex >= titles.length) {
        titleIndex = 0;
    }
}
changeTitle();
//fin del cambio de titulo
setInterval(changeTitle, 3000);
const f = document.getElementById("files");
const a = document.getElementById("audio");
const l = document.getElementById("list");
const n = document.getElementById("name");
const t = document.getElementById("toggle");
const v = document.getElementById("vol");
const p = document.getElementById("prev");
const nx = document.getElementById("next");
let q = [];
let i = -1;
function draw() {
    l.innerHTML = q.length
        ? q.map((x, j) =>
            `<div class="track ${j === i ? "active" : ""}" data-i="${j}">${x.name}</div>`
        ).join("")
        : "Todavía no hay canciones.";
    l.querySelectorAll(".track").forEach(x => {
        x.onclick = () => load(+x.dataset.i, true);
    });
}
function load(j, auto) {
    if (!q[j]) {
        return;
    }
    i = j;
    a.src = q[j].url;
    n.textContent = q[j].name;
    draw();
    if (auto) {
        a.play();
    }
    t.textContent = "❚❚";
}
f.onchange = e => {
    q = [...e.target.files].map(x => ({
        name: x.name,
        url: URL.createObjectURL(x)
    }));
    i = q.length ? 0 : -1;
    draw();
    if (i >= 0) {
        load(i, false);
    }
};
t.onclick = () => {
    if (i < 0 && q.length) {
        load(0, false);
    }
    if (a.paused) {
        a.play();
        t.textContent = "❚❚";
    } else {
        a.pause();
        t.textContent = "▶";
    }
};
p.onclick = () => {
    if (q.length) {
        load(i <= 0 ? q.length - 1 : i - 1, true);
    }
};
nx.onclick = () => {
    if (q.length) {
        load(i >= q.length - 1 ? 0 : i + 1, true);
    }
};
a.onended = () => {
    nx.onclick();
};
v.oninput = () => {
    a.volume = v.value;
};
a.volume = 0.8;
