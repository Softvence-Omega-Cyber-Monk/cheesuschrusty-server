# Chessus Server 🧀

Backend for the ItalianMaster language learning platform. This is an AI-powered educational system designed to help users master Italian through dynamic lessons, gamification, and spaced-repetition flashcards.

## 🚀 Features

- **AI-Driven Lessons**: Dynamic content generation using OpenAI, Grok, and Gemini.
- **Gamification**: XP tracking, daily streaks, and automated badge awards.
- **Spaced Repetition System (SRS)**: Advanced flashcard scheduling for vocabulary retention.
- **CEFR Proficiency Tracking**: Real-time estimation of user levels (A1-C2).
- **Subscription Management**: Integrated with Stripe and Lemon Squeezy.

## 🛠 Tech Stack

- **Framework**: [NestJS](https://nestjs.com/)
- **ORM**: [Prisma](https://www.prisma.io/)
- **Database**: PostgreSQL
- **AI Integration**: OpenAI, Google Gemini, Grok
- **Payments**: Stripe, Lemon Squeezy
- **Storage**: Cloudinary

## 📊 Database Architecture

The following diagram illustrates the complete database structure, highlighting the relationships between users, learning content, gamification, and system configuration.

```mermaid
erDiagram
    %% User Core
    USER ||--o| USER_SETTINGS : "configures"
    USER ||--o| STUDY_PLAN : "follows"
    USER ||--o{ PRACTICE_SESSION : "performs"
    USER ||--o{ USER_BADGE : "earns"
    USER ||--o{ FLASHCARD_PROGRESS : "tracks_learning"
    USER ||--o{ SUBSCRIPTION : "subscribed_to"
    
    %% Learning & AI
    LESSON ||--o{ QUESTION_SET : "contains"
    LESSON ||--o{ PRACTICE_SESSION : "evaluated_in"
    USER ||--o{ CHAT_SESSION : "interacts_with_ai"
    CHAT_SESSION ||--o{ CHAT_MESSAGE : "logs"
    
    %% SRS & Gamification
    FLASHCARD_CATEGORY ||--o{ CARD : "organizes"
    CARD ||--o{ FLASHCARD_PROGRESS : "managed_by_srs"
    BADGE ||--o{ USER_BADGE : "awarded_via"
    
    %% Support System
    USER ||--o{ SUPPORT_TICKET : "opens"
    SUPPORT_TICKET ||--o{ SUPPORT_TICKET_MESSAGE : "contains"
    USER ||--o{ SUPPORT_CHAT_TICKET : "requests_help"
    SUPPORT_CHAT_MESSAGE ||--o| SUPPORT_CHAT_TICKET : "linked_to"
    SUPPORT_CHAT_TICKET ||--o{ SUPPORT_CHAT_TICKET_REPLY : "resolved_by"
    
    %% Analytics & Infrastructure
    INTEGRATION_CREDENTIAL ||--o{ INTEGRATION_USAGE_STAT : "tracks_costs"
    USER ||--o{ CEFR_CONFIDENCE_CACHE : "has_proficiency"
    USER ||--o{ USER_NOTIFICATION : "receives"

    USER {
        string id PK
        string email UK
        string role "USER, ADMIN, etc."
        int xp
        int currentStreak
        string currentLevel "Difficulty"
    }

    LESSON {
        int id PK
        string topic
        string skill "READING, WRITING, etc."
        boolean is_pro
        string level "A1-C2"
    }

    PRACTICE_SESSION {
        string id PK
        string userId FK
        int lessonId FK
        float accuracy
        int durationSeconds
        int xpEarned
    }

    FLASHCARD_PROGRESS {
        int id PK
        string userId FK
        int cardId FK
        float easeFactor
        datetime nextReview
    }

    INTEGRATION_CREDENTIAL {
        string id PK
        string provider UK "OPENAI, STRIPE, etc."
        string encryptedPayload
        boolean isActive
    }

    INTEGRATION_USAGE_STAT {
        string id PK
        string provider FK
        float costUsd
        int requestCount
        datetime recordedAt
    }

    CEFR_CONFIDENCE_CACHE {
        string id PK
        string userId FK
        string skillArea "reading, etc."
        string cefrLevel "A1-C2"
        float confidenceLevel
    }

    SUPPORT_CHAT_TICKET {
        string id PK
        string userId FK
        string status "OPEN, CLOSED"
        datetime updatedAt
    }

    BRANDING_SETTINGS {
        int id PK
        string primaryColor
        string headingFont
    }

    SECURITY_SETTINGS {
        int id PK
        int maxLoginAttempts
        boolean gdprComplianceMode
    }
```

## 🛠 Development

### Setup
1. Clone the repository
2. Install dependencies: `npm install`
3. Configure `.env` file (see `.env.example`)
4. Run migrations: `npx prisma migrate dev`
5. Start the server: `npm run dev`

### License
UNLICENSED
