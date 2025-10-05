# HelpDesk Mini - Ticketing System

A full-stack ticketing system built with React.js frontend and Node.js backend with MongoDB. Features SLA timers, role-based access control, threaded comments, and real-time updates.

## 🚀 Features

### Core Features
- **Ticket Management**: Create, view, update, and track support tickets
- **SLA Management**: Automatic SLA timers with breach detection and escalation
- **Role-Based Access**: User, Agent, and Admin roles with different permissions
- **Threaded Comments**: Nested comment system with internal notes
- **Real-time Updates**: Live updates using Socket.io
- **Search & Filtering**: Advanced search and filtering capabilities
- **Optimistic Locking**: Prevents concurrent update conflicts
- **Notifications**: Email and in-app notifications for all ticket activities
- **Knowledge Base**: AI-powered article suggestions and search
- **Internal Notes**: Agent-only internal comments and notes
- **SLA Escalation**: Automatic ticket escalation based on SLA breaches

### User Roles
- **User**: Create tickets, view own tickets, add comments
- **Agent**: Manage assigned tickets, view all tickets, internal comments
- **Admin**: Full system access, user management, all tickets

### SLA Features
- **Response Time Tracking**: Automatic response time monitoring
- **Resolution Time Tracking**: SLA breach detection
- **Priority-based SLAs**: Different SLA times based on ticket priority
- **Visual Indicators**: Color-coded SLA status indicators
- **Automatic Escalation**: Tickets auto-escalate when SLA is breached
- **Warning Notifications**: Proactive alerts before SLA breach
- **Cron Job Monitoring**: Background service monitors SLA status

### Notification Features
- **Email Notifications**: HTML email templates for all activities
- **In-app Notifications**: Real-time notification panel
- **Notification Types**: Ticket created, updated, assigned, escalated, commented
- **SLA Alerts**: Warning and breach notifications
- **User Preferences**: Customizable notification settings
- **Unread Count**: Badge showing unread notification count

### Knowledge Base Features
- **AI-powered Suggestions**: Smart article recommendations for tickets
- **Full-text Search**: Advanced search across articles
- **Category Organization**: Articles organized by category
- **Article Rating**: Helpful/not helpful feedback system
- **View Tracking**: Article popularity metrics
- **Related Articles**: Cross-referenced content suggestions

## 🛠️ Tech Stack

### Frontend
- **React.js 18** with TypeScript
- **Vite** for build tooling
- **Tailwind CSS** for styling
- **React Router** for navigation
- **React Query** for data fetching
- **React Hook Form** for form management
- **Framer Motion** for animations
- **Heroicons** for icons

### Backend
- **Node.js** with Express.js
- **MongoDB** with Mongoose ODM
- **JWT** for authentication
- **Socket.io** for real-time communication
- **Bcryptjs** for password hashing
- **Express Validator** for input validation

## 📋 Prerequisites

Before running this application, make sure you have the following installed:

- **Node.js** (v16 or higher)
- **MongoDB** (v4.4 or higher)
- **npm** or **yarn** package manager

## 🚀 Installation & Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd helpdesk-mini
```

### 2. Install Dependencies

Install all dependencies for both frontend and backend:

```bash
npm run install-all
```

Or install them separately:

```bash
# Install root dependencies
npm install

# Install backend dependencies
cd server
npm install

# Install frontend dependencies
cd ../client
npm install
```

### 3. Environment Configuration

#### Backend Environment Setup

1. Copy the environment example file:
```bash
cd server
cp env.example .env
```

2. Update the `.env` file with your configuration:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/helpdesk_mini
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRE=7d
NODE_ENV=development
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
FRONTEND_URL=http://localhost:3000
```

#### Frontend Environment Setup

The frontend is configured to proxy API requests to the backend automatically.

### 4. Database Setup

1. Start MongoDB service:
```bash
# On Windows
net start MongoDB

# On macOS/Linux
sudo systemctl start mongod
# or
brew services start mongodb-community
```

2. The application will automatically create the database and collections on first run.

### 5. Running the Application

#### Development Mode (Recommended)

Run both frontend and backend simultaneously:

```bash
npm run dev
```

This will start:
- Backend server on `http://localhost:5000`
- Frontend development server on `http://localhost:3000`

#### Running Separately

**Backend only:**
```bash
npm run server
# or
cd server && npm run dev
```

**Frontend only:**
```bash
npm run client
# or
cd client && npm run dev
```

#### Production Mode

1. Build the frontend:
```bash
npm run build
```

2. Start the backend:
```bash
npm start
```

## 📱 Usage

### 1. Access the Application

Open your browser and navigate to `http://localhost:3000`

### 2. Create an Account

- Click "Create a new account" on the login page
- Fill in your details and select your role
- Available roles: User, Agent, Admin

### 3. Default Admin Account

For testing purposes, you can create an admin account through the registration page or by using the API directly.

### 4. Key Features

