import os
import sys
import pypdf
from datetime import datetime
import json
from typing import List, Dict, Any
import re

def extract_text_from_pdf(pdf_path: str) -> str:
    """Extract text from a PDF file."""
    try:
        reader = pypdf.PdfReader(pdf_path)
        text = ""
        
        print(f"Processing: {os.path.basename(pdf_path)}")
        print(f"  Pages: {len(reader.pages)}")
        print(f"  Metadata: {reader.metadata.get('/Title', 'Unknown')}")
        
        for i, page in enumerate(reader.pages):
            page_text = page.extract_text()
            if page_text.strip():
                text += f"\n=== Page {i+1} ===\n"
                text += page_text + "\n"
        
        return text.strip()
    except Exception as e:
        print(f"  Error: {e}")
        return ""

def parse_transactions_from_text(text: str) -> List[Dict[str, Any]]:
    """Parse transactions from statement text."""
    transactions = []
    lines = text.split('\n')
    
    # Find transaction sections
    in_transaction_section = False
    current_line = ""
    
    for line in lines:
        line = line.strip()
        
        # Look for transaction header
        if "Balance($) Amount($) Transaction Description Transaction Date" in line:
            in_transaction_section = True
            continue
        
        # End markers
        if "Page " in line and "of" in line:
            in_transaction_section = False
            continue
        
        if "Closing Balance" in line or "Up to $100" in line:
            in_transaction_section = False
            continue
        
        if in_transaction_section and line:
            # Check if line starts with balance pattern
            balance_pattern = r'^(-?\d[\d,]*\.\d{2})\s+(-?\d[\d,]*\.\d{2})'
            
            match = re.match(balance_pattern, line)
            if match:
                # Process previous line if exists
                if current_line:
                    tx = parse_transaction_line(current_line)
                    if tx:
                        transactions.append(tx)
                    current_line = ""
                
                current_line = line
            elif current_line:
                # Continuation line
                current_line += " " + line
    
    # Process last line
    if current_line:
        tx = parse_transaction_line(current_line)
        if tx:
            transactions.append(tx)
    
    return transactions

def parse_transaction_line(line: str) -> Dict[str, Any]:
    """Parse a single transaction line."""
    # Pattern: balance amount description date
    balance_pattern = r'^(-?\d[\d,]*\.\d{2})\s+(-?\d[\d,]*\.\d{2})\s+(.+)$'
    
    match = re.match(balance_pattern, line)
    if not match:
        return None
    
    balance = match.group(1).replace(',', '')
    amount = match.group(2).replace(',', '')
    rest = match.group(3)
    
    # Extract date from end (DD MMM YYYY)
    date_pattern = r'(\d{1,2}\s+\w{3}\s+\d{4})$'
    date_match = re.search(date_pattern, rest)
    
    if date_match:
        date_str = date_match.group(1)
        description = rest[:date_match.start()].strip()
        
        try:
            date_obj = datetime.strptime(date_str, '%d %b %Y')
            date_formatted = date_obj.strftime('%Y-%m-%d')
        except:
            try:
                date_obj = datetime.strptime(date_str, '%d %b. %Y')
                date_formatted = date_obj.strftime('%Y-%m-%d')
            except:
                date_formatted = date_str
    else:
        description = rest
        date_formatted = None
    
    try:
        return {
            'balance': float(balance),
            'amount': float(amount),
            'description': description,
            'date': date_formatted,
            'raw_line': line[:100] + "..." if len(line) > 100 else line
        }
    except:
        return None

def categorize_transaction(description: str) -> Dict[str, str]:
    """Categorize transaction based on description."""
    desc_lower = description.lower()
    
    categories = {
        'food_dining': ['tim hortons', 'subway', 'pizza', 'burger', 'mcdonalds', 'starbucks', 
                       'restaurant', 'cafe', 'coffee', 'food', 'eat', 'dining'],
        'groceries': ['metro', 'walmart', 'costco', 'instacart', 'grocery', 'supermarket'],
        'shopping': ['amazon', 'amzn', 'target', 'ulta', 'shein', 'etsy', 'shopping', 'store'],
        'entertainment': ['youtube', 'netflix', 'apple.com/bill', 'google', 'play', 'game'],
        'transportation': ['uber', 'parking', 'transit', 'gas', 'transport'],
        'bills': ['bill payment', 'recurring', 'utility', 'phone', 'internet'],
        'health': ['pharmacy', 'medical', 'dental', 'health', 'fitness'],
        'personal_care': ['hair', 'salon', 'beauty', 'nails', 'barber'],
        'income': ['deposit from', 'transfer from', 'eft deposit', 'salary', 'income'],
        'transfer': ['transfer to', 'transfer from', 'withdrawal to', 'deposit from'],
        'subscriptions': ['subscription', 'premium', 'monthly', 'annual']
    }
    
    for category, keywords in categories.items():
        for keyword in keywords:
            if keyword in desc_lower:
                return {
                    'category': category,
                    'type': 'income' if category == 'income' else 'expense'
                }
    
    return {'category': 'uncategorized', 'type': 'expense'}

