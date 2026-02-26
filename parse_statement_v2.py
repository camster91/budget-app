import re
from datetime import datetime
from typing import List, Dict, Any
import json
import csv

def parse_tangerine_statement_v2(text: str) -> List[Dict[str, Any]]:
    """Improved parser for Tangerine bank statement text."""
    transactions = []
    
    # Clean up the text
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
        
        # End of page
        if "Page " in line and "of" in line:
            in_transaction_section = False
            continue
        
        # End of statement
        if "Closing Balance" in line or "Up to $100" in line:
            in_transaction_section = False
            continue
        
        if in_transaction_section and line:
            # Check if line starts with a balance (format: number number)
            # Pattern: optional minus, digits, decimal, digits, space, optional minus, digits, decimal, digits
            balance_pattern = r'^(-?\d[\d,]*\.\d{2})\s+(-?\d[\d,]*\.\d{2})'
            
            match = re.match(balance_pattern, line)
            if match:
                # If we have accumulated a previous line, process it
                if current_line:
                    process_transaction_line(current_line, transactions)
                    current_line = ""
                
                current_line = line
            elif current_line:
                # Continuation line - append to current line
                current_line += " " + line
    
    # Process the last line
    if current_line:
        process_transaction_line(current_line, transactions)
    
    return transactions

def process_transaction_line(line: str, transactions: List[Dict[str, Any]]):
    """Process a single transaction line."""
    # Pattern: balance amount description date
    # The date is usually at the end: DD MMM YYYY
    balance_pattern = r'^(-?\d[\d,]*\.\d{2})\s+(-?\d[\d,]*\.\d{2})\s+(.+)$'
    
    match = re.match(balance_pattern, line)
    if not match:
        return
    
    balance = match.group(1).replace(',', '')
    amount = match.group(2).replace(',', '')
    rest = match.group(3)
    
    # Try to extract date from the end
    # Date pattern: DD MMM YYYY
    date_pattern = r'(\d{1,2}\s+\w{3}\s+\d{4})$'
    date_match = re.search(date_pattern, rest)
    
    if date_match:
        date_str = date_match.group(1)
        description = rest[:date_match.start()].strip()
        
        # Parse date
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
        # No date found
        description = rest
        date_formatted = None
    
    transaction = {
        'balance': float(balance),
        'amount': float(amount),
        'description': description,
        'date': date_formatted,
        'raw_line': line
    }
    
    transactions.append(transaction)

def categorize_transaction(description: str) -> Dict[str, Any]:
    """Categorize transaction based on description."""
    description_lower = description.lower()
    
    categories = {
        'food_dining': ['tim hortons', 'subway', 'pizza hut', 'five guys', 'domino', 'burgerking', 
                       'mcdonalds', 'starbucks', 'second cup', 'philthy philly', 'krispy kreme', 
                       'food', 'restaurant', 'coffee', 'cafe', 'eat'],
        'groceries': ['metro', 'walmart', 'costco', 'instacart', 'canadian tire', 'dollarama',
                     'grocery', 'supermarket', 'food basics', 'loblaws', 'sobeys'],
        'shopping': ['amazon', 'amzn', 'target', 'ulta', 'shein', 'etsy', 'baby in sight', 
                    'party city', 'shopping', 'retail', 'store', 'market', 'purchase'],
        'entertainment': ['youtube', 'netflix', 'apple.com/bill', 'google', 'play pass', 
                         'minecraft', 'mattel', 'spotify', 'streaming', 'game', 'movie'],
        'transportation': ['uber', 'unit park management', 'transit', 'bus', 'train', 'taxi',
                          'gas', 'parking', 'transport'],
        'bills_utilities': ['recurring', 'bill payment', 'internet', 'phone', 'utility', 
                           'hydro', 'water', 'electric', 'gas bill'],
        'health_wellness': ['lifetime fitness', 'halsey compounding', 'nail decor beauty',
                           'pharmacy', 'drug store', 'medical', 'dental', 'health'],
        'personal_care': ['flex barbershop', 'ulta', 'hair', 'salon', 'beauty', 'spa', 'nails'],
        'travel': ['expedia', 'uber', 'hotel', 'flight', 'airline', 'travel', 'vacation'],
        'income': ['deposit from', 'transfer from', 'eft deposit', 'interac e-transfer from',
                  'salary', 'payroll', 'income', 'deposit'],
        'transfer': ['transfer to', 'transfer from', 'withdrawal to', 'deposit from',
                    'internet deposit from', 'internet withdrawal to', 'bill -', 'account -'],
        'loan_payment': ['line of credit', 'repayment', 'loan', 'credit card payment', 'mbna'],
        'subscriptions': ['youtubepremium', 'kindle unltd', 'subscription', 'monthly', 'annual']
    }
    
    for category, keywords in categories.items():
        for keyword in keywords:
            if keyword.lower() in description_lower:
                return {
                    'category': category,
                    'type': 'income' if category == 'income' else 'expense'
                }
    
    # Check for specific patterns
    if 'visa debit' in description_lower or 'interac' in description_lower:
        return {'category': 'shopping', 'type': 'expense'}
    
    if 'deposit' in description_lower and 'from' in description_lower:
        return {'category': 'income', 'type': 'income'}
    
    if 'withdrawal' in description_lower and 'to' in description_lower:
        return {'category': 'transfer', 'type': 'expense'}
    
    # Default category
    return {'category': 'uncategorized', 'type': 'expense'}

