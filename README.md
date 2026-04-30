# Controle Financeiro PWA

Aplicativo PWA completo para controle financeiro pessoal. Mobile-first com suporte a desktop.

## Tecnologias

- **React 19** + **Vite 8** + **TypeScript**
- **Tailwind CSS v4**
- **Firebase** (Auth + Firestore + Hosting)
- **vite-plugin-pwa** (Service Worker + instalável)
- **Recharts** (gráficos)
- **Lucide React** (ícones)
- **React Router DOM v7**

## Funcionalidades

- Autenticação (login, cadastro, recuperação de senha)
- Dashboard com gráficos e resumo mensal
- Lançamento de despesas (normal, fixa, parcelada)
- Contas fixas (geração automática por mês, ativar/desativar)
- Contas parceladas (acompanhamento de parcelas)
- Categorias personalizadas com cores
- Tema claro/escuro
- Layout responsivo: Sidebar no desktop, Menu inferior no mobile
- Dados isolados por usuário no Firestore

## Configuração

### 1. Clonar o repositório
```bash
git clone https://github.com/gui130699/PWA-FINAN-AS-MOBILE.git
cd PWA-FINAN-AS-MOBILE
npm install
```

### 2. Configurar Firebase
Acesse https://console.firebase.google.com e:
1. Crie um novo projeto
2. Ative **Authentication** > Email/Senha
3. Ative **Firestore Database** (modo de produção)
4. Registre um app Web e copie as credenciais

### 3. Variáveis de ambiente
Copie o arquivo de exemplo e preencha com suas credenciais:
```bash
cp .env.example .env
```

Edite o `.env`:
```env
VITE_FIREBASE_API_KEY=sua_api_key
VITE_FIREBASE_AUTH_DOMAIN=seu-projeto.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=seu-projeto-id
VITE_FIREBASE_STORAGE_BUCKET=seu-projeto.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=seu_sender_id
VITE_FIREBASE_APP_ID=seu_app_id
```

### 4. Regras do Firestore
No console do Firebase > Firestore > Regras, aplique:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## Comandos

### Rodar localmente
```bash
npm run dev
```
Acesse: http://localhost:5173

### Build de produção
```bash
npm run build
```
Os arquivos ficam em `dist/`

### Deploy no Firebase Hosting
```bash
# Instalar Firebase CLI (uma vez)
npm install -g firebase-tools

# Login no Firebase
firebase login

# Inicializar Firebase no projeto (uma vez)
firebase init hosting

# Deploy
npm run build
firebase deploy
```

### Subir alterações para o GitHub
```bash
git add .
git commit -m "sua mensagem de commit"
git push
```

## Estrutura do projeto

```
src/
├── components/
│   ├── layout/         # AppLayout, Sidebar, BottomNav, TopBar
│   └── ui/             # Button, Card, Input, Modal, Toast, Loading...
├── contexts/           # AuthContext, ThemeContext
├── hooks/              # useTransactions, useFixedAccounts, useInstallments, useCategories
├── lib/                # firebase.ts
├── pages/              # LoginPage, DashboardPage, TransactionsPage...
├── services/           # firestore.ts (CRUD completo)
├── types/              # index.ts (TypeScript types)
└── utils/              # formatters.ts
```

## Estrutura do Firestore

```
users/{userId}/
  transactions/{transactionId}
  fixedAccounts/{fixedAccountId}
  installmentGroups/{groupId}
  categories/{categoryId}
```

## Repositório

https://github.com/gui130699/PWA-FINAN-AS-MOBILE
