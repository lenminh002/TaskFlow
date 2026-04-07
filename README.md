# 🌊 TaskFlow

TaskFlow is a high-performance, real-time collaborative Kanban application built with **Next.js 16**, **TypeScript**, and **Supabase**. It features a unique "Vibrant Brutalist" design system, optimistic UI updates, and automated activity tracking.

## 🚀 Tech Stack

- **Frontend**: [Next.js 16](https://nextjs.org/) (App Router), [React 19](https://react.dev/), [TypeScript](https://www.typescriptlang.org/)
- **Backend & Realtime**: [Supabase](https://supabase.com/) (Auth, PostgreSQL, Realtime)
- **Drag & Drop**: [@dnd-kit](https://dnd-kit.com/)
- **Styling**: Vanilla CSS Modules with a centralized CSS Variable design system.

## ✨ Key Features

- **Real-time Collaboration**: Instant synchronization across all connected users using Supabase Realtime.
- **Optimistic UI**: Snappy task movements and edits that update the UI immediately before server confirmation.
- **Automated Activity Log**: Changes to statuses, priorities, or assignees are automatically logged into a task's timeline via PostgreSQL triggers.
- **Dynamic Filtering**: Robust label management and filtering system within the board.
- **Interactive Boards**: Drag-and-drop columns and cards with intelligent reordering logic.
- **Vibrant Brutalist Design**: A custom high-contrast UI featuring a Navy, Coral, and Amber palette with "Neopop" shadows and borders.

## 🏗️ Architecture

### State Management
- **BoardClient**: The central orchestrator for board state, handling drag-and-drop events and hydrating data from server actions.
- **Custom Hooks**:
    - `useBoardDnd`: Manages complex drag-and-drop logic and coordinate mapping.
    - `useBoardActions`: Centralizes mutations (add, remove, update) with optimistic feedback.
    - `useBoardRealtime`: Handles debounced subscriptions to prevent update loops during heavy interaction.

### Database Schema
The project relies on a relational PostgreSQL schema (see `document.sql`):
- `users`: Public profiles linked to Supabase Auth.
- `boards`: Container for task collections.
- `board_members`: Join table enabling multi-user collaboration.
- `tasks`: Core cards with `position` (double precision) for sparse increment reordering.
- `comments`: Discussion threads that also serve as the system's audit trail.

## 🛠️ Setup & Local Development

### 1. Requirements
- Node.js 20+
- A Supabase project with the schema from `document.sql` applied.

### 2. Environment Variables
Create a `.env.local` file in the root:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Installation
```bash
npm install
npm run dev
```

## 📜 Database Procedures
The project uses a custom RPC for bulk updates:
- **`batch_update_positions`**: An atomic procedure that updates multiple task positions in a single transaction, significantly reducing network overhead during drag-and-drop reordering.

## 🎨 Design System
Styling is controlled via `src/app/globals.css`. 
- **Primary**: Deep Navy (`#24285B`)
- **Board BG**: Vibrant Amber (`#FBB03B`)
- **Accent**: Coral Red (`#E34C3F`)
- **Style**: 2px solid black borders, hard offset shadows, and snappy transitions.
