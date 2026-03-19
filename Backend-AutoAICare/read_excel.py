"""
Extract comprehensive data from TARNA expense report
"""
from pyxlsb import open_workbook
import json
from collections import defaultdict

file_path = r"TARNA Expanse report APRIL-25 TO March-26.xlsb"

print("Reading Excel file...")
all_data = {}
item_categories = defaultdict(int)
unique_items = set()
all_rows = []

with open_workbook(file_path) as wb:
    print(f"Available sheets: {wb.sheets}\n")
    
    for sheet_name in wb.sheets:
        if not sheet_name or sheet_name == 'None':
            continue
            
        print(f"Processing sheet: {sheet_name}")
        
        with wb.get_sheet(sheet_name) as sheet:
            rows = []
            headers = None
            
            for idx, row in enumerate(sheet.rows()):
                row_data = [cell.v if cell.v is not None else '' for cell in row]
                
                # First row is usually headers
                if idx == 0:
                    headers = row_data
                    print(f"Headers: {headers}")
                else:
                    rows.append(row_data)
                    all_rows.append(row_data)
                    
                    # Try to extract item/service names (usually in column index 8 or similar)
                    if len(row_data) > 8 and row_data[8]:
                        item_name = str(row_data[8]).strip()
                        if item_name and item_name != '':
                            unique_items.add(item_name)
                            item_categories[item_name] += 1
            
            all_data[sheet_name] = {
                'headers': headers,
                'row_count': len(rows)
            }
            
            print(f"  Rows: {len(rows)}")

print(f"\n{'='*60}")
print(f"SUMMARY")
print(f"{'='*60}")
print(f"Total sheets processed: {len(all_data)}")
print(f"Total rows across all sheets: {len(all_rows)}")
print(f"Unique items/services found: {len(unique_items)}")

print(f"\n{'='*60}")
print(f"TOP 30 MOST FREQUENT ITEMS/SERVICES")
print(f"{'='*60}")
sorted_items = sorted(item_categories.items(), key=lambda x: x[1], reverse=True)
for item, count in sorted_items[:30]:
    print(f"{count:4d}x  {item}")

print(f"\n{'='*60}")
print(f"ALL UNIQUE ITEMS ({len(unique_items)} total)")
print(f"{'='*60}")
for item in sorted(unique_items):
    print(f"  - {item}")

# Save to file for review
with open('expense_report_analysis.txt', 'w', encoding='utf-8') as f:
    f.write("TARNA EXPENSE REPORT ANALYSIS\n")
    f.write("="*60 + "\n\n")
    f.write(f"Total sheets: {len(all_data)}\n")
    f.write(f"Total rows: {len(all_rows)}\n")
    f.write(f"Unique items: {len(unique_items)}\n\n")
    
    f.write("TOP ITEMS BY FREQUENCY:\n")
    f.write("-"*60 + "\n")
    for item, count in sorted_items:
        f.write(f"{count:4d}x  {item}\n")
    
    f.write("\n\nALL UNIQUE ITEMS (ALPHABETICAL):\n")
    f.write("-"*60 + "\n")
    for item in sorted(unique_items):
        f.write(f"  - {item}\n")

print(f"\n✅ Analysis saved to: expense_report_analysis.txt")
