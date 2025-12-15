#!/bin/zsh

# Slime Mold Project Setup Script
# Run this in Claude Code or terminal

cd /Users/cminds/Documents/slime-mold

echo "📦 Installing dependencies..."
npm install

echo ""
echo "🔧 Initializing Git repository..."
git init

echo ""
echo "📝 Creating initial commit..."
git add .
git commit -m "feat: initial slime mold simulation v27

Multi-organism simulation with:
- Energy-based growth and autophagy
- Wall drawing mechanics
- Predation of single-cell organisms
- Division/reproduction
- Seed inheritance system
- Food contention resolution (hungrier wins)
- Wall-aware pathfinding"

echo ""
echo "✅ Setup complete!"
echo ""
echo "Commands:"
echo "  npm run dev     - Start dev server"
echo "  npm run build   - Build for production"
echo ""
echo "To add remote:"
echo "  git remote add origin <your-repo-url>"
echo "  git push -u origin main"
