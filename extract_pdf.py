import pypdf
import sys
import os

def extract_pdf_text(pdf_path):
    """Extract text from a PDF file."""
    try:
        reader = pypdf.PdfReader(pdf_path)
        text = ""
        
        print(f"PDF has {len(reader.pages)} pages")
        print(f"Metadata: {reader.metadata}")
        print("\n" + "="*80 + "\n")
        
        # Extract text from each page
        for i, page in enumerate(reader.pages):
            page_text = page.extract_text()
            if page_text.strip():
                text += f"\n=== Page {i+1} ===\n"
                text += page_text + "\n"
        
        return text
    except Exception as e:
        return f"Error extracting PDF: {e}"

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python extract_pdf.py <pdf_file>")
        sys.exit(1)
    
    pdf_file = sys.argv[1]
    if not os.path.exists(pdf_file):
        print(f"File not found: {pdf_file}")
        sys.exit(1)
    
    text = extract_pdf_text(pdf_file)
    
    # Save to file
    output_file = "extracted_statement.txt"
    with open(output_file, "w", encoding="utf-8") as f:
        f.write(text)
    
    print(f"Extracted text saved to {output_file}")
    
    # Also print first 2000 characters to see structure
    print("\nFirst 2000 characters of extracted text:")
    print("="*80)
    print(text[:2000])