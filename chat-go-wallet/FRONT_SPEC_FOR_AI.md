# FRONT_SPEC_FOR_AI — Como nossa aplicação funciona (visão geral + envio de mensagens)

**Uso:** este documento descreve, de forma objetiva, como o front do BitHc-macOS e o frontend web **funcionam** no que diz respeito à conexão e ao envio/recebimento de mensagens. Use como referência para desenvolvedores e para IA — **não inventar comportamentos além do aqui descrito**.

---

## 1) Visão Geral da Aplicação

- Arquitetura do front: **SwiftUI (macOS) / React (web)** com padrão **MVVM** (View ↔ ViewModel ↔ Services).
- Salas: metadados persistidos em `rooms.json` (campo: `address`, `access_key`, `name`, `qr_string`, `created_at`).
- Conexão: front conecta a um backend via **WebSocket**; o backend roteia mensagens entre participantes da mesma `room`.
- QR: o app gera/usa strings do tipo `walletchat://<address>?key=<access_key>` para convite/entrada.

---

## 2) Fluxo de conexão (Front → Backend)

1. Seleciona-se uma sala (`room`) no front (dados em `rooms.json` ou ao criar/entrar manualmente).
2. O front monta a URL do WebSocket (ver seção 3) e tenta conectar.
3. Após o evento `onopen` / readyState === OPEN, o front **pode** (recomendado) enviar um handshake `join` para autenticar/associar sessão.
4. O front envia mensagens JSON formatadas de acordo com a especificação (seção 4).
5. O servidor valida, roteia e (normalmente) re-broadcast para os clientes participantes da `room`.
6. O front recebe frames via `onmessage`, processa e persiste (localStorage / UserDefaults / CoreData dependendo da plataforma).

---

## 3) URL do WebSocket (padronizado)

- Dev/Local: `ws://<BACKEND_HOST>:<PORT>/ws/<ROOM_ADDRESS>?key=<ACCESS_KEY>`
- Produção: `wss://<HOST>/ws/<ROOM_ADDRESS>?key=<ACCESS_KEY>`

**Observação:** o `room` aparece na URL e **deve** também constar no payload para roteamento confiável.

---

## 4) Especificação de mensagens (obrigatória)

Use estes formatos exatamente como definidos — não inventar campos:

- Join / Handshake (opcional mas recomendado)
```json
{ "type": "join", "room": "<ROOM_ADDRESS>", "pubkey": "<BASE64_PUBKEY>", "sig": "<BASE64_SIGNATURE>", "protocol": "v1" }
```

- Mensagem de chat (desenvolvimento / plaintext)
```json
{
  "type": "message",
  "room": "<ROOM_ADDRESS>",
  "text": "Olá mundo",
  "sender": "<USERNAME>",
  "timestamp": 1700000000000
}
```

- Mensagem cifrada (E2EE — produção futura)
```json
{
  "type":"message",
  "room":"<ROOM_ADDRESS>",
  "from":"<BASE64_PUBKEY>",
  "payload":"<BASE64_CIPHERTEXT>",
  "nonce":"<BASE64_NONCE>",
  "ts": 1700000000000,
  "sig":"<BASE64_SIGNATURE>"
}
```

- Ping / Pong / Presence (server → clients)
```json
{ "type":"ping", "room":"<ROOM_ADDRESS>", "ts": 1700000000000 }
{ "type":"pong", "room":"<ROOM_ADDRESS>", "ts": 1700000000000 }
{ "type":"presence", "room":"<ROOM_ADDRESS>", "online": true }
```

**Regra crítica:** **sempre** incluir `room` no payload.

---

## 5) Regras e boas práticas de envio

- Não enviar antes do socket estar `OPEN`. Use `onopen` / `onOpen`.
- Logar o payload enviado e usar callback do `send` (JS/Swift) para detectar erros.
- Usar `type: "message"` e campo `room` para mensagens de chat.
- Enfileirar mensagens quando o socket não estiver pronto e re-enviar ao abrir.
- Em produção usar `wss://` e garantir validação de `access_key` no servidor.
- Implementar ack do servidor (`{ "type": "ack", "id": "<msgid>" }`) para confirmar entrega quando possível.

---

## 6) Persistência local (atual comportamento)

- Web (React): histórico salvo em `localStorage` com chave `chat_history_<roomAddress>` (mantém apenas últimas 24h por política atual).
- macOS (Swift): idealmente usar `UserDefaults` para protótipo, `CoreData`/`SwiftData` para histórico completo.

---

## 7) O que está implementado vs o que é TODO

**Implementado (front):**
- UI, lista de salas, QR generation, WebSocket básico (connect/receive/send), persistência de salas (`rooms.json`/localStorage), saving de mensagens por sala (web) com retenção de 24h.

**Faltando / Recomendado:**
- Handshake/Join padrão e validação de sessões mais robusta.
- E2EE (geração e uso real de chaves) — hoje é simulado em algumas partes.
- Acks formais do servidor para confirmar entrega.
- Reconnect com backoff e enfileiramento formal de mensagens.

---

## 8) Debug rápido (como testar se a mensagem chegou ao servidor)

1. Usar `wscat` para enviar frames manualmente e confirmar rebroadcast: 
   `wscat -c ws://HOST:PORT/ws/<ROOM>?key=<KEY>`
2. Conferir Frames no DevTools (Web) ou logs do servidor.
3. No cliente, logar `onopen`, `send(payload)` e callback do `send` (Swift) ou `ws.send` no web.
4. Implementar ack temporário em dev para confirmar recebimento.

---

## 9) Localização no repositório

- `rooms.json` — lista de salas: `/chat-go-wallet/rooms.json`
- Web frontend: `/frontend/src/App.jsx` (conexão e envio atual)
- Mac frontend: código relevante em Swift (Views/Services/BackendManager)

---

## Nota final
Este arquivo é a **fonte de verdade** sobre como nossa aplicação **front** funciona em relação à conexão e ao envio de mensagens. Atualize quando o protocolo mudar e documente a mudança.

