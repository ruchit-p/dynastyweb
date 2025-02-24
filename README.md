# Dynasty Web - Family Tree & Stories Platform

A modern web application for creating and managing family trees, sharing family stories, and preserving family history. Built with Next.js, TypeScript, and Supabase.

## Features

### Core Features
- **Family Tree Management**: Create and manage your family tree with an intuitive interface
- **Family Stories**: Share and preserve family memories with rich multimedia content
- **User Authentication**: Secure authentication and authorization using Supabase Auth
- **Real-time Updates**: Live updates for collaborative features
- **Media Management**: Upload and manage photos, videos, and audio recordings
- **Privacy Controls**: Granular privacy settings for sharing content

### Technical Stack
- **Frontend**: Next.js 14 with App Router
- **Language**: TypeScript
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Storage**: Supabase Storage
- **UI Components**: Shadcn/ui
- **Styling**: Tailwind CSS
- **Forms**: React Hook Form with Zod validation
- **State Management**: React Context + Custom Hooks

## Getting Started

### Prerequisites
- Node.js 18.x or later
- npm or yarn
- Supabase account and project

### Environment Setup
1. Clone the repository
```bash
git clone https://github.com/yourusername/dynastyweb.git
cd dynastyweb
```

2. Install dependencies
```bash
npm install
# or
yarn install
```

3. Create a `.env.local` file with your Supabase credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Run the development server:
```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Project Structure

```
dynastyweb/
├── src/
│   ├── app/                 # Next.js app router pages
│   ├── components/          # Reusable React components
│   ├── lib/                 # Utility functions and shared code
│   │   ├── client/         # Client-side utilities
│   │   ├── server/         # Server-side utilities
│   │   └── validation/     # Schema validation
│   ├── types/              # TypeScript type definitions
│   └── styles/             # Global styles
├── public/                 # Static assets
├── docs/                   # Documentation
│   └── STORIES.md         # Stories feature documentation
└── supabase/              # Supabase configuration and migrations
```

## Features Documentation

### Family Stories
The Stories feature allows family members to share and preserve memories through rich multimedia content. See [STORIES.md](docs/STORIES.md) for detailed documentation.

Key capabilities:
- Create multimedia stories
- Tag family members
- Set privacy levels
- Add location data
- Include event dates
- Rich text editing

### Family Tree
- Create and manage family trees
- Add family members and relationships
- Upload photos and documents
- Share trees with family members
- Export tree data

## Development

### Code Style
- Use TypeScript for type safety
- Follow ESLint configuration
- Use Prettier for code formatting
- Follow component organization guidelines

### Testing
```bash
# Run unit tests
npm run test

# Run e2e tests
npm run test:e2e
```

### Database Migrations
```bash
# Generate new migration
npm run migration:generate

# Run migrations
npm run migration:up
```

## Deployment

### Production Deployment
The application is deployed on Vercel:

1. Connect your repository to Vercel
2. Configure environment variables
3. Deploy using the Vercel dashboard or CLI

### Environment Variables
Required environment variables for production:
```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_SITE_URL=
```

## Contributing
1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License
This project is licensed under the MIT License - see the LICENSE file for details.

## Support
For support, email support@dynastyweb.com or open an issue in the repository.

## Acknowledgments
- Next.js team for the amazing framework
- Supabase team for the backend infrastructure
- Shadcn for the UI components
- All contributors to the project
