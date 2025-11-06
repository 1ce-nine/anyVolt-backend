# ⚡ AnyVolt Backend

The backend for the **AnyVolt** project — built with **Strapi**, **MySQL**, and an optional **local AI chatbot** that can answer questions about your products.  
Runs entirely offline with **Ollama** and free local models like **Mistral** or **Llama 3**.

---

## 🚀 Setup Guide (Full Local Environment)

### 🧩 1. Prerequisites (install once per computer)

| Tool | Purpose | Install |
|------|----------|----------|
| **Node.js (v18–22)** | Run Strapi and backend | [nodejs.org](https://nodejs.org) |
| **Docker Desktop** | MySQL database for Strapi | [docker.com/get-started](https://www.docker.com/get-started) |
| **Ollama** | Local AI runtime | [ollama.com/download](https://ollama.com/download) |
| **Mistral model** | Local AI model | Run `ollama pull mistral` |

---

### ⚙️ 2. Initial setup

```bash
git clone https://github.com/YourTeam/anyvolt-backend.git
cd anyvolt-backend
npm install
This installs all backend dependencies (strapi, express, fuse.js, dotenv, etc.).

🧱 3. Start Strapi and build database
Start your local MySQL database (via Docker):

bash
Copy code
npm run db:up
Then run Strapi once to initialize its tables:

bash
Copy code
npm run develop
Wait until you see “Your admin panel is ready at http://localhost:1337/admin”,
then press Ctrl + C to stop Strapi.

🌱 4. Seed sample product data
Populate Strapi with demo products:

bash
Copy code
node scripts/seedProducts.strapi.cjs
You can reseed at any time:

bash
Copy code
npm run db:reset
⚙️ 5. Environment variables
Create a .env file in the project root (or copy from .env.example):

env
Copy code
# Strapi & Database
STRAPI_URL=http://127.0.0.1:1337
KB_PORT=4000

# Ollama local AI
OLLAMA_URL=http://127.0.0.1:11434
OLLAMA_MODEL=mistral
💻 6. Run the servers
bash
Copy code
# Start Strapi CMS
npm run develop

# In another terminal, start the chatbot server
npm run kb
Strapi runs at → http://localhost:1337

Chatbot API runs at → http://localhost:4000

🧠 7. Test the chatbot API
Endpoint	Purpose
http://localhost:4000/health	Health check
http://localhost:4000/kb	Fetch Strapi product data
http://localhost:4000/search?q=battery	Local Fuse.js search
POST http://localhost:4000/ask	Ask the AI a question

Example:

bash
Copy code
curl -X POST http://localhost:4000/ask \
  -H "Content-Type: application/json" \
  -d '{"question": "Which product is best for off-grid solar?"}'
Expected response:

json
Copy code
{
  "answer": "The AnyVolt 3000 Portable Battery is ideal for off-grid solar setups.",
  "model": "mistral"
}
🧩 Folder overview
bash
Copy code
anyvolt-backend/
├─ server/
│  └─ kb-server.js        # Express chatbot server
├─ src/
│  └─ api/                # Strapi APIs (products, etc.)
├─ config/                # Strapi configuration
├─ scripts/
│  └─ seedProducts.strapi.cjs   # Product seeding script
├─ .env.example           # Template for environment variables
└─ package.json           # Dependencies & npm scripts
🧰 Common commands
Command	Description
npm run develop	Start Strapi CMS
npm run start	Run Strapi in production
npm run build	Build the Strapi admin panel
npm run kb	Start local chatbot server
npm run db:up	Start database container
npm run db:down	Stop database container
node scripts/seedProducts.strapi.cjs	Populate Strapi with demo products
npm run db:reset	Reset and reseed database

🧑‍🤝‍🧑 For teammates
When cloning this repo:

Run npm install

Run npm run db:up

Start Strapi once (npm run develop → then stop)

Run node scripts/seedProducts.strapi.cjs

Install Ollama and pull mistral

Start Strapi + chatbot servers (npm run develop & npm run kb)

That’s it — everything runs fully local and free!