def analyze_transactions(transactions: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Analyze transactions."""
    analysis = {
        'total_count': len(transactions),
        'total_income': 0,
        'total_expenses': 0,
        'by_category': {},
        'by_month': {},
        'largest_transactions': []
    }
    
    # Filter out zero amounts
    valid_tx = [tx for tx in transactions if tx['amount'] != 0]
    
    for tx in valid_tx:
        amount = tx['amount']
        cat_info = categorize_transaction(tx['description'])
        category = cat_info['category']
        tx_type = cat_info['type']
        
        # Skip transfers between accounts
        is_transfer = any(keyword in tx['description'].lower() for keyword in 
                         ['internet deposit from', 'internet withdrawal to', 'account -', 'bill -'])
        
        if not is_transfer:
            if tx_type == 'income':
                analysis['total_income'] += amount
            else:
                analysis['total_expenses'] += amount
            
            # Track by category
            if category not in analysis['by_category']:
                analysis['by_category'][category] = 0
            analysis['by_category'][category] += amount
        
        # Track by month
        if tx['date']:
            try:
                month = tx['date'][:7]  # YYYY-MM
                if month not in analysis['by_month']:
                    analysis['by_month'][month] = {'income': 0, 'expenses': 0, 'count': 0}
                
                if not is_transfer:
                    if tx_type == 'income':
                        analysis['by_month'][month]['income'] += amount
                    else:
                        analysis['by_month'][month]['expenses'] += amount
                analysis['by_month'][month]['count'] += 1
            except:
                pass
    
    # Find largest transactions
    analysis['largest_transactions'] = sorted(
        valid_tx,
        key=lambda x: abs(x['amount']),
        reverse=True
    )[:10]
    
    analysis['net_flow'] = analysis['total_income'] - analysis['total_expenses']
    
    return analysis

def compare_statements(statements_data: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Compare multiple statements."""
    comparison = {
        'file_names': [],
        'transaction_counts': [],
        'total_income': [],
        'total_expenses': [],
        'unique_dates': set(),
        'all_transactions': []
    }
    
    for data in statements_data:
        comparison['file_names'].append(data['filename'])
        comparison['transaction_counts'].append(len(data['transactions']))
        comparison['total_income'].append(data['analysis']['total_income'])
        comparison['total_expenses'].append(data['analysis']['total_expenses'])
        
        # Collect unique dates
        for tx in data['transactions']:
            if tx['date']:
                comparison['unique_dates'].add(tx['date'])
        
        # Add all transactions
        comparison['all_transactions'].extend(data['transactions'])
    
    # Remove duplicate transactions (by date, amount, and description)
    unique_transactions = []
    seen = set()
    
    for tx in comparison['all_transactions']:
        key = (tx.get('date'), tx.get('amount'), tx.get('description', '')[:50])
        if key not in seen:
            seen.add(key)
            unique_transactions.append(tx)
    
    comparison['unique_transactions'] = unique_transactions
    comparison['unique_count'] = len(unique_transactions)
    
    return comparison

def main():
    """Main function to process all statement PDFs."""
    # Check if file paths were provided as arguments
    if len(sys.argv) > 1:
        pdf_paths = sys.argv[1:]
    else:
        # Default paths from user message
        pdf_paths = [
            r"C:\Users\camst\Downloads\Tangerine-Chequing_Jan26.pdf",
            r"C:\Users\camst\Downloads\Tangerine-eStatement_Jan26.pdf", 
            r"C:\Users\camst\Downloads\Tangerine-Chequing_Jan26 (1).pdf"
        ]
    
    print(f"Processing {len(pdf_paths)} PDF file(s)...")
    print("=" * 60)
    
    statements_data = []
    
    for pdf_path in pdf_paths:
        if not os.path.exists(pdf_path):
            print(f"File not found: {pdf_path}")
            continue
        
        # Extract text
        text = extract_text_from_pdf(pdf_path)
        if not text:
            print(f"  No text extracted from {pdf_path}")
            continue
        
        # Parse transactions
        transactions = parse_transactions_from_text(text)
        print(f"  Found {len(transactions)} transactions")
        
        # Analyze
        analysis = analyze_transactions(transactions)
        
        # Save extracted text
        filename_base = os.path.basename(pdf_path).replace('.pdf', '')
        with open(f"{filename_base}_extracted.txt", 'w', encoding='utf-8') as f:
            f.write(text)
        
        # Save transactions as JSON
        with open(f"{filename_base}_transactions.json", 'w', encoding='utf-8') as f:
            json.dump({
                'metadata': {'source_file': pdf_path, 'extracted_at': datetime.now().isoformat()},
                'transactions': transactions,
                'analysis': analysis
            }, f, indent=2, default=str)
        
        statements_data.append({
            'filename': os.path.basename(pdf_path),
            'transactions': transactions,
            'analysis': analysis
        })
        
        print(f"  Saved: {filename_base}_extracted.txt and {filename_base}_transactions.json")
        print()
    
    if len(statements_data) > 1:
        print("=" * 60)
        print("COMPARING ALL STATEMENTS")
        print("=" * 60)
        
        comparison = compare_statements(statements_data)
        
        print("\nStatement Comparison:")
        for i, filename in enumerate(comparison['file_names']):
            print(f"\n{filename}:")
            print(f"  Transactions: {comparison['transaction_counts'][i]}")
            print(f"  Total Income: ${comparison['total_income'][i]:.2f}")
            print(f"  Total Expenses: ${comparison['total_expenses'][i]:.2f}")
        
        print(f"\nUnique dates across all statements: {len(comparison['unique_dates'])}")
        print(f"Total unique transactions: {comparison['unique_count']}")
        
        # Save combined transactions
        if comparison['unique_transactions']:
            # Sort by date
            sorted_transactions = sorted(
                [tx for tx in comparison['unique_transactions'] if tx.get('date')],
                key=lambda x: x['date']
            )
            
            with open('combined_transactions.json', 'w', encoding='utf-8') as f:
                json.dump(sorted_transactions, f, indent=2, default=str)
            
            print(f"\nSaved combined transactions to: combined_transactions.json")
            
            # Create summary report
            total_income = sum(tx['amount'] for tx in sorted_transactions 
                             if 'deposit' in tx.get('description', '').lower() and 'from' in tx.get('description', '').lower())
            total_expenses = sum(tx['amount'] for tx in sorted_transactions 
                               if not ('deposit' in tx.get('description', '').lower() and 'from' in tx.get('description', '').lower()))
            
            with open('financial_summary.txt', 'w', encoding='utf-8') as f:
                f.write("FINANCIAL STATEMENT SUMMARY\n")
                f.write("=" * 40 + "\n\n")
                f.write(f"Period covered: Various dates\n")
                f.write(f"Total unique transactions: {len(sorted_transactions)}\n")
                f.write(f"Estimated total income: ${total_income:.2f}\n")
                f.write(f"Estimated total expenses: ${total_expenses:.2f}\n")
                f.write(f"Estimated net flow: ${total_income - total_expenses:.2f}\n\n")
                
                f.write("TRANSACTION CATEGORIES:\n")
                categories = {}
                for tx in sorted_transactions:
                    cat_info = categorize_transaction(tx['description'])
                    category = cat_info['category']
                    if category not in categories:
                        categories[category] = 0
                    categories[category] += tx['amount']
                
                for category, amount in sorted(categories.items(), key=lambda x: x[1], reverse=True):
                    f.write(f"  {category:20} ${amount:10.2f}\n")
    
    print("\n" + "=" * 60)
    print("Processing complete!")
    
    if statements_data:
        print("\nNEXT STEPS FOR BUDGET APP:")
        print("1. Review the extracted transaction files")
        print("2. Use 'combined_transactions.json' to import into budget app")
        print("3. Check 'financial_summary.txt' for spending analysis")
        print("\nThe budget app currently supports:")
        print("  - Manual transaction entry")
        print("  - Categorization")
        print("  - Budget setting")
        print("  - Dashboard with charts")
        print("\nMissing features for full Mint/QuickBooks-like functionality:")
        print("  - CSV/PDF import (you'll need to manually enter or build import)")
        print("  - Automated categorization")
        print("  - Recurring transaction detection")
        print("  - Bill tracking")

if __name__ == "__main__":
    main()