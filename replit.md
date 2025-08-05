# WhatsApp Campaign Manager

## Overview

This is a full-stack WhatsApp automation application that enables users to create and manage bulk messaging campaigns. The system provides a web-based dashboard for connecting WhatsApp sessions, importing contacts from Excel files, creating message campaigns with template variables, and monitoring campaign progress in real-time. Built with a modern React frontend and Express.js backend, it integrates with the WPPConnect library for WhatsApp automation and uses PostgreSQL for data persistence.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes (August 2025)

- **Migration Complete**: Successfully migrated project from Replit Agent to Replit environment
- **Excel Processing Update**: Modified to read company names from column B and phone numbers from column F (specific column positions)
- **Phone Number Handling**: Enhanced Brazilian phone number cleaning to handle formats like "(11) 99761-3946"
- **Save Draft Feature**: Fixed save draft button functionality with proper validation
- **UI Simplification**: Hidden message interval and scheduling options (defaults: 5 seconds between messages, immediate sending)
- **Backend Fixes**: Resolved string-to-number conversion issues for messageInterval field

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for client-side routing
- **UI Library**: Radix UI components with shadcn/ui design system
- **Styling**: Tailwind CSS with custom WhatsApp-themed color palette
- **State Management**: TanStack Query (React Query) for server state management
- **Form Handling**: React Hook Form with Zod validation
- **Real-time Updates**: WebSocket client for live campaign monitoring

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **API Design**: RESTful endpoints with real-time WebSocket support
- **File Processing**: Multer for Excel file uploads with XLSX parsing
- **WhatsApp Integration**: WPPConnect library for browser automation
- **Session Management**: In-memory storage with option for database persistence

### Data Storage Solutions
- **Database**: PostgreSQL with Drizzle ORM
- **Schema Design**: 
  - WhatsApp sessions table for connection management
  - Campaigns table for message campaign configuration
  - Contacts table with custom field support for template variables
  - Activity logs table for audit trail and real-time monitoring
- **Migration System**: Drizzle Kit for schema management
- **Connection**: Neon Database serverless PostgreSQL

### Authentication and Authorization
- **Current State**: No authentication system implemented
- **Session Management**: Basic session tracking for WhatsApp connections
- **Access Control**: Open access to all endpoints

### External Service Integrations
- **WhatsApp Web**: Browser automation via WPPConnect
- **File Processing**: Server-side Excel parsing and validation
- **Real-time Communication**: WebSocket server for live updates
- **Development Tools**: Vite for frontend build system with HMR

### Key Design Patterns
- **Component Architecture**: Reusable UI components with consistent design system
- **Data Flow**: Unidirectional data flow with React Query for caching and synchronization
- **Error Handling**: Centralized error management with toast notifications
- **Real-time Updates**: Event-driven architecture with WebSocket broadcasting
- **File Upload**: Multi-part form data handling with validation and progress tracking
- **Campaign Management**: State machine pattern for campaign lifecycle (draft, active, paused, completed)

### Development and Deployment
- **Build System**: Vite for frontend, esbuild for backend compilation
- **Development**: Hot module replacement and TypeScript checking
- **Environment**: Replit-optimized with development banner integration
- **Package Management**: npm with lockfile for dependency consistency