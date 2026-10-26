# GuildBoard Database

PostgreSQL schema built by Alembic migration `0001_initial_schema`.
Traceability: users (SRS-3, SRS-8, SRS-11), events (SRS-1 to SRS-5),
tickets (US-3, US-4, SRS-6, SRS-7), consultation_sessions (US-9, SRS-9, SRS-10),
course_materials (US-1, US-2, SRS-1).

People are stored as text (the signed-in user's id or name), matching the
session model, so a ticket owner or consulted student does not need an account.

```mermaid
erDiagram
    events |o--o{ course_materials : "attached to"

    users {
        int id PK
        string email UK "lowercase @ku.th"
        string name
        string role "Student | TA | Lecturer | Admin"
        datetime created_at
    }
    events {
        int id PK
        string title
        string course_code
        string event_type
        date event_date
        time start_time
        time end_time
        bool publish_immediately "false = draft"
        string created_by_role
    }
    tickets {
        int id PK
        string title
        string owner
        string priority "Low | Medium | High"
        string status "Open | In-Progress | Closed"
        datetime due_at "at risk: not Closed and due within 48 h or overdue"
        string created_by
    }
    consultation_sessions {
        int id PK
        string student_name
        string student_id
        string topic
        datetime session_at
        text notes
        string recorded_by "the TA"
    }
    course_materials {
        int id PK
        string material_key "same material across versions"
        int version "unique with material_key"
        string title
        string file_name
        bool is_published
        int event_id FK
        string uploaded_by
    }
```
