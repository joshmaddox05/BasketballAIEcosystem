# Basketball AI Ecosystem

A comprehensive basketball training platform with AI-powered jump shot analysis, personalized training blueprints, and community features.

## 🏀 Features

- **AI Jump Shot Analysis**: Real-time shot critique using MediaPipe Pose and TensorFlow Lite
- **Training Blueprints (DBE)**: Personalized drill recommendations based on analysis
- **EvalRank System**: Performance scoring and leaderboards  
- **Community Feed**: Share progress and connect with other players
- **Cross-platform**: React Native mobile app with backend API

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- pnpm 8+
- Python 3.9+ (for AI backend)
- Expo CLI

### Development Setup

```bash
# Clone the repository
git clone https://github.com/joshmaddox05/BasketballAIEcosystem.git
cd BasketballAIEcosystem

# Install dependencies
make install

# Start development servers
make dev
```

This will start:
- Backend API at http://localhost:3000
- Mobile app with Expo
- API documentation at http://localhost:3000/docs

### Available Commands

```bash
make dev          # Start both backend and mobile
make dev-backend  # Start backend only
make dev-mobile   # Start mobile app only
make test         # Run all tests
make lint         # Lint all packages
make build        # Build all packages
```

## 📱 Mobile App

Built with React Native and Expo:
- **Cross-platform**: iOS and Android
- **Camera integration**: Record basketball shots
- **Real-time analysis**: Instant feedback on shooting form
- **Progress tracking**: View improvement over time

## 🔧 Backend API

FastAPI-based backend with:
- **Health monitoring**: `/healthz` endpoint with system metrics
- **OpenAPI docs**: Interactive documentation at `/docs`
- **Request tracing**: UUID-based request correlation
- **Firebase Auth**: JWT-based authentication

## 🏗️ Architecture

### Technology Stack
- **Frontend**: React Native + Expo
- **Backend**: Node.js + Fastify + TypeScript
- **AI/ML**: Python + MediaPipe + TensorFlow Lite
- **Database**: PostgreSQL + Prisma
- **Auth**: Firebase Authentication
- **Storage**: AWS S3 + CloudFront
- **Deploy**: GitHub Actions + Render

### Project Structure
```
├── src/           # React Native mobile app
├── backend/       # Node.js API server
├── packages/      # Shared packages
├── docs/          # Documentation and ADRs
└── tools/         # Development tools
```

## 📊 Development Progress

### ✅ Completed
- **T-001**: Monorepo setup with pnpm workspaces
- **T-002**: Backend health monitoring and OpenAPI documentation

### 🔄 In Progress  
- **T-003**: Firebase Auth integration and JWT middleware

### 📋 Roadmap
- Video upload and processing pipeline
- AI baseline model implementation
- Training blueprint engine
- Community features
- Mobile app store deployment

See [MVP Tracking](docs/mvp-tracking.md) for detailed progress.

## 🧪 Testing

```bash
# Run all tests
make test

# Run tests with coverage
make test-coverage

# Run tests in watch mode
make test-watch
```

## 📚 Documentation

- [Architecture Decision Records](docs/adr/)
- [API Documentation](http://localhost:3000/docs) (when running)
- [MVP Progress Tracking](docs/mvp-tracking.md)

## 🔐 Environment Variables

Create `.env` files for configuration:

**Backend (.env)**
```
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://...
FIREBASE_PROJECT_ID=your-project-id
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
```

**Mobile App (.env)**  
```
API_BASE_URL=http://localhost:3000
FIREBASE_PROJECT_ID=your-project-id
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`  
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Development Workflow
- Every ticket = one PR with tests and documentation
- ADR for architectural decisions
- OpenAPI schema updates for API changes
- "How I verified" section in PR descriptions

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- MediaPipe team for pose estimation models
- Expo team for cross-platform development tools
- Basketball community for feedback and testing

---

**Status**: 🚧 Active Development  
**Version**: 1.0.0-alpha  
**Last Updated**: October 2025