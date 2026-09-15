# 💪 TopSet

> Aplicativo de acompanhamento de treinos de musculação — PWA mobile-first, offline-first, sem backend.

![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178c6?logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-8-646cff?logo=vite&logoColor=white)
![PWA](https://img.shields.io/badge/PWA-installable-5a0fc8?logo=pwa&logoColor=white)

---

## 🖥️ Demo

**[https://gym-app-gamma-cyan.vercel.app](https://gym-app-gamma-cyan.vercel.app)**

---

## ✨ Funcionalidades

### 📋 Fichas de Treino
- Criação e edição de fichas com múltiplos exercícios
- Configuração de séries, repetições (min/max) e tempo de descanso por exercício
- Reordenação de exercícios com setas ▲ ▼
- Visualização prévia da ficha ao tocar no card — incluindo última carga registrada
- Fichas ordenadas alfabeticamente de forma automática
- Duplicação de fichas

### 🏋️ Sessão de Treino Ativo
- Marcação de séries com registro de peso e repetições
- Timer de descanso automático após marcar uma série
- Minimizar sessão e navegar pelo app sem perder o estado
- Auto-resume: sessão inacabada persiste e pode ser retomada
- Substituição de exercício ao vivo (caso aparelho esteja ocupado)
- Sincronização automática do número de séries de volta para a ficha

### 📊 Histórico e Progresso
- Registro completo de todas as sessões finalizadas
- Gráficos de evolução de carga e volume por exercício
- Detecção e exibição de Personal Records (PR)

### 🏆 Personal Records
- PR detectado automaticamente ao bater o maior peso em qualquer série
- Suporte a **exercícios assistidos** (ex: Gravitron): lógica invertida — quanto menor o peso de assistência, maior o PR
- PR avaliado por unidade de carga (kg ou placas) separadamente

### 🔢 Unidades de Carga: KG e Placas
- Cada série pode ser registrada em **kg** ou em **placas**
- Troca de unidade com 1 toque por série
- Placas usam incrementos inteiros (+1, +2, +3...)
- Placas e KG são grandezas independentes (1 placa ≠ X kg)

### 🔄 Substituição de Exercício
- Botão de substituição durante treino ativo
- Filtragem por grupo muscular
- Prévia da última carga do exercício substituto antes de confirmar

### 📅 Blocos de Treinamento
- Criação de blocos com fase (Hipertrofia, Força, Deload, Personalizado)
- Progresso semanal com barra visual
- Alerta automático de semana de deload na última semana

### 📚 Banco de Exercícios
- 60+ exercícios pré-cadastrados em português (pt-BR)
- Criação de exercícios customizados
- Suporte a exercícios assistidos (flag Gravitron)
- Deduplicação e sanitização automática ao carregar

### 🎨 Design e Temas
- 3 temas: **Obsidian** (escuro padrão), **Crimson** (vermelho escuro) e **Light** (claro)
- Design System com CSS custom properties (tokens de cor, tipografia, sombras)
- Animações fluidas com `animate-slide-up` e `animate-scale-in`
- Interface mobile-first otimizada para uso com uma mão

### ⚙️ Configurações
- Seleção de tema
- Tempo de descanso padrão configurável
- Exportação e importação de dados (JSON)
- Reset parcial (histórico) ou total (factory reset)

---

## 🛠️ Stack Tecnológica

| Tecnologia | Versão | Uso |
|---|---|---|
| React | 19 | UI declarativa com hooks |
| TypeScript | 6.0 | Tipagem estática end-to-end |
| Vite | 8 | Build tool e dev server |
| vite-plugin-pwa | 1.3 | PWA com Service Worker (offline) |
| lucide-react | latest | Ícones SVG |
| localStorage | — | Persistência local (sem backend) |

---

## 🗂️ Estrutura do Projeto

```
src/
├── types/
│   └── index.ts                    # Tipos TypeScript (AppData, WorkoutTemplate, LoggedSet, …)
├── services/
│   ├── storage.ts                  # Load/save no localStorage + helpers granulares
│   └── defaultData.ts              # Banco de exercícios padrão (60+ exercícios)
├── hooks/
│   └── useAppData.ts               # Hook de estado global com functional updater
├── components/
│   ├── BottomNav.tsx               # Barra de navegação inferior
│   ├── ActiveWorkoutMiniBar.tsx    # Barra de sessão minimizada
│   ├── WorkoutEditor.tsx           # Editor de fichas de treino
│   └── TrainingBlockModal.tsx      # Modal de bloco de treinamento
├── views/
│   ├── WorkoutsView.tsx            # Fichas de treino + bloco ativo + prévia
│   ├── ActiveWorkoutView.tsx       # Sessão de treino ativo
│   ├── HistoryView.tsx             # Histórico de sessões
│   ├── ProgressView.tsx            # Gráficos de progresso
│   └── SettingsView.tsx            # Configurações e banco de exercícios
├── App.tsx                         # Roteamento simples + estado de treino ativo
├── main.tsx                        # Entry point + StrictMode
└── index.css                       # Design System (temas, tokens, utilitários)
```

---

## 🚀 Como rodar localmente

```bash
# 1. Clone o repositório
git clone git@github.com:IagoVilela05/gym-app.git
cd gym-app

# 2. Instale as dependências
npm install

# 3. Rode em modo de desenvolvimento
npm run dev

# 4. Build de produção
npm run build
```

---

## 📦 Deploy

O app é deployado automaticamente na **Vercel** a partir da branch `main`.

---

## 📝 Licença

MIT
