# 🚀 NUO TRADE

**Algorithmic Trading Platform** - A production-grade monorepo for algorithmic trading and financial analysis.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-14+-black)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-green)
![TimescaleDB](https://img.shields.io/badge/TimescaleDB-latest-orange)

## 📋 Overview

NUO TRADE is a high-performance algorithmic trading and financial analysis platform. It features a professional-grade dashboard for real-time stock analysis, technical indicators calculation, and automated recommendation systems.

### Key Features

- 📈 **Real-time Analysis Dashboard** - Compact and high-density UI for professional traders.
- 🚀 **Finnhub.io Integration** - Stable and accurate real-time market data via official API.
- 🧮 **Technical Indicators** - Real-time calculation of RSI (14D), MACD, Volume Ratios, and Moving Averages.
- 📉 **VIX Market Sentiment** - Integrated Volatility Index tracking for risk assessment.
- 🤖 **Recommendation Engine** - Automated Buy/Sell/Hold signals based on multi-indicator scoring.
- 🗄️ **TimescaleDB** - Optimized time-series database for backtesting and historical data.
- 🐳 **Docker Ready** - One-command deployment with Docker Compose.

## 🏗️ Architecture

```
nuo-trade/
├── frontend/          # Next.js 14+ with TypeScript
│   ├── app/          # App Router pages
│   ├── components/   # React components
│   ├── lib/          # Utilities and API client
│   ├── store/        # Zustand state management
│   └── hooks/        # Custom React hooks
│
├── backend/          # FastAPI Python backend
│   ├── app/
│   │   ├── api/      # API endpoints
│   │   ├── core/     # Configuration & security
│   │   ├── models/   # Database models
│   │   ├── services/ # Business logic
│   │   └── engine/   # Trading algorithms
│   └── main.py       # Application entry point
│
├── database/         # SQL initialization scripts
│   ├── init.sql     # TimescaleDB setup
│   └── schema.sql   # Database schema
│
└── docker-compose.yml # Service orchestration
```

## 🛠️ Technology Stack

### Frontend
- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Charts**: lightweight-charts (TradingView), recharts
- **State**: Zustand
- **Data Fetching**: TanStack Query (React Query)
- **Icons**: lucide-react

### Backend
- **Framework**: FastAPI
- **Language**: Python 3.11+
- **Database ORM**: SQLAlchemy
- **Exchange Integration**: CCXT
- **Authentication**: JWT (python-jose)
- **Data Processing**: Pandas, NumPy

### Infrastructure
- **Database**: TimescaleDB (PostgreSQL + time-series)
- **Cache**: Redis
- **Containerization**: Docker & Docker Compose

## 🚀 Quick Start

### Prerequisites

- Docker & Docker Compose
- Node.js 20+ (for local development)
- Python 3.11+ (for local development)

### 1. Clone and Setup

```bash
# Navigate to project directory
cd nuo-trade

# Copy environment variables
cp .env.example .env

# Edit .env with your configuration
nano .env
```

### 2. Start with Docker (Recommended)

```bash
# Start all services
npm run docker:up

# Or with logs
npm run dev
```

Services will be available at:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **Database**: localhost:5432
- **Redis**: localhost:6379

### 3. Local Development (Without Docker)

#### Frontend

```bash
cd frontend
npm install
npm run dev
```

#### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

## 📚 API Documentation

Once the backend is running, visit:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

### Key Endpoints

- `GET /api/v1/health` - Health check
- `GET /api/v1/market/ticker/{symbol}` - Get ticker data
- `GET /api/v1/market/ohlcv/{symbol}` - Get OHLCV data
- `GET /api/v1/market/symbols` - List available symbols

## 🧪 Development

### Frontend Development

```bash
cd frontend

# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Run production build
npm start
```

### Backend Development

```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# Run with hot reload
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Run tests
pytest

# Format code
black .

# Lint
flake8
```

### Database Management

```bash
# Access database
docker exec -it nuo-trade-db-1 psql -U postgres -d nuotrade

# Run migrations (when implemented)
cd backend
alembic upgrade head

# Create new migration
alembic revision --autogenerate -m "description"
```

## 🔧 Configuration

### Environment Variables

Key environment variables (see `.env.example` for complete list):

```env
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/nuotrade

# Redis
REDIS_URL=redis://localhost:6379/0

# Security
SECRET_KEY=your-secret-key-here

# Exchange API Keys
BINANCE_API_KEY=your-api-key
BINANCE_API_SECRET=your-api-secret
```

## 📊 Trading Strategies

Create custom strategies by extending the `StrategyBase` class:

```python
from app.engine.strategy_base import StrategyBase

class MyStrategy(StrategyBase):
    async def analyze(self, data):
        # Your analysis logic
        pass
    
    async def should_enter(self, analysis):
        # Entry conditions
        pass
    
    async def should_exit(self, analysis, position):
        # Exit conditions
        pass
```

## 🧪 Backtesting

Test your strategies with historical data:

```python
from app.engine.backtest import BacktestEngine

engine = BacktestEngine(initial_capital=10000)
results = await engine.run(strategy, historical_data)
```

## 🐳 Docker Commands

```bash
# Start all services
npm run docker:up

# Stop all services
npm run docker:down

# View logs
npm run docker:logs

# Rebuild containers
npm run docker:rebuild

# Start in detached mode
npm run dev:detached
```

## 📝 Project Status

✅ Complete monorepo structure
✅ Next.js frontend with Compact UI
✅ FastAPI backend with Finnhub Integration
✅ Technical Analysis Dashboard (RSI, MACD, Volume)
✅ Automated Buy/Sell Recommendation System
✅ TimescaleDB & Docker orchestration

### Upcoming Roadmap

- [ ] Interactive Advanced Charts (TradingView/Lightweight Charts)
- [ ] User Portfolio & Order History
- [ ] Real-time WebSocket Price Streams
- [ ] Strategy Backtesting with Finnhub Historical Data
- [ ] Multi-Ticker Comparative Analysis

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- **Finnhub.io** - Stable real-time market data
- **CCXT** - Cryptocurrency exchange integration
- **TradingView** - UI/UX inspiration
- **TimescaleDB** - Optimized time-series database
- **FastAPI** - High-performance Python framework
- **Next.js** - React framework for the web

## 📧 Contact

For questions or support, please open an issue on GitHub.

---

**Built with ❤️ for algorithmic traders**