#### For Users:
- Create new tickets with detailed descriptions
- View and track your tickets
- Add comments to tickets
- Receive real-time updates

#### For Agents:
- View all tickets and assigned tickets
- Update ticket status and priority
- Assign tickets to other agents
- Add internal notes
- Manage ticket assignments

#### For Admins:
- Full system access
- User management
- View all tickets and statistics
- System configuration

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update profile
- `POST /api/auth/change-password` - Change password

### Tickets
- `POST /api/tickets` - Create new ticket
- `GET /api/tickets` - Get tickets with filtering
- `GET /api/tickets/:id` - Get single ticket
- `PATCH /api/tickets/:id` - Update ticket
- `DELETE /api/tickets/:id` - Delete ticket (admin only)
- `GET /api/tickets/stats/overview` - Get ticket statistics

### Comments
- `POST /api/comments` - Create comment
- `GET /api/comments/ticket/:ticketId` - Get ticket comments
- `PUT /api/comments/:id` - Update comment
- `DELETE /api/comments/:id` - Delete comment
- `POST /api/comments/:id/reaction` - Add/remove reaction

### Users
- `GET /api/users` - Get users (agents/admins only)
- `GET /api/users/agents` - Get agents list
- `GET /api/users/:id` - Get user details
- `PUT /api/users/:id` - Update user (admin only)
- `DELETE /api/users/:id` - Deactivate user (admin only)

## 🗄️ Database Schema

### Users Collection
```javascript
{
  name: String,
  email: String (unique),
  password: String (hashed),
  role: String (user/agent/admin),
  avatar: String,
  isActive: Boolean,
  lastLogin: Date,
  preferences: {
    notifications: { email: Boolean, push: Boolean },
    theme: String
  }
}
```

### Tickets Collection
```javascript
{
  title: String,
  description: String,
  status: String (open/in_progress/resolved/closed/cancelled),
  priority: String (low/medium/high/urgent),
  category: String,
  createdBy: ObjectId (User),
  assignedTo: ObjectId (User),
  sla: {
    responseTime: Number,
    resolutionTime: Number,
    firstResponseAt: Date,
    resolvedAt: Date,
    dueDate: Date
  },
  version: Number (for optimistic locking),
  tags: [String],
  attachments: [Object],
  internalNotes: [Object]
}
```

### Comments Collection
```javascript
{
  ticket: ObjectId (Ticket),
  author: ObjectId (User),
  content: String,
  parentComment: ObjectId (Comment),
  type: String,
  isInternal: Boolean,
  attachments: [Object],
  reactions: [Object],
  isDeleted: Boolean
}
```

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: Bcrypt with salt rounds
- **Input Validation**: Server-side validation using express-validator
- **Rate Limiting**: API rate limiting to prevent abuse
- **CORS Protection**: Configured CORS for security
- **Helmet.js**: Security headers
- **Role-based Access Control**: Granular permissions

## 🚀 Deployment

### Using Docker (Recommended)

1. Create a `docker-compose.yml` file:
```yaml
version: '3.8'
services:
  mongodb:
    image: mongo:latest
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db

  backend:
    build: ./server
    ports:
      - "5000:5000"
    environment:
      - MONGODB_URI=mongodb://mongodb:27017/helpdesk_mini
      - JWT_SECRET=your_jwt_secret
    depends_on:
      - mongodb

  frontend:
    build: ./client
    ports:
      - "3000:3000"
    depends_on:
      - backend

volumes:
  mongodb_data:
```

2. Run with Docker Compose:
```bash
docker-compose up -d
```

### Manual Deployment

1. **Backend Deployment**:
   - Set up a Node.js server (PM2 recommended)
   - Configure environment variables
   - Set up MongoDB database
   - Configure reverse proxy (Nginx)

2. **Frontend Deployment**:
   - Build the React app: `npm run build`
   - Serve static files with Nginx or similar
   - Configure API proxy

## 🧪 Testing

### Backend Tests
```bash
cd server
npm test
```

### Frontend Tests
```bash
cd client
npm test
```

## 📝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit changes: `git commit -am 'Add feature'`
4. Push to branch: `git push origin feature-name`
5. Submit a pull request

## 🐛 Troubleshooting

### Common Issues

1. **MongoDB Connection Error**:
   - Ensure MongoDB is running
   - Check connection string in `.env` file
   - Verify database permissions

2. **Port Already in Use**:
   - Change ports in configuration
   - Kill existing processes using the ports

3. **CORS Errors**:
   - Check `FRONTEND_URL` in backend `.env`
   - Verify CORS configuration

4. **JWT Token Errors**:
   - Check `JWT_SECRET` in backend `.env`
   - Clear browser localStorage

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation

## 🔄 Version History

- **v1.0.0** - Initial release with core features
  - User authentication and authorization
  - Ticket management system
  - SLA tracking and monitoring
  - Real-time updates
  - Role-based access control

---

**Happy Ticketing! 🎫**
