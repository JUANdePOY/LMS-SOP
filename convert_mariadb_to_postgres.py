from pathlib import Path
import re

schema_path = Path(r'c:\wamp64\www\PAFR2.0\PAFR\pafr_database_schema.sql')
backup_path = schema_path.with_suffix('.sql.bak')
text = schema_path.read_text(encoding='utf-8')

# Backup original
backup_path.write_text(text, encoding='utf-8')

# Remove MySQL-specific versioned comments and directives
text = re.sub(r'/\*!\d+.*?\*/;?', '', text, flags=re.S)

# Remove views section entirely from first view marker onward
match = re.search(r'--\s*Temporary table structure for view[\s\S]*$', text)
if match:
    text = text[:match.start()]

# Remove any remaining SET statements that are not needed
text = re.sub(r'(?m)^\s*SET\s+[^;]+;\s*$', '', text)

# Identifier normalization
text = text.replace('`', '')
text = text.replace('_utf8mb4\'', "'")

# Auto-increment / identity
text = re.sub(r'bigint\(20\)\s+NOT\s+NULL\s+AUTO_INCREMENT', 'bigint GENERATED ALWAYS AS IDENTITY', text, flags=re.I)
text = re.sub(r'int\(11\)\s+NOT\s+NULL\s+AUTO_INCREMENT', 'integer GENERATED ALWAYS AS IDENTITY', text, flags=re.I)
text = re.sub(r'\bAUTO_INCREMENT\b', '', text, flags=re.I)

# Type conversions
text = re.sub(r'\btinyint\(1\)\b', 'boolean', text, flags=re.I)
text = re.sub(r'\bdatetime\b', 'timestamp', text, flags=re.I)
text = re.sub(r'current_timestamp\(\)', 'CURRENT_TIMESTAMP', text, flags=re.I)
text = re.sub(r'curdate\(\)', 'CURRENT_DATE', text, flags=re.I)
text = re.sub(r'enum\([^)]*\)', 'varchar(100)', text, flags=re.I)

# JSON/text conversions
text = re.sub(
    r'longtext\s+CHARACTER SET\s+\S+\s+COLLATE\s+\S+\s+DEFAULT NULL\s+CHECK\s*\(json_valid\([^)]*\)\)',
    'jsonb DEFAULT NULL',
    text,
    flags=re.I,
)
text = re.sub(r'longtext\s+CHARACTER SET\s+\S+\s+COLLATE\s+\S+', 'text', text, flags=re.I)
text = re.sub(r'\blongtext\b', 'text', text, flags=re.I)

# Remove MySQL-specific table options
text = re.sub(r'\)\s*ENGINE=[^;]+;', ');', text, flags=re.I)
text = re.sub(r'DEFAULT CHARSET=\S+', '', text, flags=re.I)
text = re.sub(r'COLLATE=\S+', '', text, flags=re.I)
text = re.sub(r'\bCHARACTER SET\s+\S+', '', text, flags=re.I)

# Remove KEY index lines (will keep UNIQUE constraints)
text = re.sub(r'(?m)^\s*KEY\s+[^\n]+\n', '', text)
text = re.sub(r'(?m)^\s*KEY\s+[^\n]+$', '', text)

# Convert UNIQUE KEY to PostgreSQL UNIQUE constraints or remove as needed
text = re.sub(r'(?m)^\s*UNIQUE\s+KEY\s+[^\(]+\(([^)]+)\)\s*,?$', r'  UNIQUE (\1)', text)

# Remove duplicate commas before closing parens
text = re.sub(r',\s*\)', ')', text)

# Strip extra whitespace lines
text = re.sub(r'\n{3,}', '\n\n', text)
text = text.strip() + '\n'

schema_path.write_text(text, encoding='utf-8')
print(f'Converted SQL file written to {schema_path}')
print(f'Backup of original written to {backup_path}')
