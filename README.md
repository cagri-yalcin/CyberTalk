# CyberTalk

**CyberTalk — Secure Communication Platform**

CyberTalk is a React + Firebase messaging application being developed as a long-term course project.

## Current foundation

- Google Authentication
- Firestore user profiles
- User directory
- One-to-one conversation IDs
- Real-time Firestore messaging
- Firebase Cloud Function moderation
- Responsive dark UI

## Run locally

```bash
npm install
npm start
```

## Git workflow

Do not commit `node_modules`, local environment files, build output, or Firebase local cache.

Suggested commit style:

```text
feat: add one-to-one messaging
fix: handle empty user profiles
chore: update project metadata
```

## Project structure

```text
src/
├── components/
│   ├── Auth/
│   ├── Chat/
│   ├── Layout/
│   └── Users/
├── services/
├── styles/
├── App.js
└── index.js
```
