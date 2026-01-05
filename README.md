# AI Prompt Website Builder

An AI-powered prompt-to-website builder built with a **compiler-style architecture.**  
The system converts natural language prompts into a **structured WebsiteSpec**, deterministically generates a production-ready Next.js project, and exports it as a runnable ZIP with live preview support.

This project is designed as a **learning-focused, real-world system**, not a toy demo.

---

### Key Features

- **Prompt → WebsiteSpec → Code pipeline** (compiler-style architecture)
- **Local LLM support** (Ollama) — no paid APIs required
- **Deterministic code generation** (no AI-written JSX)
- **Next.js project export** (ZIP downloadable)
- **Live preview** via isolated iframe rendering
- **Section variants & architecture presets** for flexible layouts
- **Theme injection** (colors, fonts) via CSS variables
- **WebsiteSpec validation & auto-repair** for robust error handling
- **Clean separation of concerns** (engine vs UI)

---

### Core Philosophy

> **AI decides intent. The system decides structure.**

The AI is treated as an **untrusted frontend** that produces structured data (WebsiteSpec).  
All rendering, layout, file generation, and project structure are handled **deterministically** by the engine.

This approach avoids:

- ❌ Hallucinated code
- ❌ Unstable builds
- ❌ Unreadable output
- ❌ Security risks

---

### High-Level Architecture

```
User Prompt
   ↓
Ollama (Local LLM)
   ↓
WebsiteSpec (JSON IR)
   ↓
Validation + Auto-Repair
   ↓
Code Generator
   ↓
Next.js Project Scaffold
   ↓
ZIP Export + Live Preview
```

The system is deliberately designed like a **compiler pipeline**, not a chatbot.

---

### Project Structure

```
ai-prompt-website-builder/
│
├── app/                         # Builder UI (Next.js)
│   ├── page.tsx                 # Prompt → Generate → Preview UI
│   ├── preview/[slug]/          # Preview page with iframe
│   └── api/
│       ├── generate/            # Generation endpoint
│       └── preview/[slug]/      # Preview HTML serving
│
├── components/                  # Builder UI components
│   └── ui/                      # Shadcn UI components
│
├── engine/                      # 🧠 Core system (framework-agnostic)
│   ├── runtime/                 # LLM + API adapters
│   │   └── ollama.ts            # Ollama integration
│   │
│   ├── specs/                   # WebsiteSpec logic
│   │   ├── validate.ts          # Hard validation
│   │   ├── repair.ts            # Safe auto-repair
│   │   └── example.json         # Example spec
│   │
│   ├── prompts/                 # LLM prompts
│   │   └── website-spec.ts      # System prompt
│   │
│   ├── config/                  # Configuration
│   │   ├── architectures.ts     # Architecture presets
│   │   ├── components.ts        # Component mappings
│   │   └── ollama.ts            # Ollama defaults
│   │
│   └── generators/              # WebsiteSpec → Code
│       ├── project-generator.ts # Main orchestrator
│       ├── page-generator.ts    # Page generation
│       ├── theme-generator.ts   # Theme injection
│       └── font-generator.ts    # Font configuration
│
├── templates/                   # 🔒 Immutable scaffolds
│   └── next-js/                 # Full Next.js template
│       ├── app/
│       ├── components/
│       └── lib/
│
├── output/                      # 🧪 Generated projects (gitignored)
│   ├── <project-slug>/
│   └── <project-slug>.zip
│
├── types/                       # TypeScript definitions
│   ├── website-spec.ts          # WebsiteSpec schema
│   ├── architecture.ts          # Architecture types
│   └── ollama.ts                # Ollama config types
│
├── lib/                         # Shared utilities
│   └── utils/                   # File system, ZIP, etc.
│
├── README.md
└── package.json
```

---

### WebsiteSpec (Intermediate Representation)

The **WebsiteSpec** is the single source of truth for generation.

#### Design Principles

- ✅ **JSON-only** — no executable code
- ✅ **Deterministic** — same spec = same output
- ✅ **Validated before use** — strict schema validation
- ✅ **Auto-repaired conservatively** — safe defaults only
- ✅ **Versionable** — future schema evolution support

#### Example Structure

