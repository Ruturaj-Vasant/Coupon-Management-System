# Coupon-Management-System
NYU Digital Pass System - Technical Details

Note: PassKit trial account limits coupon generation to 5-7 at a time.

Core Features:
- Digital pass generation with QR codes
- PassKit API integration for Apple Wallet compatibility
- Real-time form validation
- Automated email notifications
- Cross-platform support (iOS/Android)
- Usage tracking and management
- Google Sheets integration

Technical Implementation:
1. Frontend: HTML5, CSS3, JavaScript
2. Backend: Google Apps Script
3. Storage: Google Sheets
4. APIs: PassKit API
5. Authentication: Google OAuth

Key Validations:
- Future date validation for expiration
- Required field validation
- Network connectivity checks
- API error management
- Usage limit tracking

Testing Scenarios:
1. Single vs Multiple Uses:
   - Test fixed number (1-10)
   - Test unlimited uses
2. Service Types:
   - Cafeteria
   - Printing
3. Discount Amounts:
   - Various values
   - No negative values
4. Expiration Dates:
   - Future dates only
   - Different timeframes

Browser Compatibility:
- Chrome (recommended)
- Safari
- Firefox
- Mobile browsers

Known Limitations:
- PassKit trial account restrictions
- Manual deletion required for new passes after limit
- Requires stable internet connection

Contact:
Ruturaj Tambe
Email: rvt2018@nyu.edu
Phone: +1-917-815-9432
