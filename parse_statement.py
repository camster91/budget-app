import re
from datetime import datetime
from typing import List, Dict, Any

def parse_tangerine_statement(text: str) -> List[Dict[str, Any]]:
    """Parse Tangerine bank statement text into structured transactions."""
    transactions = []
    
    # Split by pages
    pages = text.split("=== Page")
    
    for page in pages[1:]:  # Skip first empty split
        # Extract transaction lines
        lines = page.strip().split('\n')
        
        # Look for transaction sections
        in_transaction_section = False
        current_transaction = {}
        balance_accumulator = None
        
        for line in lines:
            line = line.strip()
            
            # Check if we're entering transaction section
            if "Balance($) Amount($) Transaction Description Transaction Date" in line:
                in_transaction_section = True
                continue
                
            if "Page " in line and "of" in line:
                in_transaction_section = False
                continue
                
            if in_transaction_section and line:
                # Try to parse transaction line
                # Pattern: balance amount description date
                # But transactions can span multiple lines
                
                # Check if line starts with a balance (number with decimal)
                if re.match(r'^-?\d+\.\d+\s+-?\d+\.\d+', line):
                    # Complete previous transaction if exists
                    if current_transaction:
                        transactions.append(current_transaction)
                        current_transaction = {}
                    
                    parts = line.split(None, 3)
                    if len(parts) >= 4:
                        balance = parts[0]
                        amount = parts[1]
                        description_date = parts[3]
                        
                        # Try to split description and date
                        # Date is usually at the end: "DD MMM YYYY"
                        date_match = re.search(r'(\d{1,2}\s+\w{3}\s+\d{4})$', description_date)
                        if date_match:
                            date_str = date_match.group(1)
                            description = description_date[:date_match.start()].strip()
                            
                            # Parse date
                            try:
                                date_obj = datetime.strptime(date_str, '%d %b %Y')
                            except:
                                # Try different format
                                try:
                                    date_obj = datetime.strptime(date_str, '%d %b. %Y')
                                except:
                                    date_obj = None
                            
                            current_transaction = {
                                'balance': float(balance.replace(',', '')),
                                'amount': float(amount.replace(',', '')),
                                'description': description,
                                'date': date_obj.strftime('%Y-%m-%d') if date_obj else date_str,
                                'raw_line': line
                            }
                            balance_accumulator = float(balance.replace(',', ''))
                
                # If we have a current transaction and line doesn't start with number,
                # it's probably continuation of description
                elif current_transaction and not re.match(r'^-?\d+\.\d+', line):
                    current_transaction['description'] += ' ' + line
    
    # Add last transaction
    if current_transaction:
        transactions.append(current_transaction)
    
    return transactions

def categorize_transaction(description: str) -> Dict[str, Any]:
    """Categorize transaction based on description."""
    description_lower = description.lower()
    
    categories = {
        'food_dining': ['tim hortons', 'subway', 'pizza hut', 'five guys', 'domino', 'burgerking', 'mcdonalds', 'starbucks', 'second cup', 'philthy philly', 'krispy kreme'],
        'groceries': ['metro', 'walmart', 'costco', 'instacart', 'canadian tire', 'dollarama'],
        'shopping': ['amazon', 'amzn', 'target', 'ulta', 'shein', 'etsy', 'baby in sight', 'party city', 'dollarama', 'canadian tire'],
        'entertainment': ['youtube', 'netflix', 'apple.com/bill', 'google', 'play pass', 'minecraft', 'mattel'],
        'transportation': ['uber', 'unit park management'],
        'bills_utilities': ['recurring', 'bill payment', 'internet deposit', 'internet withdrawal'],
        'health_wellness': ['lifetime fitness', 'halsey compounding', 'nail decor beauty'],
        'personal_care': ['flex barbershop', 'ulta'],
        'travel': ['expedia', 'uber'],
        'income': ['deposit from', 'transfer from', 'eft deposit'],
        'transfer': ['transfer to', 'transfer from', 'withdrawal to', 'deposit from'],
        'loan_payment': ['line of credit', 'repayment']
    }
    
    for category, keywords in categories.items():
        for keyword in keywords:
            if keyword.lower() in description_lower:
                return {
                    'category': category,
                    'type': 'income' if category == 'income' else 'expense'
                }
    
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
        # Determine if income or expense
        # In bank statements, deposits are positive, withdrawals negative
        # But we need to check description
        amount = tx['amount']
        description = tx['description'].lower()
        
        # Check if it's income (deposits, transfers in)
        is_income = any(keyword in description for keyword in 
                       ['deposit from', 'transfer from', 'eft deposit', 'interac e-transfer from'])
        
        # Check if it's transfer between accounts (not real income/expense)
        is_transfer = any(keyword in description for keyword in
                         ['internet deposit from', 'internet withdrawal to', 'transfer to', 'transfer from'])
        
        if not is_transfer:
            if is_income:
                analysis['total_income'] += amount
                category = 'income'
            else:
                analysis['total_expenses'] += amount
                # Categorize expense
                cat_info = categorize_transaction(tx['description'])
                category = cat_info['category']
                
                # Track by category
                if category not in analysis['categories']:
                    analysis['categories'][category] = 0
                analysis['categories'][category] += amount
        
        # Monthly analysis
        try:
            date_obj = datetime.strptime(tx['date'], '%Y-%m-%d')
            month_key = date_obj.strftime('%Y-%m')
            if month_key not in analysis['monthly_summary']:
                analysis['monthly_summary'][month_key] = {'income': 0, 'expenses': 0}
            
            if is_income and not is_transfer:
                analysis['monthly_summary'][month_key]['income'] += amount
            elif not is_income and not is_transfer:
                analysis['monthly_summary'][month_key]['expenses'] += amount
        except:
            pass
    
    # Calculate top spending categories
    analysis['top_spending_categories'] = sorted(
        [(cat, amount) for cat, amount in analysis['categories'].items() if cat != 'income'],
        key=lambda x: x[1],
        reverse=True
    )[:5]
    
    analysis['net_cash_flow'] = analysis['total_income'] - analysis['total_expenses']
    
    return analysis