```json
{
  "name": "AI Powered Website Builder",
  "slug": "ai-powered-website-builder",
  "description": "A modern, professional website builder leveraging AI",
  "architecture": "landing",
  "theme": {
    "primaryColor": "#ff452c",
    "font": "Anton"
  },
  "pages": [
    {
      "id": "home",
      "name": "Home",
      "route": "/",
      "sections": [
        {
          "id": "sec_home_hero_1",
          "kind": "hero",
          "variant": "split",
          "content": {
            "title": "Build faster with AI",
            "subtitle": "Generate production-ready websites from a single prompt"
          }
        },
        {
          "id": "sec_home_features_2",
          "kind": "features",
          "content": {
            "items": [
              "Prompt-based generation",
              "Deterministic output",
              "Production-ready code"
            ]
          }
        }
      ]
    }
  ]
}
```

---

### Visual System

#### Variants

Each section supports **predefined variants** (e.g., `HeroDefault`, `HeroSplit`).  
The AI selects which variant to use, but **never invents layout code**.

#### Theming

- Theme injected via **CSS variables** (`--primary`, `--font-sans`)
- Tailwind consumes variables (`bg-primary`, `font-sans`)
- **No Tailwind rebuild** per project
- Safe, scalable, SSR-friendly

---

### Architecture Presets

The generator supports architecture presets that affect **folder structure**:

- **`landing`** → `components/sections/`
- **`ecommerce`** → `components/home/`
- **`marketplace`** → `components/layout/`

The same WebsiteSpec can produce different project layouts while keeping behavior identical—mirroring real-world team structures.

---

### Validation & Auto-Repair

Before generation:

1. **WebsiteSpec is validated** against a strict schema
2. **Missing or safe-to-default fields** are auto-repaired
3. **Invalid structures** are rejected early

#### Auto-Repair Capabilities

✅ **Fills missing IDs** (pages, sections)  
✅ **Ensures arrays exist** (pages, sections)  
✅ **Generates slugs** from names if missing  
✅ **Preserves all content** — never drops user intent  
✅ **Does NOT invent** new sections or guess kinds  
✅ **Fails loudly** when unrecoverable

This ensures the generator **never operates on untrusted data**.

---

### Live Preview

- Generated project rendered via **sandboxed iframe**
- **No dependency conflicts** with builder UI
- **No CSS leakage** between preview and builder
- Preview resets cleanly on regeneration
- Accessible via `/preview/<project-slug>`

---

### Getting Started

#### Prerequisites

- **Node.js 18+**
- **Ollama** installed and running

#### Installation

1. **Clone the repository**

```bash
git clone <repository-url>
cd ai-prompt-website-builder
```

2. **Install dependencies**

```bash
npm install
```

3. **Start Ollama**

```bash
# Start Ollama server
ollama serve

# Pull a model (in another terminal)
ollama pull qwen2.5
# or
ollama pull llama3.2
```

4. **Run the builder**

```bash
npm run dev
```

5. **Open the application**

Navigate to [http://localhost:3000](http://localhost:3000)

#### Usage

1. Enter a natural language prompt describing your website
2. Click "Generate" — the system will:
   - Call Ollama to generate a WebsiteSpec
   - Validate and auto-repair the spec
   - Generate a Next.js project
   - Create a ZIP archive
3. Download the ZIP or preview it in the browser

---

### Generated Output

Each generation produces:

- **`/output/<project-slug>/`** → Runnable Next.js app
- **`/output/<project-slug>.zip`** → Downloadable archive

#### Running Generated Projects

After unzipping:

```bash
cd <project-slug>
npm install
npm run dev
```

The generated project is a **fully functional Next.js application** ready for deployment.

---

### Development

#### Project Scripts

```bash
# Development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint
```

#### Architecture Decisions

- **TypeScript** for type safety
- **Next.js App Router** for modern React patterns
- **Tailwind CSS** for styling
- **Ollama** for local LLM inference
- **ZIP archiving** for project export

---

### Why This Project Exists

This project was built to:

- ✅ Understand how **real AI builders work internally**
- ✅ Practice **system-level thinking**
- ✅ Avoid **"AI magic" antipatterns**
- ✅ Build something **maintainable, inspectable, and honest**

It prioritizes **engineering clarity over shortcuts**.

---

### Acknowledgments

- Built with [Next.js](https://nextjs.org)
- LLM integration via [Ollama](https://ollama.ai)
- UI components from [Shadcn UI](https://ui.shadcn.com)
