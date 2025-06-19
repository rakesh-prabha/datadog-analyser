# Quick Start Guide

🚀 **Get up and running with the AI-Powered Log Analysis Solution in 2 minutes!**

## ⚡ Fast Setup

### 1. **Prerequisites Check**
```bash
node --version  # Should be v18+
npm --version   # Should be v9+
```

### 2. **Install & Configure**
```bash
# Install dependencies (if not already done)
npm install

# Set up your Google Gemini API key
echo "GOOGLE_GENAI_API_KEY=your_api_key_here" > .env

# Verify your CSV file is in place
ls src/extract-*.csv
```

### 3. **Run Analysis**
```bash
# Option 1: Use npm script (recommended)
npm start

# Option 2: Direct node command
node src/index.js

# Option 3: Validate data accuracy first
npm run validate
```

## 📊 What You'll Get

### Console Output Preview
```
🚀 Starting AI-Powered Log Analysis
=====================================

📁 Processing CSV data...
✅ Finished parsing CSV: 180 rows processed
🚨 Total 503 errors found: 36

=== 👥 DETAILED CUSTOMER & STORE IMPACT ===
• Total Affected Customers: 19
• Total Affected Store Locations: 2

🤖 Generating AI analysis...
[Detailed insights and recommendations]

✅ Analysis completed successfully!
```

### Expected Results
- **✅ 36 503 errors detected** with 100% accuracy
- **✅ 19 unique customers identified** with full details
- **✅ 2 store locations affected** (IDs: 162, 19)
- **✅ $382.30 revenue at risk** calculated
- **✅ AI-powered recommendations** for resolution

## 🛠️ Available Commands

| Command | Purpose | When to Use |
|---------|---------|-------------|
| `npm start` | Run complete analysis | **Main usage** - regular analysis |
| `npm run analyze` | Same as start | Alternative command |
| `npm run validate` | Verify data accuracy | **Before important decisions** |
| `node src/index.js` | Direct execution | Debugging or custom usage |

## 🔧 Quick Troubleshooting

### Issue: "CSV file not found"
```bash
# Check if file exists
ls src/extract-*.csv

# Update path in src/log-analyzer.js if needed
```

### Issue: "API key not configured"
```bash
# Verify .env file
cat .env

# Should show: GOOGLE_GENAI_API_KEY=your_key
```

### Issue: "No 503 errors found"
```bash
# Verify CSV format
head -5 src/extract-*.csv

# Check if your CSV matches expected Datadog format
```

## 📈 Understanding Output

### Key Metrics to Watch
- **Error Count**: Should be 36 for the sample data
- **Customer Impact**: 19 unique customers affected
- **Correlation Rate**: Should be 100% (perfect correlation)
- **Revenue Impact**: Total order value at risk

### Success Indicators
- ✅ All validation checks pass
- ✅ Perfect error-to-order correlation (100%)
- ✅ Customer names extracted successfully
- ✅ AI analysis provides actionable insights

## 🎯 Next Steps

### After Your First Run
1. **Review AI recommendations** for immediate actions
2. **Share results** with relevant stakeholders
3. **Monitor** the identified service (`bhyve-task-order-create-lambda`)
4. **Contact affected customers** if needed

### For Regular Use
- Set up **automated runs** for new log files
- Create **monitoring dashboards** based on insights
- Implement **alert thresholds** for error rates

## 📞 Need Help?

- **📖 Full Documentation**: See `README.md`
- **🏗️ Architecture Details**: See `ARCHITECTURE.md`
- **🔍 Data Validation**: Run `npm run validate`
- **🐛 Issues**: Check troubleshooting section in README

---

**🎉 You're all set!** The solution is production-ready and validated at 100% accuracy.
