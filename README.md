# Firebase Studio

This is a NextJS starter in Firebase Studio.

To get started, take a look at src/app/page.tsx.

---

## Vercel Deployment Guide

To deploy this project to Vercel, you need to set up the required environment variables.

### 1. Set the Gemini API Key

The AI chat functionality relies on the Google Gemini API. You must provide your API key as an environment variable in your Vercel project.

1.  **Get your API Key:** Obtain your Gemini API key from [Google AI Studio](https://makersuite.google.com/app/apikey).
2.  **Go to your Vercel Project Settings:** Open your project in Vercel and navigate to the "Settings" tab.
3.  **Go to Environment Variables:** In the settings menu, click on "Environment Variables".
4.  **Add the Variable:**
    *   **Name:** `GEMINI_API_KEY`
    *   **Value:** Paste the API key you obtained from Google AI Studio.
    *   Ensure the variable is available for all environments (Production, Preview, and Development).
5.  **Save and Redeploy:** Save the variable. Vercel will trigger a new deployment to apply the changes.

After the new deployment is complete, the AI chat functionality should work correctly.

---

## How to Push to a New Git Repository

If you are encountering a `(push declined due to repository rule violations)` error, it likely means your repository's `main` branch is protected. This is a good security practice!

The standard workflow for protected branches involves pushing your changes to a *new branch* and then creating a **Pull Request** (PR) to merge them into `main`.

### Step 1: Create a New Branch for Your Changes

First, create a new branch locally. This gives your work its own separate space.

1.  **Initialize Git (if you haven't already):** If this is your first time, run these commands.
    ```bash
    git init -b main
    git add .
    git commit -m "Initial commit"
    ```

2.  **Create and Switch to a New Branch:** Replace `my-feature-branch` with a descriptive name for your work (e.g., `initial-project-setup`).
    ```bash
    git checkout -b my-feature-branch
    ```

### Step 2: Connect to Your New Remote Repository

Now, tell your local repository where the remote repository is located.

3.  **Add the Remote:** This command creates a connection named `origin` that points to your new repository's URL. **Only do this once.**

    **Important:** Replace `YOUR_REPOSITORY_URL` with the actual URL from your Git hosting provider (e.g., `https://github.com/your-username/your-repo.git`).

    ```bash
    git remote add origin YOUR_REPOSITORY_URL
    ```
    *If you get an error saying `remote origin already exists`, that's okay. You can skip this step.*

### Step 3: Push Your New Branch

Instead of pushing to `main`, you will now push your new feature branch to the remote repository.

4.  **Push Your Feature Branch:** This command sends your new branch up to GitHub (or your provider). The `-u` flag sets it as the default for this branch.
    ```bash
    git push -u origin my-feature-branch
    ```

### Step 4: Create a Pull Request on GitHub

Now that your branch is on GitHub, you can propose to merge it into `main`.

5.  **Go to your repository on GitHub.com.** You should see a yellow banner with a message like: *"my-feature-branch had recent pushes. Compare & pull request"*.

6.  **Click the "Compare & pull request" button.**

7.  On the next page, you can add a title and description for your changes. Then, click **"Create pull request"**.

8.  Since this is your own repository, you can now **"Merge pull request"** and then **"Confirm merge"**.

Your code is now safely in the `main` branch, following the repository's rules! You can delete the feature branch after merging.
