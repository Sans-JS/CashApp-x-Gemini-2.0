import express from "express";
import session from "express-session";
import bcrypt from "bcrypt";
import { openDb, initializeDb } from "./database.js";
import path from "path";
import fetch from "node-fetch";
import { fileURLToPath } from "url";

const app = express();
const PORT = 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
    secret: "cashapp_secret_key",
    resave: false,
    saveUninitialized: true
}));

// Servir archivos estáticos desde la carpeta public
app.use(express.static(path.join(__dirname, 'public')));

const API_KEY = "AIzaSyBEV0G8Je9FV78WbvFSgpl8ByOQbGYBSWs";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;

let conversationHistory = [];

const SYSTEM_INSTRUCTION = `
Eres un asistente de control de finanzas personales llamado CashApp.
• Solo respondes temas de presupuesto, ahorro, gastos e inversiones simples; cualquier otro tema responde: "Lo siento, solo puedo responder preguntas sobre tu estabilidad económica".
• Debes ayudar al usuario a evaluar si puede cubrir un gasto sin afectar sus ahorros o compromisos económicos así como recomendarle una opción más estable.
• No respondas sobre medicina, política, religión o temas ilegales.
• Usa un lenguaje amigable, claro y profesional.
• Mantén las respuestas entre 2 y 4 líneas y un máximo de 60 palabras.
`;

function authMiddleware(req, res, next) {
    if (req.session.user) next();
    else res.redirect("/login.html");
}
app.get("/login", (req, res) => {
    res.redirect("/login.html");
});

app.get("/register", (req, res) => {
    res.redirect("/createAccount.html");
});
app.post("/register", async (req, res) => {
    const { username, password } = req.body;
    const db = await openDb();
    const hashedPassword = await bcrypt.hash(password, 10);
    try {
        await db.run("INSERT INTO users (username, password) VALUES (?, ?)", [username, hashedPassword]);
        res.redirect("/login.html");
    } catch (err) {
        res.send("El usuario ya existe. <a href='/createAccount.html'>Volver</a>");
    }
});
app.post("/login", async (req, res) => {
    const { username, password } = req.body;
    const db = await openDb();
    const user = await db.get("SELECT * FROM users WHERE username = ?", [username]);

    if (user && await bcrypt.compare(password, user.password)) {
        req.session.user = username;
        res.json({ success: true }); 
    } else {
        res.json({ success: false, message: "Credenciales incorrectas" });
    }
});

app.get("/logout", (req, res) => {
    req.session.destroy(() => {
        res.redirect("/login.html");
    });
});
app.get("/current-user", (req, res) => {
    if (req.session.user) {
        res.json({ username: req.session.user });
    } else {
        res.status(401).json({ error: "No autenticado" });
    }
});
app.get("/dashboard", authMiddleware, (req, res) => {
    res.redirect("/index.html");
});
app.post("/chat", authMiddleware, async (req, res) => {
    const userInput = req.body.message;
    conversationHistory.push({ role: "user", parts: [{ text: userInput }] });

    const payload = {
        contents: [
            { role: "user", parts: [{ text: SYSTEM_INSTRUCTION }] },
            ...conversationHistory
        ]
    };
    const response = await fetch(GEMINI_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });
    const data = await response.json();
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "Error al obtener respuesta.";

    conversationHistory.push({ role: "model", parts: [{ text: reply }] });

   res.json({ reply });

});
app.get("/api/noticias", async (req, res) => {
    const apiKey = "8bda3be7120b70f828f5b68b953d22df";
    const q = req.query.q || "finanzas";
    const url = `https://gnews.io/api/v4/search?q=${encodeURIComponent(q)}&lang=es&country=mx&token=${apiKey}`;

    try {
        const response = await fetch(url);
        const data = await response.json();
        res.json(data.articles);
    } catch (err) {
        res.status(500).json({ error: "Error al obtener noticias" });
    }
});

initializeDb().then(() => {
    app.listen(PORT, () => {
        console.log(`Servidor corriendo en http://localhost:${PORT}`);
    });
});