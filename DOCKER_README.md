Como rodar o backend (com Venom) dentro de um container Docker

Resumo rápido
- Este setup usa uma imagem base do Playwright que já inclui navegadores compatíveis (Chromium/Chrome) — evita problemas de headless no Windows.
- O container monta a pasta `back_nautica` do seu host em `/app`, portanto arquivos gerados (ex: `venom-qr.png`) aparecerão no seu host.

Pré-requisitos
- Docker Desktop instalado no Windows (com WSL2 backend preferível).

Passos
1) No projeto, defina as variáveis em `back_nautica/.env` (exemplo mínimo):

```
USE_VENOM=true
VENOM_PROFILE_DIR=/data/venom_profile
VENOM_EXECUTABLE_PATH=
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_WHATSAPP_FROM=whatsapp:+1XXXXXXX
```

Obs: nós mapeamos o volume Docker `venom_profile` para `/data` dentro do container. Defina `VENOM_PROFILE_DIR=/data/venom_profile` para o Venom usar esse diretório dentro do container.

2) Build e up (na raiz do repositório onde está o `docker-compose.yml`):

```powershell
docker compose up --build
```

3) Aguarde o container iniciar. Verifique logs do serviço `back` no terminal. Quando o Venom iniciar corretamente, ele vai salvar o QR em `back_nautica/venom-qr.png` — abra e escaneie com o WhatsApp (Linkar um dispositivo > Escanear QR).

4) Se preferir rodar em modo com GUI no host (para debugar), abra o Chrome/Edge no host e verifique se a porta 9222 (remote debug) está funcionando, mas em container geralmente não é necessário.

Dicas de troubleshooting
- Se o container não inicializar por falta de dependências, veja o log e execute `docker compose up --build` novamente para forçar rebuild.
- Se o QR não aparecer, cole os logs aqui (as linhas com `Error`, `Venom status`, `QR salvo em:` etc.).

Segurança
- Não exponha tokens (TWILIO_*) publicamente. Use `.env` local que não deve ser commitado.
