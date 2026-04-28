const express = require("express");
const path = require("path");

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Estado em memória
let salesState = {
  total: 0,
  currency: "BRL",
  lastDeal: null,
  updatedAt: null,
};

// Clientes SSE conectados
const sseClients = new Set();

function broadcast(data) {
  const payload = `data: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients) {
    client.write(payload);
  }
}

// SSE — frontend se conecta aqui
app.get("/events", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.flushHeaders();

  // Envia estado atual imediatamente
  res.write(`data: ${JSON.stringify(salesState)}\n\n`);

  sseClients.add(res);

  req.on("close", () => {
    sseClients.delete(res);
  });
});

// Webhook — N8N chama este endpoint
// POST /webhook/sale-won
// Body esperado: { "value": 1500.00, "deal_name": "Empresa X", "currency": "BRL" }
app.post("/webhook/sale-won", (req, res) => {
  const { value, deal_name, currency } = req.body;

  if (!value || isNaN(Number(value))) {
    return res.status(400).json({ error: "Campo 'value' obrigatório e numérico." });
  }

  salesState.total += Number(value);
  salesState.currency = currency || "BRL";
  salesState.lastDeal = deal_name || null;
  salesState.updatedAt = new Date().toISOString();

  console.log(`[VENDA] ${deal_name} — R$ ${value} | Total: R$ ${salesState.total}`);

  broadcast(salesState);

  res.json({ ok: true, total: salesState.total });
});

// Rota para resetar (útil para virada de dia/mês — pode chamar do N8N também)
app.post("/webhook/reset", (req, res) => {
  salesState = { total: 0, currency: "BRL", lastDeal: null, updatedAt: new Date().toISOString() };
  broadcast(salesState);
  res.json({ ok: true, message: "Total resetado." });
});

// Health check
app.get("/health", (_, res) => res.json({ status: "ok", clients: sseClients.size }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Servidor rodando na porta ${PORT}`));
