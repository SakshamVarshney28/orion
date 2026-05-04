# Orion

Orion is an AI-powered coding assistant and in-browser IDE designed to help you build, edit, and manage web projects through a conversational interface. Built with a modern tech stack including Next.js, Convex, and the Vercel AI SDK, Orion allows you to interact with an AI agent that can read, create, and modify your project's file structure in real-time.

## Core Features

-   **Conversational AI Development:** Interact with an AI agent to perform complex coding tasks, from creating single files to scaffolding entire applications.
-   **In-Browser IDE:** A complete development environment in your browser, featuring:
    -   **File Explorer:** A collapsible tree view to manage your project's files and folder structure.
    -   **Code Editor:** A full-featured editor powered by CodeMirror with syntax highlighting, AI-powered suggestions, and quick edits.
    -   **Live Preview:** A WebContainer-powered live preview with an integrated terminal to see your changes instantly.
-   **Robust Agent Capabilities:** The AI agent can list, read, write, and update files, create folders, and scrape URLs for context.
-   **GitHub Integration:** Seamlessly import existing public or private GitHub repositories to start working immediately, and export your Orion projects to a new GitHub repository.
-   **Modern Tech Stack:** Built with Next.js (App Router), Convex for the real-time backend, Clerk for authentication, and Inngest for reliable background jobs.

## Tech Stack

-   **Framework:** Next.js (App Router)
-   **Backend & Database:** Convex
-   **Authentication:** Clerk
-   **Background Jobs:** Inngest
-   **AI:** Vercel AI SDK, Anthropic
-   **UI:** Tailwind CSS, shadcn/ui, Radix UI
-   **Editor:** CodeMirror
-   **Live Preview:** WebContainer API

## Local Development Setup

Follow these steps to set up and run Orion on your local machine.

### 1. Prerequisites

-   Node.js (v20 or later)
-   npm, yarn, or pnpm
-   A Convex account
-   A Clerk account
-   An Inngest account
-   An Anthropic API key

### 2. Clone the Repository

```bash
git clone https://github.com/sakshamvarshney28/orion.git
cd orion
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Set Up Environment Variables

Create a `.env.local` file in the root of the project and add the following environment variables. You will need to get these keys from their respective service dashboards.

```env
# Convex
# Get this from your Convex project dashboard
NEXT_PUBLIC_CONVEX_URL=...
# A secure, random string you generate to protect internal Convex functions
ORION_CONVEX_INTERNAL_KEY=...

# Clerk
# Get these from your Clerk application dashboard
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...
CLERK_SECRET_KEY=...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
# Create a JWT Template in Clerk and use its "Issuer" URL
CLERK_JWT_ISSUER_DOMAIN=...

# Inngest
# Get these from your Inngest project dashboard
INNGEST_EVENT_KEY=...
INNGEST_SIGNING_KEY=...

# AI Provider
# Get this from your Anthropic account
ANTHROPIC_API_KEY=...

# Firecrawl (for the 'scrapeUrls' agent tool)
FIRECRAWL_API_KEY=...
```

### 5. Run the Backend

In a separate terminal, start the Convex development server. This will sync your schema and functions with the Convex cloud. Follow the CLI prompts to log in and link your project.

```bash
npx convex dev
```

### 6. Run the Inngest Dev Server

In another terminal, start the Inngest development server to handle background jobs.

```bash
npm run inngest
```

### 7. Run the Application

Finally, run the Next.js development server.

```bash
npm run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000).
