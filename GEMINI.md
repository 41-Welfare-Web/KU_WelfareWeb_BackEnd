# Gemini Session Context - RentalWeb Project

This file contains context for continuing work on the RentalWeb project.

## Project Overview
- **Goal:** Develop the 'RentalWeb' service, a platform for renting items to student bodies (student councils, clubs).
- **Key Business Logic:** The service is a student welfare initiative, so there are no rental fees.
- **Frontend:** React, Vite, TypeScript.
- **Backend (Decision Pending):** The choice between BaaS (e.g., Supabase) and a custom Monolithic API (e.g., Node.js/NestJS) is pending. The current task is to finalize the requirements specification to inform this decision.

## Current Task
- **Objective:** Finalize backend integration and transition to frontend development.
- **Completed (2026-02-04):**
  1. **Holiday Logic**: Implemented `HolidaysService` and integrated into Rentals/Plotter services.
  2. **PDF Verification**: Added Magic Number check (`%PDF-`) for plotter orders.
  3. **SMS Service**: Integrated Solapi(CoolSMS) SDK. Verified real SMS sending (`01090665493` -> `777888`).
  4. **File Service**: Integrated Supabase Storage. Verified file upload and public URL generation.
  5. **Security**: Applied Rate Limiting (Throttler), Auth Attempt Limits (DB), and CORS policy.
  6. **Documentation**: Synchronized `Requirements`, `Backend Guide`, `API List`, and created `TODO.md` with deployment/future tasks.
- **Pending User Action:** None. Backend is ready.
- **Next Step:** Initialize `Project/client` (React + Vite + TS).

## Key Documents
- `Document/요구사항_명세서_v1.0.md`: The main requirements specification document.
- `Document/architecture/usecase/usecase.pdf`: Contains initial use case definitions.
- `Document/architecture/4차 기획 회의 ...pdf`: Contains initial planning and API ideas.
