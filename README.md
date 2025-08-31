# Job Application Autofill Chrome Extension

A Chrome extension that automatically fills job application forms with stored user profile data, helping job seekers streamline their application process.

## 🚀 Quick Start

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Build the Extension**
   ```bash
   npm run build
   ```

3. **Load in Chrome**
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the `dist/` folder

## 📁 Project Structure

```
├── src/                    # Source code
│   ├── popup/             # React popup interface
│   ├── background/        # Service worker
│   ├── content/          # Content scripts
│   └── shared/           # Common utilities
├── tests/                 # All test files and scripts
│   ├── scripts/          # Test automation scripts
│   ├── test-results/     # Test reports and results
│   └── *.html           # Test pages
├── docs/                  # Documentation
├── public/               # Static assets and manifest
└── dist/                 # Built extension (generated)
```

## 🔧 Development

- `npm run dev` - Start development server
- `npm run build` - Production build
- `npm run build:verify` - Build and run verification tests
- `npm run type-check` - TypeScript type checking

## 📚 Documentation

Detailed documentation is available in the `docs/` directory:

- **[Main Documentation](docs/README.md)** - Complete feature overview and usage guide
- **[Testing Instructions](docs/TESTING_INSTRUCTIONS.md)** - How to test the extension
- **[Design System](docs/DESIGN_SYSTEM_README.md)** - UI/UX design guidelines
- **[Integration Summary](docs/INTEGRATION_SUMMARY.md)** - Component integration details
- **[Troubleshooting](docs/CV_UPLOAD_TROUBLESHOOTING.md)** - Common issues and solutions

## 🧪 Testing

All test files are organized in the `tests/` directory:

- **Test Pages**: `tests/test-*.html` - Interactive test pages for manual testing
- **Test Scripts**: `tests/scripts/` - Automated testing and verification scripts
- **Test Results**: `tests/test-results/` - Generated test reports and accessibility audits

Run the complete test suite:
```bash
npm run build:verify
```

## ✨ Key Features

- **Smart Form Detection** - Automatically identifies job application forms
- **Profile Management** - Store personal information, experience, and skills
- **CV/Resume Parsing** - Extract data from PDF and DOCX files
- **Privacy First** - All data stored locally, no external servers
- **Accessibility** - Full keyboard navigation and screen reader support

## 🛠 Technology Stack

- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite 4.5+ with React plugin
- **Extension Platform**: Chrome Manifest V3
- **Document Parsing**: mammoth (DOCX), pdf-parse (PDF)

## 📄 License

This project is licensed under the MIT License.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `npm run build:verify`
5. Submit a pull request

For detailed development guidelines, see the documentation in the `docs/` directory.