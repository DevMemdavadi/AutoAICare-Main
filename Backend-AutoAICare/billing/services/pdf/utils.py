# billing/services/pdf/utils.py

def number_to_words_indian(amount):
    """
    Convert a number to words in Indian English format.
    Example: 910.50 -> "Nine Hundred Ten Rupees and Fifty Paise"
    """
    
    # Split into rupees and paise
    rupees = int(amount)
    paise = int(round((amount - rupees) * 100))
    
    # Words for numbers
    ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine']
    teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 
             'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
    tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']
    
    def convert_below_thousand(n):
        """Convert numbers below 1000 to words."""
        if n == 0:
            return ''
        elif n < 10:
            return ones[n]
        elif n < 20:
            return teens[n - 10]
        elif n < 100:
            return tens[n // 10] + (' ' + ones[n % 10] if n % 10 != 0 else '')
        else:
            return ones[n // 100] + ' Hundred' + (' ' + convert_below_thousand(n % 100) if n % 100 != 0 else '')
    
    def convert_rupees(n):
        """Convert rupees to words using Indian numbering system."""
        if n == 0:
            return 'Zero'
        
        # Indian numbering: crores, lakhs, thousands, hundreds
        crore = n // 10000000
        n %= 10000000
        lakh = n // 100000
        n %= 100000
        thousand = n // 1000
        n %= 1000
        hundred = n
        
        result = []
        
        if crore > 0:
            result.append(convert_below_thousand(crore) + ' Crore')
        if lakh > 0:
            result.append(convert_below_thousand(lakh) + ' Lakh')
        if thousand > 0:
            result.append(convert_below_thousand(thousand) + ' Thousand')
        if hundred > 0:
            result.append(convert_below_thousand(hundred))
        
        return ' '.join(result)
    
    # Build the final string
    result = convert_rupees(rupees) + ' Rupees'
    
    if paise > 0:
        result += ' and ' + convert_below_thousand(paise) + ' Paise'
    
    return result + ' Only'
