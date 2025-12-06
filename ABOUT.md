# About This Application

This document provides a comprehensive overview of the Concierge AI application, its architecture, user roles, features, and the underlying AI-powered workflows.

## 1. Application Overview

Concierge AI is a platform designed to help property owners create a digital, AI-powered concierge for their rental properties (e.g., vacation homes, apartments). Visitors can access a dedicated page for each property to ask questions, get information, and interact with curated content provided by the owner.

The application is built on the following technology stack:
-   **Framework**: Next.js (React) with the App Router
-   **UI**: ShadCN UI components and Tailwind CSS
-   **Database**: Firebase Firestore
-   **Authentication**: Firebase Authentication (Email/Password for owners, Anonymous for visitors)
-   **Generative AI**: Google's Gemini models via Genkit
-   **Hosting**: Firebase App Hosting

---

## 2. User Roles

There are three primary user roles in the application:

### a. Visitor (Guest)
-   **Authentication**: Signs in anonymously and automatically when visiting a property page.
-   **Purpose**: To access information about a specific property they are staying at or interested in.

### b. Property Owner
-   **Authentication**: Signs up and logs in with an email and password.
-   **Purpose**: To create and manage digital concierges for their properties.

### c. Superadmin
-   **Authentication**: A special type of Property Owner who has been granted administrative privileges via a backend process.
-   **Purpose**: To manage platform-wide settings and inquiries.

---

## 3. Core Features & Workflows

### a. Visitor Experience

-   **Accessing a Property**: Visitors can access a property's public page by:
    1.  Entering the unique Property ID on the homepage.
    2.  Scanning a QR code provided by the property owner.
-   **AI Concierge Chat**: The primary feature. Visitors can ask questions in a chat interface. The AI uses property-specific data (description, amenities, rules, FAQs, recommendations) to provide accurate answers.
-   **Property Information**: Visitors can browse:
    -   An image gallery of the property.
    -   Detailed descriptions, a list of amenities, and house rules.
    -   A curated list of **FAQs** and **Recommendations** (e.g., local restaurants, activities) provided by the owner.
-   **Leaving Feedback**: Visitors can submit a **review**, including detailed ratings for cleanliness, communication, etc.
-   **Booking Inquiries**: Visitors can send a **booking inquiry** to the owner for any of the recommended experiences.

### b. Property Owner Dashboard

Owners have a secure dashboard to manage all their assets.

-   **Property Management**:
    -   Create, edit, and publish/unpublish properties.
    -   Use AI to **generate property content** (description, amenities, rules) from keywords or by **importing from a URL** (e.g., an Airbnb listing).
    -   Manage the property's image gallery.
-   **FAQ Management**:
    -   Manually add, edit, and delete FAQs.
    -   Use the **AI Suggestion** feature, which analyzes visitor chat logs to recommend new FAQs or improvements to existing ones.
    -   Test the concierge's responses in a sandbox environment.
-   **Recommendation Management**:
    -   Create curated recommendations for local spots.
    -   Use the **AI Assistant** to get ideas for new recommendations based on a query (e.g., "family-friendly restaurants").
-   **Review Management**:
    -   View all submitted reviews.
    -   Use the **AI response generator** to draft replies to visitor reviews.
    -   Report inappropriate reviews for moderation.
-   **Interaction Analytics**:
    -   (Pro/Premium Feature) View and analyze chat logs from visitor interactions.
    -   Generate an **AI-powered summary** of all feedback (chats and reviews) to identify common questions, issues, and actionable insights.
-   **Billing & Profile**:
    -   Manage subscription tier (Free, Pro, Premium), which controls limits on properties, AI messages, and features.
    -   Update their public-facing owner profile.

### c. Superadmin Dashboard

Superadmins have access to a special section of the dashboard for platform management.

-   **Sales Inquiries**: View and manage contact requests from owners interested in the Premium plan.
-   **Superadmin Management**: Grant or revoke superadmin privileges to other users. This is a protected action.

---

## 4. AI & Genkit Flows

The application's AI capabilities are orchestrated using Genkit flows, which are server-side functions that interact with the Gemini models.

| Flow Name                               | Purpose & Trigger                                                                                                | Input                                                    | Output                                                               |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- | -------------------------------------------------------------------- |
| `answerVisitorQuestion`                 | **Core Chat Function**. Answers a visitor's question using all available property context.                         | Property data & visitor question                         | A formatted text answer.                                             |
| `generatePropertyContent`               | Generates a description, amenities, and rules for a new property. Triggered by owner in the "New Property" page. | Keywords (e.g., "beachfront, modern") & property type. | Structured text for description, amenities, and rules.               |
| `importPropertyFromUrl`                 | "Scrapes" a public URL to extract and format property details. Triggered by owner in the "New Property" page.    | A public URL.                                            | Structured text for description, amenities, and rules.               |
| `suggestNewFaqs`                        | Analyzes chat logs and property info to suggest new FAQs. Triggered by owner in the "FAQs" management tab.         | Property context, chat logs, existing FAQs.              | A list of new or edited FAQ suggestions with relevance and reasoning. |
| `generateReviewResponse`                | Drafts a polite, context-aware response to a visitor's review. Triggered by owner in the "Reviews" tab.          | Reviewer name, rating, and comment.                      | A suggested text response.                                           |
| `suggestExperiencesAndRecommendations`  | Suggests local points of interest. Triggered by owner in the "Recommendations" management tab.                   | User query (e.g., "good pizza") & property location.     | A list of 2-3 suggestions with titles, descriptions, and categories. |
| `summarizeClientInteractions`           | **Analytics Feature**. Creates a summary of all visitor feedback. Triggered by owner on the "Analytics" page.    | All chat logs and reviews for a property.                | A markdown-formatted report with actionable insights.                |
| `generateBookingInquiryResponse`        | Drafts a response to a visitor's request to book a recommendation. Triggered by owner in "Booking Inquiries".    | Inquiry details (visitor name, recommendation title, etc.) | A suggested email/message draft.                                     |
| `textToSpeech`                          | Converts a text response from the AI into audible speech. Triggered by visitor clicking the "speak" button.        | Text and a language code.                                | An audio data URI.                                                   |

