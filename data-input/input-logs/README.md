# Input Logs Directory

This directory contains all CSV log files that will be processed by the AI-powered log analyzer.

## Usage

Place all your CSV log files in this directory. The log analyzer will automatically:

1. **Discover all CSV files** in this directory
2. **Process each file sequentially** for 503 Service Unavailable errors
3. **Aggregate results** across all files for comprehensive analysis

## File Format

CSV files should contain the following columns:
- `Date` - Timestamp of the log entry
- `Service` - Service identifier
- `Message` - Log message content containing error details

## Example

```
data-input/
├── input-logs/
│   ├── extract-2025-06-19T05_50_23.398Z.csv
│   ├── extract-2025-06-20T10_30_15.123Z.csv
│   └── another-log-file.csv
├── storeData.csv
└── README.md
```

## Features

- **Multiple File Support**: Process any number of CSV files
- **Automatic Discovery**: No need to specify individual file names
- **Progress Tracking**: See processing progress for each file
- **Aggregated Analysis**: Combined results across all files

## Notes

- Only files with `.csv` extension (case-insensitive) will be processed
- Files are processed in alphabetical order
- Empty directory will result in an error
- All files must follow the same CSV structure

## Migration

The system previously processed a single hardcoded CSV file. Now it processes all CSV files in this directory, making it more flexible for batch analysis and ongoing monitoring.