def analyze_spending(transactions: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Analyze spending patterns from transactions."""
    analysis = {
        'total_transactions': len(transactions),
        'total_income': 0,
        'total_expenses': 0,
        'categories': {},
        'monthly_summary': {},
        'top_spending_categories': []
    }
    
    for tx in transactions:
        # Skip zero amount transactions
        if tx['amount'] == 0:
            continue
            
        amount = tx['amount']
        description = tx['description'].lower()
        
        # Categorize
        cat_info = categorize_transaction(tx['description'])
        category = cat_info['category']
        tx_type = cat_info['type']
        
        # Special handling: transfers between accounts shouldn't count as income/expense
        is_transfer = ('transfer' in category or 
                      any(keyword in description for keyword in 
                         ['internet deposit from', 'internet withdrawal to', 'account -', 'bill -']))
        
        if not is_transfer:
            if tx_type == 'income':
                analysis['total_income'] += amount
            else:
                analysis['total_expenses'] += amount
            
            # Track by category
            if category not in analysis['categories']:
                analysis['categories'][category] = 0
            analysis['categories'][category] += amount
        
        # Monthly analysis
        if tx['date']:
            try:
                date_obj = datetime.strptime(tx['date'], '%Y-%m-%d')
                month_key = date_obj.strftime('%Y-%m')
                if month_key not in analysis['monthly_summary']:
                    analysis['monthly_summary'][month_key] = {'income': 0, 'expenses': 0}
                
                if not is_transfer:
                    if tx_type == 'income':
                        analysis['monthly_summary'][month_key]['income'] += amount
                    else:
                        analysis['monthly_summary'][month_key]['expenses'] += amount
            except:
                pass
    
    # Calculate top spending categories (excluding income and transfers)
    expense_categories = [(cat, amount) for cat, amount in analysis['categories'].items() 
                         if cat not in ['income', 'transfer']]
    analysis['top_spending_categories'] = sorted(
        expense_categories,
        key=lambda x: x[1],
        reverse=True
    )[:5]
    
    analysis['net_cash_flow'] = analysis['total_income'] - analysis['total_expenses']
    
    return analysis

def generate_budget_recommendations(analysis: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Generate budget recommendations based on spending analysis."""
    recommendations = []
    
    # Common budget percentages (simplified)
    budget_template = {
        'housing': 30,
        'food_dining': 15,
        'groceries': 10,
        'transportation': 10,
        'entertainment': 5,
        'shopping': 5,
        'health_wellness': 5,
        'personal_care': 3,
        'subscriptions': 2,
        'loan_payment': 10,
        'savings': 20,
        'other': 5
    }
    
    total_monthly_income = analysis['total_income']
    total_monthly_expenses = analysis['total_expenses']
    
    if total_monthly_income > 0:
        for category, percentage in budget_template.items():
            if category == 'savings':
                recommended = total_monthly_income * percentage / 100
            else:
                recommended = total_monthly_income * percentage / 100
            
            actual = analysis['categories'].get(category, 0)
            
            recommendations.append({
                'category': category,
                'recommended_monthly': round(recommended, 2),
                'actual_monthly': round(actual, 2),
                'difference': round(actual - recommended, 2),
                'status': 'under' if actual <= recommended else 'over'
            })
    
    return recommendations

def export_for_budget_app(transactions: List[Dict[str, Any]], filename: str = 'transactions_import.csv'):
    """Export transactions in format suitable for budget app import."""
    with open(filename, 'w', newline='', encoding='utf-8') as csvfile:
        fieldnames = ['date', 'description', 'amount', 'type', 'category']
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        writer.writeheader()
        
        for tx in transactions:
            if tx['amount'] == 0:
                continue
                
            cat_info = categorize_transaction(tx['description'])
            description_lower = tx['description'].lower()
            
            # Determine if it's a transfer between accounts
            is_transfer = any(keyword in description_lower for keyword in
                            ['internet deposit from', 'internet withdrawal to', 'account -', 'bill -'])
            
            if not is_transfer:
                # Determine type based on categorization
                tx_type = cat_info['type']
                
                # Override based on amount sign (positive usually income, negative expense)
                # But in bank statements, all amounts are positive, need to check description
                if 'deposit' in description_lower and 'from' in description_lower:
                    tx_type = 'income'
                elif 'withdrawal' in description_lower and 'to' in description_lower:
                    tx_type = 'expense'
                
                writer.writerow({
                    'date': tx['date'] or '',
                    'description': tx['description'],
                    'amount': abs(tx['amount']),
                    'type': tx_type,
                    'category': cat_info['category']
                })
    
    print(f"Exported {sum(1 for tx in transactions if tx['amount'] != 0)} transactions to {filename}")

if __name__ == "__main__":
    # Read extracted statement
    with open('extracted_statement.txt', 'r', encoding='utf-8') as f:
        statement_text = f.read()
    
    print("Parsing Tangerine statement with improved parser...")
    transactions = parse_tangerine_statement_v2(statement_text)
    
    print(f"Found {len(transactions)} transactions")
    
    # Filter out zero-amount transactions
    valid_transactions = [tx for tx in transactions if tx['amount'] != 0]
    print(f"Valid (non-zero) transactions: {len(valid_transactions)}")
    
    print("\nSample transactions (first 15):")
    for i, tx in enumerate(valid_transactions[:15]):
        cat_info = categorize_transaction(tx['description'])
        print(f"{i+1:3d}. ${tx['amount']:8.2f} - {tx['date']} - {cat_info['category']:15} - {tx['description'][:60]}...")
    
    print("\nAnalyzing spending patterns...")
    analysis = analyze_spending(valid_transactions)
    
    print(f"\nSummary for period:")
    print(f"Total Income: ${analysis['total_income']:.2f}")
    print(f"Total Expenses: ${analysis['total_expenses']:.2f}")
    print(f"Net Cash Flow: ${analysis['net_cash_flow']:.2f}")
    
    print(f"\nTransaction count by category:")
    # Count transactions per category
    category_counts = {}
    for tx in valid_transactions:
        cat_info = categorize_transaction(tx['description'])
        category = cat_info['category']
        if category not in category_counts:
            category_counts[category] = 0
        category_counts[category] += 1
    
    for category, count in sorted(category_counts.items(), key=lambda x: x[1], reverse=True):
        print(f"  {category}: {count} transactions")
    
    print(f"\nSpending by category (amounts):")
    for category, amount in sorted(analysis['categories'].items(), key=lambda x: x[1], reverse=True):
        print(f"  {category}: ${amount:.2f}")
    
    if analysis['top_spending_categories']:
        print(f"\nTop spending categories:")
        for i, (category, amount) in enumerate(analysis['top_spending_categories']):
            print(f"  {i+1}. {category}: ${amount:.2f}")
    
    print("\nGenerating budget recommendations...")
    recommendations = generate_budget_recommendations(analysis)
    
    if recommendations:
        print("\nBudget Recommendations:")
        for rec in recommendations:
            status_icon = "✓" if rec['status'] == 'under' else "⚠"
            print(f"{status_icon} {rec['category']:20} ${rec['actual_monthly']:8.2f} actual vs ${rec['recommended_monthly']:8.2f} recommended")
    
    # Save parsed data
    with open('parsed_transactions_v2.json', 'w', encoding='utf-8') as f:
        json.dump({
            'transactions': transactions,
            'analysis': analysis,
            'recommendations': recommendations
        }, f, indent=2, default=str)
    
    print(f"\nData saved to 'parsed_transactions_v2.json'")
    
    # Export for budget app import
    export_for_budget_app(valid_transactions, 'transactions_for_import_v2.csv')
    
    # Also create a summary report
    with open('spending_analysis_report.txt', 'w', encoding='utf-8') as f:
        f.write("=== BANK STATEMENT ANALYSIS REPORT ===\n\n")
        f.write(f"Period: January 2026\n")
        f.write(f"Total Transactions Analyzed: {len(valid_transactions)}\n\n")
        
        f.write("FINANCIAL SUMMARY\n")
        f.write(f"Total Income:        ${analysis['total_income']:.2f}\n")
        f.write(f"Total Expenses:      ${analysis['total_expenses']:.2f}\n")
        f.write(f"Net Cash Flow:       ${analysis['net_cash_flow']:.2f}\n\n")
        
        f.write("SPENDING BY CATEGORY\n")
        f.write("-" * 40 + "\n")
        for category, amount in sorted(analysis['categories'].items(), key=lambda x: x[1], reverse=True):
            percentage = (amount / analysis['total_expenses'] * 100) if analysis['total_expenses'] > 0 else 0
            f.write(f"{category:20} ${amount:10.2f} ({percentage:5.1f}%)\n")
        
        f.write("\nBUDGET RECOMMENDATIONS\n")
        f.write("-" * 40 + "\n")
        for rec in recommendations:
            status = "WITHIN BUDGET" if rec['status'] == 'under' else "OVER BUDGET"
            f.write(f"{rec['category']:20} ${rec['actual_monthly']:8.2f} vs ${rec['recommended_monthly']:8.2f} - {status}\n")
    
    print("Analysis report saved to 'spending_analysis_report.txt'")