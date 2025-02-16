# Zirqles - Social Media Platform

A modern social media platform built with Next.js, TypeScript, and MongoDB.

## Features

- User authentication with email/password and Google OAuth
- Profile customization with avatar upload
- Post creation and interaction (likes, comments, reposts)
- Real-time updates
- Responsive design

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- MongoDB
- AWS S3
- NextAuth.js
- Tailwind CSS
- Shadcn UI

## Getting Started

1. Clone the repository
2. Copy `.env.example` to `.env.local` and fill in your environment variables
3. Install dependencies: `npm install`
4. Run development server: `npm run dev`

## Deployment

This project is configured for deployment on Vercel:

1. Push your code to GitHub
2. Import project to Vercel
3. Configure environment variables
4. Deploy!

## Environment Variables Required

- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `MONGODB_URI`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION`

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
