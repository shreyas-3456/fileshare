# File Sharing Application

This repository contains two separate projects that together form a file sharing application with encryption, secure authentication, MFA, file sharing, and an admin panel.

- **fileShareBackend** – A Django REST Framework application that handles user registration, login (with MFA and JWT cookie‑based authentication), file upload (with AES‑256-GCM encryption), file retrieval (with decryption), public link generation, file sharing, and admin panel endpoints.
- **fileShareFrontend** – A Vite/React 18 application that provides the user interface for file upload, decryption, file sharing, and admin panel functionality.

Both projects are configured to run over HTTPS using (`cert.pem`) and key (`key.pem`) files.

### Clear port 3000 cookies before running the app

### Due to time constraint only PDF view available in the browser, but the implementation is valid for all files

### IF any errors or empty screen, reload the page

#### Accessing django admin username:admin; password:root;

## Features

### 🔒 Security & Authentication

- **Password Encryption with Argon2** – Uses Argon2 for secure password hashing.
- **Multi-Factor Authentication (MFA)** – Requires an email code for added security.
- **JWT Authentication (HttpOnly Cookies)** – Prevents XSS attacks by storing tokens securely in cookies.
- **Role-Based Access Control (RBAC)** – Restricts access based on user roles.
- **AES-256-GCM Encryption for Files** – Encrypts files client-side before upload.
- **Password based access** - Accessing a file requires a password to decrypt the file using PBKDF2
- **One time links** - Users can create one time link which lasts 24hrs (Need password to access file)

### 📂 File Management

- **Secure File Upload & Download** – Files are encrypted twice (once frontend and once backend).
- **Role-Based File Access** – Users can share files with specific people or groups.
- **Public File Links** – Generates shareable links with expiration settings.
- **Admin Panel for File Management** – Allows administrators to view and manage all uploaded files.

## Requirements

- **Docker** and **Docker Compose**
- **Node.js** (v18 or later for fileShareFrontend)
- **Python 3.11+** (for fileShareBackend)
- Certificate files: `cert.pem` and `key.pem` in the root directories of both projects

## Project Structure

- **fileShareBackend** (Django Backend)
  - Contains Django project files, settings, and a `requirements.txt`
  - Includes certificate files: `cert.pem` and `key.pem`
- **fileShareFrontend** (Vite/React Frontend)
  - Contains React application files, a `package.json`, and a `vite.config.js`
  - Includes certificate files: `cert.pem` and `key.pem`
- **docker-compose.yml** – Orchestrates both containers

## Local Development

### fileShareBackend (Django)

- **Setup Virtual Environment & Install Dependencies:**
  - Create and activate a virtual environment:
    - `python -m venv venv`
    - `source venv/bin/activate` (or `venv\Scripts\activate` on Windows)
  - Install dependencies:
    - `pip install -r requirements.txt`
- **Configure HTTPS:**
  - Ensure `cert.pem` and `key.pem` are in the project root.
  - Run the development server with HTTPS (using `runserver_plus` from django-extensions):
    - `python manage.py runserver_plus 0.0.0.0:8000 --cert-file cert.pem --key-file key.pem`
- **Local Access:**
  - Open your browser and navigate to:
    - `https://localhost:8000`
    - (Accept the self‑signed certificate warning if prompted.)

### fileShareFrontend (Vite/React)

- **Install Dependencies:**
  - Navigate to the frontend directory:
    - `cd fileShareFrontend`
  - Install dependencies:
    - `npm install`
- **Configure HTTPS in Vite:**

  - In `vite.config.js`, ensure HTTPS is enabled and points to your certificate files:

    ```js
    import { defineConfig } from 'vite'
    import react from '@vitejs/plugin-react'
    import fs from 'fs'
    import path from 'path'

    export default defineConfig({
      plugins: [react()],
      server: {
        https: {
          key: fs.readFileSync(path.resolve(__dirname, 'key.pem')),
          cert: fs.readFileSync(path.resolve(__dirname, 'cert.pem')),
        },
        port: 3000,
      },
    })
    ```

- **Run the Frontend Server:**
  - Start the development server:
    - `npm run dev`
- **Local Access:**
  - Open your browser and navigate to:
    - `https://localhost:3000`
    - (Again, accept any certificate warnings.)
