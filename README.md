# 📊 Kommo Sales Dashboard — Tempo Real

Painel de **Vendas Ganhas** que atualiza em tempo real via N8N + Webhook + SSE.

---

## 🏗 Arquitetura

```
Kommo (evento "negócio ganho")
        ↓
    N8N Workflow
        ↓  HTTP POST
    Este servidor (Express + SSE)
        ↓  Server-Sent Events
    Browser (index.html) → Widget Kommo
```

---

## 🚀 Deploy no Easypanel

1. Suba este repositório no GitHub.
2. No Easypanel: **New App → GitHub → selecione o repo**.
3. Easypanel detecta o `Dockerfile` automaticamente.
4. Defina a porta como **3000**.
5. Gere um domínio (ex: `sales.seudominio.com`).

---

## 🔗 Endpoints

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/` | Painel visual |
| `GET` | `/events` | Stream SSE (frontend conecta aqui) |
| `POST` | `/webhook/sale-won` | N8N envia a venda aqui |
| `POST` | `/webhook/reset` | Reseta o total (útil no início do mês) |
| `GET` | `/health` | Healthcheck |

---

## 📬 Configurando o N8N

### Workflow sugerido:
1. **Trigger**: Webhook do Kommo (evento `lead.status_changed` com status = ganho)
   — ou use o node nativo de **Kommo** no N8N se disponível
2. **Node HTTP Request** com:
   - Method: `POST`
   - URL: `https://SEU_DOMINIO/webhook/sale-won`
   - Body (JSON):
     ```json
     {
       "value": {{ $json.sale_amount }},
       "deal_name": "{{ $json.name }}",
       "currency": "BRL"
     }
     ```

> 💡 Adapte os campos conforme o payload que o Kommo envia para o N8N.

---

## 🧩 Widget Personalizado no Kommo

1. No Kommo, vá em **Configurações → Widgets personalizados**.
2. Crie um novo widget do tipo **iFrame**.
3. URL: `https://SEU_DOMINIO/?widget=1`
4. Dimensões recomendadas: **400 × 280px**.

---

## 🔄 Reset automático (opcional)

Para zerar o total todo dia/mês, adicione um **Schedule Trigger** no N8N:
- Chame `POST https://SEU_DOMINIO/webhook/reset` no horário desejado.

---

## ⚙️ Variáveis de ambiente (opcional)

| Variável | Padrão | Descrição |
|----------|--------|-----------|
| `PORT` | `3000` | Porta do servidor |

---

## 📁 Estrutura do projeto

```
kommo-sales/
├── server.js        # Backend Express + SSE
├── public/
│   └── index.html   # Frontend com animações
├── package.json
├── Dockerfile
└── README.md
```
