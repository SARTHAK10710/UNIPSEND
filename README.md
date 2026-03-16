# Unispend Prototype Setup Guide

This guide explains how to set up and run the Unispend prototype on an Android emulator.

## Prerequisites
- Node.js (v20+)
- Android Studio & SDK
- JDK 17 (recommended)

## Setup Instructions

1. **Environment Variables**:
   Create a `.env` file in the root directory. Use `.env.example` as a template.

2. **Install Dependencies**:
   ```bash
   # Root
   npm install
   # Frontend
   cd frontend && npm install
   ```

3. **Database**:
   Ensure Postgres and Redis are running. If using Docker:
   ```bash
   docker-compose up -d postgres redis
   ```

4. **Start Backend Services**:
   Run the gateway and microservices:
   ```bash
   # In separate terminals or using a process manager
   cd gateway && npm start
   cd services/auth-service && npm start
   # ...etc
   ```

5. **Start Frontend**:
   ```bash
   cd frontend
   npx react-native start
   # In another terminal
   adb reverse tcp:8081 tcp:8081
   adb reverse tcp:3000 tcp:3000
   npx react-native run-android
   ```

## Troubleshooting
- **Blank Screen**: Ensure `adb reverse` is set for ports 8081 and 3000.
- **Gradle Errors**: Ensure `JAVA_HOME` points to JDK 17 and `local.properties` has the correct `sdk.dir`.
