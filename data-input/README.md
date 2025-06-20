# Data Input Directory

This directory contains the input data files for the AI-Powered Log Analysis solution.

## 📁 Contents

### Directory Structure

```
data-input/
├── input-logs/           # 📂 CSV log files for analysis
│   ├── extract-2025-06-19T05_50_23.398Z.csv
│   ├── extract-2025-06-20T10_30_15.123Z.csv
│   └── ... (any CSV files)
├── storeData.csv         # 🏪 Store mapping database
└── README.md            # 📖 This documentation
```

### Required Files

#### `storeData.csv`
- **Purpose**: Store ID to Store Name mapping database
- **Format**: CSV with headers: `StoreId,StoreName`
- **Example**:
  ```csv
  StoreId,StoreName
  162,Fortitude Valley Metro
  19,World Square
  243,New Store Location
  ```
- **Current Status**: ✅ 242 store mappings loaded

#### `input-logs/` Directory
- **Purpose**: Contains all CSV log files to be analyzed
- **Format**: Datadog CSV exports with error log entries
- **Processing**: All CSV files in this directory are automatically processed
- **Columns Required**:
  - `Date` - Timestamp of log entry
  - `Service` - Service identifier
  - `Message` - Log message content

### Optional Files

#### Legacy Structure
The system previously required a single hardcoded CSV file. The new structure supports:
- ✅ **Multiple CSV files** - Process any number of log files
- ✅ **Automatic discovery** - No need to specify file names
- ✅ **Batch processing** - All files processed sequentially
- ✅ **Aggregated analysis** - Combined results across all files

## 🔒 Security & Privacy

### Data Sensitivity
- **Customer Data**: Log files may contain customer names, emails, and order information
- **Business Data**: Store mappings contain business location information
- **Version Control**: These files are excluded from git via `.gitignore`

### Best Practices
- **Regular Cleanup**: Remove old extract files after analysis
- **Access Control**: Limit access to this directory to authorized personnel only
- **Data Retention**: Follow company data retention policies

## 🚀 Usage

### Adding New Log Files
```bash
# Place new Datadog exports here
cp /path/to/new-export.csv data-input/input-logs/

# Update CONFIG in src/log-analyzer.js if needed
```

### Updating Store Data
```bash
# Add new store mapping
echo "244,New Store Name" >> data-input/storeData.csv

# Verify format
head -5 data-input/storeData.csv
```

### File Validation
```bash
# Validate CSV format
node tools/csv-validator.js

# Check store data loading
node src/index.js
```

## 📊 Current Analysis Target

- **Log File**: `extract-2025-06-19T05_50_23.398Z.csv`
- **Time Range**: 2025-06-18 19:36:21 to 21:20:48
- **Total Entries**: 180 log entries
- **Error Focus**: 503 Service Unavailable errors

## 🔧 Configuration

The solution automatically detects these files via configuration in `src/log-analyzer.js`:

```javascript
export const CONFIG = {
    CSV_FILE_PATH: path.join(__dirname, '..', 'data-input', 'input-logs', 'extract-2025-06-19T05_50_23.398Z.csv'),
    STORE_DATA_PATH: path.join(__dirname, '..', 'data-input', 'storeData.csv'),
    // ... other config
};
```

## 📝 File Naming Conventions

### Log Files
- **Pattern**: `extract-YYYY-MM-DDTHH_MM_SS.sssZ.csv`
- **Source**: Datadog CSV export
- **Content**: Application logs with timestamps, services, and messages

### Store Data
- **Name**: `storeData.csv`
- **Format**: Simple CSV with StoreId,StoreName columns
- **Maintenance**: Updated as new stores are added to the business

---

**⚠️ Important**: Never commit sensitive log files or customer data to version control. This directory is protected by `.gitignore` to prevent accidental commits.
