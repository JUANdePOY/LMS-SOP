with open('C:/wamp64/www/SOP/server/config/database.js', 'r') as f:
    content = f.read()

old = "employment_status ENUM('Regular','Probationary','Contractual','Resigned/Terminated','Retired','On Leave') DEFAULT 'Regular',\n  `ALTER TABLE users ADD COLUMN IF NOT EXISTS date_hired"
new = "employment_status ENUM('Regular','Probationary','Contractual','Resigned/Terminated','Retired','On Leave') DEFAULT 'Regular',\n  `ALTER TABLE users ADD COLUMN IF NOT EXISTS date_hired"

if old in content:
    print("Already correct")
else:
    # Find the problematic line and fix it
    lines = content.split('\n')
    for i, line in enumerate(lines):
        if 'employment_status ENUM' in line and not line.rstrip().endswith('`,'):
            lines[i] = line.rstrip() + '`'
            print(f'Fixed line {i+1}: added missing closing backtick')
            break
    content = '\n'.join(lines)
    with open('C:/wamp64/www/SOP/server/config/database.js', 'w') as f:
        f.write(content)
    print('Database.js fixed successfully')