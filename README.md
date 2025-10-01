# Factory Gate Security App

This project contains:
- `mobile-app`: React Native frontend for security personnel
- `backend`: Node.js Express backend with MongoDB

## Setup Instructions

### 1. Backend (Node.js + MongoDB)
- Go to the `backend` folder
- Install dependencies: `npm install`
- Set up MongoDB connection in `.env` (see backend README)
- Start server: `npm start`

### 2. Mobile App (React Native)
- Go to the `mobile-app` folder
- Install dependencies: `npm install`
- Run app: `npx react-native run-android` or `npx react-native run-ios`

## Workflow
- Security enters visitor/truck/vehicle details on the app
- Data is sent to backend and stored in MongoDB
- Security can search for repeat visitors and confirm IN time
- When leaving, mark as OUT to close entry

See individual READMEs for more details.