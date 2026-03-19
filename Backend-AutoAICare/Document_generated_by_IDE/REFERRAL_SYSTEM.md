# Referral System Documentation

## Overview
The referral system allows existing customers to refer new customers and earn rewards. Both the referrer (existing customer) and referee (new customer) receive rewards when the referee completes their first job.

## Features

### 1. **Super Admin Configuration**
Super admin can configure all aspects of the referral program through the API:
- Enable/disable the referral program
- Set reward type (percentage or fixed amount) for referrers
- Set reward type (percentage or fixed amount) for referees
- Set reward values
- Set maximum reward caps for percentage-based rewards
- Set minimum job amount to qualify (future use)

### 2. **Automatic Referral Code Generation**
- Referral codes are automatically generated after a customer completes their first job
- Codes follow the format: `K3{FirstThreeLetters}{4Digits}` (e.g., `K3JOH1234` for John)
- Customers can also request custom referral codes

### 3. **Referral Tracking**
- Track all referrals with status: Pending → Completed → Rewarded
- View referral statistics (total referrals, rewards earned, etc.)
- Admin dashboard to monitor referral program performance

### 4. **Wallet Integration**
- Rewards are automatically credited to customer wallets
- Customers can use wallet balance for future purchases
- Complete transaction history

## API Endpoints

### Referral Settings (Super Admin)
```
GET    /api/settings/referral/          - Get referral settings
PUT    /api/settings/referral/          - Update referral settings (super admin only)
PATCH  /api/settings/referral/          - Partial update (super admin only)
```

### Referral Codes
```
GET    /api/customers/referral-codes/              - List all referral codes
GET    /api/customers/referral-codes/my_code/      - Get current user's referral code
POST   /api/customers/referral-codes/create_code/  - Create/customize referral code
POST   /api/customers/referral-codes/validate_code/ - Validate a referral code (public)
GET    /api/customers/referral-codes/my_stats/     - Get referral statistics
```

### Referrals
```
GET    /api/customers/referrals/                   - List all referrals
GET    /api/customers/referrals/{id}/              - Get referral details
POST   /api/customers/referrals/{id}/process_reward/ - Manually process rewards (admin)
```

## User Flows

### For Existing Customer (Referrer)

1. **Complete First Job**
   - After completing their first job, a referral code is automatically generated
   - Customer receives notification about their referral code

2. **View Referral Code**
   ```bash
   GET /api/customers/referral-codes/my_code/
   ```
   Response:
   ```json
   {
     "id": 1,
     "code": "K3JOH1234",
     "customer_name": "John Doe",
     "is_active": true,
     "times_used": 5,
     "created_at": "2026-02-03T12:00:00Z"
   }
   ```

3. **Share Referral Code**
   - Share code via WhatsApp, SMS, or any channel
   - Friends use this code during registration

4. **Track Referrals**
   ```bash
   GET /api/customers/referral-codes/my_stats/
   ```
   Response:
   ```json
   {
     "total_referrals": 5,
     "pending_referrals": 2,
     "completed_referrals": 1,
     "rewarded_referrals": 2,
     "total_rewards_earned": 500.00,
     "referral_code": "K3JOH1234",
     "times_code_used": 5
   }
   ```

### For New Customer (Referee)

1. **Registration with Referral Code**
   - During registration, enter referral code
   - System validates the code and creates a pending referral

2. **Complete First Job**
   - When the referee completes their first job:
     - Referral status changes to "completed"
     - Rewards are automatically processed
     - Both referrer and referee receive wallet credits

3. **Receive Rewards**
   - Rewards are credited to wallet automatically
   - Notification sent to both parties
   - Can use wallet balance for next booking

### For Super Admin

1. **Configure Referral Settings**
   ```bash
   PUT /api/settings/referral/
   ```
   Request:
   ```json
   {
     "is_enabled": true,
     "referrer_reward_type": "fixed",
     "referrer_reward_value": 100.00,
     "referee_reward_type": "percentage",
     "referee_reward_value": 10.00,
     "max_referee_reward_cap": 200.00
   }
   ```

2. **View Referral Analytics**
   - View all referrals across the system
   - Filter by branch, status, date range
   - Monitor program performance

## Database Models

### ReferralSettings (Singleton)
```python
- is_enabled: Boolean
- referrer_reward_type: 'percentage' | 'fixed'
- referrer_reward_value: Decimal
- referee_reward_type: 'percentage' | 'fixed'
- referee_reward_value: Decimal
- minimum_job_amount: Decimal
- max_referrer_reward_cap: Decimal (optional)
- max_referee_reward_cap: Decimal (optional)
```

