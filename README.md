# AI Chat Unifier Dashboard

A production-ready Next.js application for managing and reviewing AI chat histories across multiple platforms and accounts. Built with **corporate blue & gold branding**, real-time updates, and comprehensive chat management features.

## Features

- **Dashboard Home**: Overview with stats (total chats, messages, active AI tools) and recent activity feed
- **All Chats**: Searchable, filterable, paginated list of all conversations with sorting options
- **Chat Detail View**: Full conversation display with markdown support, code highlighting, and export options
- **By AI Tool**: Organize chats by platform (ChatGPT, Claude, Gemini, Grok, Cursor, Lovable)
- **By Account**: Group chats by user account or tag with usage breakdowns
- **Import**: Support for JSON, Markdown file uploads and manual chat entry
- **Export**: Export individual chats as JSON or Markdown files
- **Settings**: Manage profile, display preferences, and AI tool connections
- **Real-time Updates**: Live chat list and stats updates via database subscriptions
- **Responsive Design**: Fully mobile-friendly with collapsible sidebar navigation
- **Corporate Branding**: Consistent navy blue (#015091) and gold (#C6AD69) color scheme with Inter typography

## Tech Stack

- **Frontend**: React 19 + Tailwind CSS 4 + TypeScript
- **Backend**: Express 4 + tRPC 11 + Drizzle ORM
- **Database**: Supabase Postgres with Drizzle migrations
- **Authentication**: Supabase Auth (JWT)
- **Deployment**: Vercel-ready

## Project Structure

```
ai-chat-unifier-dashboard/
├── client/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Home.tsx              # Dashboard home with stats
│   │   │   ├── AllChats.tsx          # Chat list with search/filter
│   │   │   ├── ChatDetail.tsx        # Full conversation view
│   │   │   ├── ByTool.tsx            # Chats grouped by AI tool
│   │   │   ├── ByAccount.tsx         # Chats grouped by account
│   │   │   ├── Import.tsx            # Import chats from files
│   │   │   └── Settings.tsx          # User settings
│   │   ├── components/
│   │   │   ├── DashboardLayout.tsx   # Main layout with sidebar
│   │   │   └── ui/                   # shadcn/ui components
│   │   ├── lib/
│   │   │   └── trpc.ts               # tRPC client setup
│   │   ├── App.tsx                   # Route definitions
│   │   └── index.css                 # Global styles + branding
│   └── public/
├── server/
│   ├── routers.ts                    # tRPC procedure definitions
│   ├── db.ts                         # Database query helpers
│   └── _core/                        # Framework internals
├── drizzle/
│   ├── schema.ts                     # Database schema
│   └── migrations/                   # SQL migration files
├── shared/                           # Shared types and constants
└── package.json
```

## Database Schema

### ai_chats
Stores all chat conversations with flexible JSON structure for messages.

```sql
CREATE TABLE `ai_chats` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `userId` int NOT NULL,
  `aiTool` varchar(64) NOT NULL,        -- e.g., "ChatGPT", "Claude"
  `accountTag` varchar(255),             -- User-defined account identifier
  `title` varchar(500) NOT NULL,
  `fullConversation` json NOT NULL,      -- Array of message objects
  `messageCount` int DEFAULT 0,
  `tags` json,                           -- Array of custom tags
  `createdAt` timestamp DEFAULT NOW(),
  `updatedAt` timestamp DEFAULT NOW() ON UPDATE CURRENT_TIMESTAMP
);
```

### ai_tools
Reference table for available AI platforms.

```sql
CREATE TABLE `ai_tools` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `name` varchar(64) NOT NULL UNIQUE,    -- e.g., "ChatGPT"
  `displayName` varchar(128) NOT NULL,
  `description` text,
  `color` varchar(7),                    -- Hex color code
  `icon` varchar(255),                   -- Icon URL or identifier
  `createdAt` timestamp DEFAULT NOW()
);
```

### accounts
Manages user accounts across different AI platforms.

```sql
CREATE TABLE `accounts` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `userId` int NOT NULL,
  `tag` varchar(255) NOT NULL,           -- User-defined account identifier
  `description` text,
  `createdAt` timestamp DEFAULT NOW(),
  `updatedAt` timestamp DEFAULT NOW() ON UPDATE CURRENT_TIMESTAMP
);
```

### chat_tags
Organizes chats with custom tags.

```sql
CREATE TABLE `chat_tags` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `userId` int NOT NULL,
  `chatId` int NOT NULL,
  `tag` varchar(255) NOT NULL,
  `createdAt` timestamp DEFAULT NOW()
);
```

## API Endpoints (tRPC Procedures)

All endpoints are protected and require authentication.

### Chat Operations
- `chats.list` - Get paginated chats with filters (aiTool, accountTag, searchTerm)
- `chats.byId` - Get a single chat by ID
- `chats.create` - Create a new chat
- `chats.update` - Update chat details
- `chats.delete` - Delete a chat
- `chats.stats` - Get user statistics (total chats, messages, active tools)
- `chats.byTool` - Get chats grouped by AI tool
- `chats.byAccount` - Get chats grouped by account tag

### Authentication
- `auth.me` - Get current user info
- `auth.logout` - Sign out user

## Getting Started

### Prerequisites
- Node.js 22+
- pnpm 10+
- Supabase project (Postgres) or any Postgres 15+

### Installation

1. **Clone and install dependencies**
```bash
cd ai-chat-unifier-dashboard
pnpm install
```

2. **Set up environment variables**

Create a `.env.local` file with:
```env
DATABASE_URL=postgresql://postgres:password@db.<project-ref>.supabase.co:5432/postgres
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_JWKS_URL=https://<your-project-ref>.supabase.co/auth/v1/.well-known/jwks.json
SUPABASE_ISSUER=https://<your-project-ref>.supabase.co/auth/v1
```

3. **Run database migrations**
```bash
pnpm db:push
```

4. **Start development server**
```bash
pnpm dev
```

The application will be available at `http://localhost:3000`

## Building for Production

### Build the application
```bash
pnpm build
```

### Start production server
```bash
pnpm start
```

## Deployment to Vercel

### 1. Prepare your repository
```bash
git init
git add .
git commit -m "Initial commit"
git push origin main
```

### 2. Connect to Vercel
- Visit [vercel.com](https://vercel.com)
- Click "New Project"
- Import your Git repository
- Select the project root directory

### 3. Configure environment variables
In Vercel project settings, add:
- `DATABASE_URL` - Your MySQL connection string
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anon key
- `SUPABASE_JWKS_URL` - Supabase JWKS URL
- `SUPABASE_ISSUER` - Supabase token issuer

### 4. Deploy
Click "Deploy" and Vercel will automatically:
- Build the application
- Run migrations
- Deploy to production

## Import/Export Formats

### JSON Import Format
```json
{
  "title": "Chat Title",
  "aiTool": "ChatGPT",
  "accountTag": "Personal",
  "fullConversation": [
    { "role": "user", "content": "Hello" },
    { "role": "assistant", "content": "Hi there!" }
  ],
  "tags": ["important", "archived"]
}
```

### Markdown Import Format
```markdown
# Chat Title

## User
Your first message here

## AI
AI response here

## User
Your follow-up message
```

## Branding & Customization

### Color Scheme
The application uses corporate blue and gold branding defined in `client/src/index.css`:

- **Primary**: #015091 (Navy Blue)
- **Secondary**: #016cc4 (Professional Blue)
- **Tertiary**: #01345e (Executive Navy)
- **Accent**: #C6AD69 (Corporate Gold)
- **Background**: #f8fafc (Light Gray)

### Typography
- **Font**: Inter (300–700 weights)
- **Load**: Google Fonts CDN

To customize colors, edit the CSS variables in `client/src/index.css`:
```css
:root {
  --primary: #015091;
  --accent: #C6AD69;
  /* ... other variables */
}
```

## Development Workflow

### Adding a new feature

1. **Update database schema** (if needed)
   ```bash
   # Edit drizzle/schema.ts
   pnpm drizzle-kit generate
   # Review generated SQL and apply via webdev_execute_sql
   ```

2. **Add database queries** in `server/db.ts`

3. **Create tRPC procedures** in `server/routers.ts`

4. **Build UI components** in `client/src/pages/` or `client/src/components/`

5. **Test with Vitest**
   ```bash
   pnpm test
   ```

6. **Build and verify**
   ```bash
   pnpm check
   pnpm build
   ```

### Running tests
```bash
pnpm test
```

### Type checking
```bash
pnpm check
```

## Troubleshooting

### Database connection fails
- Verify `DATABASE_URL` is correct
- Ensure database server is running
- Check firewall/network access

### Migrations fail
- Review generated SQL in `drizzle/` directory
- Ensure database user has ALTER TABLE permissions
- Run migrations manually if needed

### Login fails
- Verify Supabase env vars are set correctly
- Ensure Email/Password auth is enabled in Supabase
- Check browser console for error messages

### Import fails
- Verify JSON/Markdown format matches expected structure
- Check browser console for parsing errors
- Try importing a smaller file first

## Performance Optimization

- **Pagination**: All Chats page uses 20-item pagination by default
- **Search**: Full-text search on chat titles (consider adding database indexes for large datasets)
- **Caching**: tRPC queries are cached by React Query
- **Code Splitting**: Routes are lazy-loaded for faster initial load

## Security Considerations

- All endpoints require authentication via Supabase JWTs
- Database queries use parameterized statements to prevent SQL injection
- User data is scoped to authenticated user ID
- Sensitive environment variables are never exposed to client

## Contributing

To contribute improvements:

1. Create a feature branch
2. Make your changes
3. Write/update tests
4. Submit a pull request

## License

MIT

## Support

For issues or questions:
- Check the troubleshooting section above

---

**Auth powered by Supabase**
