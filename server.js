const express = require("express");
const path = require("path");

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Estado em memória
let salesState = {
  total: 0,
  currency: "BRL",
  lastDeal: "Aguardando atualização",
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

// Rota principal — abre o index.html
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// SSE — frontend se conecta aqui para receber atualizações em tempo real
app.get("/events", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");

  if (res.flushHeaders) {
    res.flushHeaders();
  }

  // Envia o estado atual imediatamente ao abrir o site
  res.write(`data: ${JSON.stringify(salesState)}\n\n`);

  sseClients.add(res);

  req.on("close", () => {
    sseClients.delete(res);
  });
});

// Webhook — N8N chama este endpoint
// POST /webhook/sale-won
// Body esperado:
// {
//   "value": 1500.00,
//   "deal_name": "Atualização mensal",
//   "currency": "BRL"
// }
app.post("/webhook/sale-won", (req, res) => {
  const { value, deal_name, currency } = req.body;

  if (value === undefined || value === null || isNaN(Number(value))) {
    return res.status(400).json({
      error: "Campo 'value' obrigatório e numérico.",
    });
  }

  // IMPORTANTE:
  // Aqui usamos "=" e não "+=".
  // O N8N já envia o total pronto, então o servidor apenas substitui o valor atual.
  salesState.total = Number(value);
  salesState.currency = currency || "BRL";
  salesState.lastDeal = deal_name || "Atualização mensal";
  salesState.updatedAt = new Date().toISOString();

  console.log(
    `[ATUALIZAÇÃO] ${salesState.lastDeal} — Total atualizado para R$ ${salesState.total}`
  );

  broadcast(salesState);

  res.json({
    ok: true,
    total: salesState.total,
    currency: salesState.currency,
    lastDeal: salesState.lastDeal,
    updatedAt: salesState.updatedAt,
  });
});

// Rota para resetar manualmente
// POST /webhook/reset
app.post("/webhook/reset", (req, res) => {
  salesState = {
    total: 0,
    currency: "BRL",
    lastDeal: "Resetado",
    updatedAt: new Date().toISOString(),
  };

  broadcast(salesState);

  res.json({
    ok: true,
    message: "Total resetado.",
    salesState,
  });
});

// Health check
app.get("/health", (_, res) => {
  res.json({
    status: "ok",
    clients: sseClients.size,
    salesState,
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