def generate_budget_recommendations(analysis: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Generate budget recommendations based on spending analysis."""
    recommendations = []
    
    # Common budget percentages (50/30/20 rule)
    budget_template = {
        'housing': 30,  # Rent/mortgage
        'food_dining': 15,
        'transportation': 10,
        'entertainment': 5,
        'shopping': 5,
        'health_wellness': 5,
        'personal_care': 3,
        'savings': 20,
        'other': 7
    }
    
    total_monthly_expenses = analysis['total_expenses']
    
    for category, percentage in budget_template.items():
        if category == 'savings':
            # Savings is based on income, not expenses
            recommended = (analysis['total_income'] * percentage / 100) if analysis['total_income'] > 0 else 0
        else:
            recommended = total_monthly_expenses * percentage / 100 if total_monthly_expenses > 0 else 0
        
        actual = analysis['categories'].get(category, 0)
        
        recommendations.append({
            'category': category,
            'recommended_monthly': round(recommended, 2),
            'actual_monthly': round(actual, 2),
            'difference': round(actual - recommended, 2),
            'status': 'under' if actual <= recommended else 'over'
        })
    
    return recommendations

if __name__ == "__main__":
    # Read extracted statement
    with open('extracted_statement.txt', 'r', encoding='utf-8') as f:
        statement_text = f.read()
    
    print("Parsing Tangerine statement...")
    transactions = parse_tangerine_statement(statement_text)
    
    print(f"Found {len(transactions)} transactions")
    print("\nSample transactions:")
    for i, tx in enumerate(transactions[:10]):
        print(f"{i+1}. ${tx['amount']:.2f} - {tx['description'][:50]}... - {tx['date']}")
    
    print("\nAnalyzing spending patterns...")
    analysis = analyze_spending(transactions)
    
    print(f"\nSummary for period:")
    print(f"Total Income: ${analysis['total_income']:.2f}")
    print(f"Total Expenses: ${analysis['total_expenses']:.2f}")
    print(f"Net Cash Flow: ${analysis['net_cash_flow']:.2f}")
    
    print("\nSpending by category:")
    for category, amount in sorted(analysis['categories'].items(), key=lambda x: x[1], reverse=True):
        print(f"  {category}: ${amount:.2f}")
    
    print("\nTop spending categories:")
    for i, (category, amount) in enumerate(analysis['top_spending_categories']):
        print(f"  {i+1}. {category}: ${amount:.2f}")
    
    print("\nGenerating budget recommendations...")
    recommendations = generate_budget_recommendations(analysis)
    
    print("\nBudget Recommendations (50/30/20 rule):")
    for rec in recommendations:
        status_icon = "✅" if rec['status'] == 'under' else "⚠️"
        print(f"{status_icon} {rec['category']}: ${rec['actual_monthly']:.2f} actual vs ${rec['recommended_monthly']:.2f} recommended")
    
    # Save parsed data for potential import
    import json
    with open('parsed_transactions.json', 'w') as f:
        json.dump({
            'transactions': transactions,
            'analysis': analysis,
            'recommendations': recommendations
        }, f, indent=2, default=str)
    
    print("\nData saved to 'parsed_transactions.json'")
    
    # Also create CSV for easy import
    import csv
    with open('transactions_for_import.csv', 'w', newline='') as csvfile:
        fieldnames = ['date', 'description', 'amount', 'type', 'category']
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        writer.writeheader()
        
        for tx in transactions:
            cat_info = categorize_transaction(tx['description'])
            # Determine type: positive amount for income, negative for expenses
            # But need to check description for deposits
            description_lower = tx['description'].lower()
            is_income = any(keyword in description_lower for keyword in 
                          ['deposit from', 'transfer from', 'eft deposit', 'interac e-transfer from'])
            is_transfer = any(keyword in description_lower for keyword in
                            ['internet deposit from', 'internet withdrawal to', 'transfer to', 'transfer from'])
            
            if not is_transfer:
                writer.writerow({
                    'date': tx['date'],
                    'description': tx['description'],
                    'amount': abs(tx['amount']),
                    'type': 'income' if is_income else 'expense',
                    'category': cat_info['category']
                })
    
    print("CSV for import saved to 'transactions_for_import.csv'")