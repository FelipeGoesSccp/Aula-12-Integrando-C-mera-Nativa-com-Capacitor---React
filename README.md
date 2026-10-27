# 🐾 PetVacina — Câmera nativa + Supabase Storage

App React + Vite + Capacitor que captura a foto do pet com a câmera nativa
(`@capacitor/camera`) e **envia a imagem para um bucket do Supabase Storage**,
exibindo a URL pública na tela.

## Como funciona

1. `Camera.getPhoto` (resultType `Uri`) devolve o `webPath` da foto.
2. A foto é convertida em `File` (`fetch(webPath)` → `blob` → `new File(...)`).
3. `supabase.storage.from(bucket).upload(caminho, file)` envia para a nuvem.
4. `getPublicUrl(caminho)` devolve a URL pública, usada no `<img>`.

Código principal: `src/components/PetHealthApp.jsx` e `src/services/supabase.js`.

## Pré-requisitos

- Node.js 20+
- Uma conta/projeto no [Supabase](https://supabase.com)

## Configuração do Supabase

1. No painel do projeto, abra **Storage** → **New bucket**.
2. Crie o bucket `fotos-camera` e marque **Public bucket**.
3. Configure as políticas (RLS) de INSERT e SELECT: rode o arquivo
   [`docs/supabase-policies.sql`](docs/supabase-policies.sql) no **SQL Editor**.
4. Em **Project Settings → API**, copie a *Project URL* e a chave *anon public*.

## Como rodar o projeto

```bash
# 1. Instalar dependências
npm install

# 2. Criar o arquivo de variáveis de ambiente
cp .env.example .env
# edite o .env com a URL e a ANON KEY do seu projeto Supabase

# 3. Rodar no navegador
npm run dev
```

Abra o endereço mostrado no terminal, clique em **Selecionar Foto do Pet**,
escolha/tire uma foto e confira o arquivo em **Storage → fotos-camera → pets/**.

### Rodar no Android (Capacitor)

```bash
npm run build
npx cap sync android
npx cap open android   # abre o Android Studio e execute no emulador/dispositivo
```

> ⚠️ O `.env` é lido no **build** (`npm run build`). Se mudar as variáveis,
> gere o build de novo antes do `cap sync`.

## Variáveis de ambiente

| Variável | Descrição |
| --- | --- |
| `VITE_SUPABASE_URL` | URL do projeto Supabase |
| `VITE_SUPABASE_ANON_KEY` | Chave pública `anon` |
| `VITE_SUPABASE_BUCKET` | Nome do bucket (padrão: `fotos-camera`) |

O arquivo `.env` está no `.gitignore` e **não deve ser commitado**. Use apenas
o `.env.example`. Para o GitHub Actions (build do APK), cadastre as mesmas
variáveis em *Settings → Secrets and variables → Actions*.
