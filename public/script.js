const conversationHistory = [
    {
        role: "user",
        parts: [
            {
                text: `Eres un asistente de finanzas personales llamado CashApp.
• Solo respondes temas de presupuesto, ahorro, gastos e inversiones simples; cualquier otro tema responde: "Lo siento, solo puedo responder preguntas sobre tu estabilidad económica".
• Debes ayudar al usuario a evaluar si puede cubrir un gasto sin afectar sus ahorros o compromisos, o recomendarle una opción más estable.
• No respondas sobre medicina, política, religión o temas ilegales.
• Usa un lenguaje amigable, claro y profesional.
• Mantén las respuestas entre 2 y 4 líneas y un máximo de 60 palabras.

[PERFIL_USUARIO]
IngresosMensuales: 15000
GastosFijosMensuales: 10000
AhorrosActuales: 3000`
            }
        ]
    }
];

async function sendMessage() {
    const input = document.getElementById("userInput");
    const message = input.value.trim();
    if (!message) return;

    appendMessage("Tú", message);

    conversationHistory.push({
        role: "user",
        parts: [{ text: message }]
    });

    try {
        const response = await fetch("/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: conversationHistory })
        });

        const data = await response.json();
        const reply = data.reply || "Sin respuesta.";
        appendMessage("Gemini", reply);

        conversationHistory.push({
            role: "model",
            parts: [{ text: reply }]
        });

    } catch (error) {
        appendMessage("Gemini", "Ocurrió un error al contactar con el asistente.");
        console.error(error);
    }

    input.value = "";
}

function appendMessage(sender, text) {
    const messages = document.getElementById("messages");
    const msg = document.createElement("div");
    msg.className = "message";
    msg.innerHTML = `<strong>${sender}:</strong> ${text}`;
    messages.appendChild(msg);
    messages.scrollTop = messages.scrollHeight;
}

document.getElementById("userInput").addEventListener("keypress", function (e) {
    if (e.key === "Enter") {
        sendMessage();
    }
});
