import json
import csv
from datetime import datetime

# Load parsed transactions
with open('combined_transactions.json', 'r', encoding='utf-8') as f:
    transactions = json.load(f)

# Filter out zero-amount transactions and limit to 20 for testing
test_transactions = [t for t in transactions if t['amount'] != 0][:20]

# Create CSV in Tangerine-like format
csv_data = []
for tx in test_transactions:
    # Determine type based on description
    desc = tx['description'].lower()
    if 'deposit from' in desc or 'transfer from' in desc:
        tx_type = 'income'
    else:
        tx_type = 'expense'
    
    csv_data.append({
        'Date': tx['date'] or '',
        'Description': tx['description'],
        'Amount': abs(tx['amount']),
        'Type': tx_type,
        'Balance': tx.get('balance', ''),
    })

# Also create a simpler format for generic CSV
simple_data = []
for tx in test_transactions:
    desc = tx['description'].lower()
    if 'deposit from' in desc or 'transfer from' in desc:
        tx_type = 'income'
    else:
        tx_type = 'expense'
    
    simple_data.append({
        'date': tx['date'] or '',
        'description': tx['description'],
        'amount': abs(tx['amount']),
        'type': tx_type,
    })

# Save Tangerine-like CSV
with open('tangerine_sample.csv', 'w', newline='', encoding='utf-8') as f:
    fieldnames = ['Date', 'Description', 'Amount', 'Type', 'Balance']
    writer = csv.DictWriter(f, fieldnames=fieldnames)
    writer.writeheader()
    writer.writerows(csv_data)

# Save simple CSV
with open('simple_sample.csv', 'w', newline='', encoding='utf-8') as f:
    fieldnames = ['date', 'description', 'amount', 'type']
    writer = csv.DictWriter(f, fieldnames=fieldnames)
    writer.writeheader()
    writer.writerows(simple_data)

print(f"Created tangerine_sample.csv with {len(csv_data)} transactions")
print(f"Created simple_sample.csv with {len(simple_data)} transactions")

# Also create a CSV with transfers to test filtering
transfer_data = []
for tx in test_transactions[:5]:
    transfer_data.append({
        'date': tx['date'] or '',
        'description': f"Internet Deposit from Tangerine Chequing Account - Bills - 4010656988",
        'amount': abs(tx['amount']),
        'type': 'income',
    })

with open('with_transfers.csv', 'w', newline='', encoding='utf-8') as f:
    fieldnames = ['date', 'description', 'amount', 'type']
    writer = csv.DictWriter(f, fieldnames=fieldnames)
    writer.writeheader()
    writer.writerows(transfer_data)

print(f"Created with_transfers.csv with {len(transfer_data)} transfer transactions")