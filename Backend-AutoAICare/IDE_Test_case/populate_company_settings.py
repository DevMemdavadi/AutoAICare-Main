# Script to populate default company settings
# Run with: python manage.py shell < populate_company_settings.py

from config.models import CompanySettings

# Create or update company settings
company, created = CompanySettings.objects.get_or_create(pk=1)

company.company_name = "K3 CAR CARE"
company.branch_name = "CHANDPUR"
company.address_line1 = "Chandpur Road, 270, Industrial Estate Rd, opp. Rudra Royal Building"
company.address_line2 = "Manduwadih, Varanasi, Maruadih Rly. Settlement"
company.city = "Varanasi"
company.state = "Uttar Pradesh"
company.pincode = "221103"
company.phone = "7753895556"
company.email = "k3carcarellp@gmail.com"
company.website = "www.k3carcare.com"
company.gst_number = "09ABAFK4362J1Z6"
company.bank_name = "ICICI Bank, VARANASI"
company.account_number = "571505000050"
company.ifsc_code = "ICIC0006283"
company.account_holder_name = "K3 CAR CARE LLP"
company.branch_address = "VARANASI"
company.terms_and_conditions = """1. Goods once sold will not be taken back or exchanged
2. All disputes are subject to Varanasi jurisdiction only"""
company.footer_message = "****THANK YOU. PLEASE VISIT AGAIN****"
company.invoice_prefix = "B2C"

company.save()

print(f"Company settings {'created' if created else 'updated'} successfully!")
print(f"Company: {company.company_name} {company.branch_name}")
print(f"GST: {company.gst_number}")