### ReferralCode
```python
- customer: ForeignKey(Customer)
- code: CharField (unique)
- is_active: Boolean
- times_used: Integer
- created_at: DateTime
```

### Referral
```python
- referrer: ForeignKey(Customer)
- referee: ForeignKey(Customer)
- referral_code: CharField
- status: 'pending' | 'completed' | 'rewarded'
- referrer_points_awarded: Decimal
- referee_points_awarded: Decimal
- created_at: DateTime
- completed_at: DateTime
- rewarded_at: DateTime
```

## Automatic Processing

### Signals
The system uses Django signals to automatically handle:

1. **Referral Code Generation**
   - Triggered when a customer completes their first job
   - Creates a unique referral code automatically

2. **Referral Completion**
   - Triggered when a referred customer completes their first job
   - Marks the referral as "completed"

3. **Reward Processing**
   - Automatically processes rewards when referral is completed
   - Credits wallet balances for both parties
   - Sends notifications

## Example Scenarios

### Scenario 1: Fixed Amount Rewards
**Settings:**
- Referrer reward: ₹100 (fixed)
- Referee reward: ₹100 (fixed)

**Flow:**
1. John completes his first job → Gets referral code `K3JOH1234`
2. John refers Sarah using code `K3JOH1234`
3. Sarah registers and completes her first job
4. John receives ₹100 in wallet
5. Sarah receives ₹100 in wallet

### Scenario 2: Percentage-Based Rewards
**Settings:**
- Referrer reward: 10% (max ₹200)
- Referee reward: 15% (max ₹300)

**Flow:**
1. John refers Sarah
2. Sarah completes a ₹2000 job
3. John receives ₹200 (10% of ₹2000, capped at ₹200)
4. Sarah receives ₹300 (15% of ₹2000, capped at ₹300)

### Scenario 3: Mixed Rewards
**Settings:**
- Referrer reward: ₹150 (fixed)
- Referee reward: 10% (max ₹250)

**Flow:**
1. John refers Sarah
2. Sarah completes a ₹3000 job
3. John receives ₹150 (fixed amount)
4. Sarah receives ₹250 (10% of ₹3000, capped at ₹250)

## Integration Points

### Registration Flow
Add referral code field to registration form:
```javascript
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "1234567890",
  "referral_code": "K3SAR5678"  // Optional
}
```

### Customer Profile
Display referral code and statistics in customer profile:
```javascript
// Fetch referral code
GET /api/customers/referral-codes/my_code/

// Fetch statistics
GET /api/customers/referral-codes/my_stats/
```

### Admin Dashboard
Create admin panel for referral management:
- Configure rewards
- View all referrals
- Monitor program performance
- Generate reports

## Testing Checklist

- [ ] Super admin can configure referral settings
- [ ] Referral code is generated after first job completion
- [ ] Customer can view their referral code
- [ ] Customer can create custom referral code
- [ ] New customer can register with referral code
- [ ] Referral code validation works
- [ ] Referral is marked as completed after referee's first job
- [ ] Rewards are automatically credited to wallets
- [ ] Both parties receive correct reward amounts
- [ ] Percentage-based rewards respect caps
- [ ] Fixed amount rewards work correctly
- [ ] Referral statistics are accurate
- [ ] Admin can view all referrals
- [ ] Notifications are sent to both parties

## Future Enhancements

1. **Referral Limits**
   - Maximum number of referrals per customer
   - Time-based limits (e.g., max 5 per month)

2. **Expiry Dates**
   - Referral codes can expire after certain period
   - Rewards expire if not used within timeframe

3. **Tiered Rewards**
   - Different reward levels based on number of referrals
   - Bonus rewards for top referrers

4. **Social Sharing**
   - One-click sharing to WhatsApp, SMS, Email
   - Pre-formatted messages with referral code

5. **Referral Campaigns**
   - Time-limited campaigns with higher rewards
   - Special events (e.g., "Refer 5 friends, get ₹1000")

6. **Analytics Dashboard**
   - Referral conversion rates
   - Top referrers leaderboard
   - Revenue generated through referrals
   - Geographic distribution of referrals

## Support

For issues or questions about the referral system:
1. Check this documentation
2. Review API endpoint responses
3. Check Django admin for referral records
4. Review signal logs for automatic processing
