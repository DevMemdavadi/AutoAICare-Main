from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django.conf import settings
from .models import Payment
from .serializers import PaymentSerializer, PaymentInitiateSerializer
from bookings.models import Booking
import stripe
import uuid

stripe.api_key = settings.STRIPE_SECRET_KEY


class PaymentViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for viewing payments."""
    queryset = Payment.objects.all()
    serializer_class = PaymentSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Filter payments based on user role and company/branch."""
        user = self.request.user
        # Use all_companies() to bypass CompanyManager's automatic company filter.
        # CompanyManager resolves company from middleware which is unreliable in a
        # customer-facing context and would silently exclude the customer's own payments.
        queryset = Payment.objects.all_companies().select_related('booking', 'invoice')
        
        if user.role == 'super_admin':
            return queryset
        elif user.role == 'company_admin' and user.company:
            return queryset.filter(company=user.company)
        elif user.role in ['branch_admin', 'floor_manager', 'supervisor'] and hasattr(user, 'branch') and user.branch:
            return queryset.filter(booking__branch=user.branch)
        elif user.role == 'customer':
            return queryset.filter(booking__customer__user=user)
        return queryset.none()
    
    @action(detail=False, methods=['get'])
    def history(self, request):
        """Get payment history for current user."""
        payments = self.get_queryset()
        serializer = self.get_serializer(payments, many=True)
        return Response(serializer.data)


class PaymentInitiateView(APIView):
    """API endpoint to initiate payment."""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        serializer = PaymentInitiateSerializer(data=request.data)
        if serializer.is_valid():
            booking_id = serializer.validated_data['booking_id']
            payment_method = serializer.validated_data['payment_method']
            
            try:
                booking = Booking.objects.get(id=booking_id, customer__user=request.user)
                
                # Create payment record
                # Derive company from booking's branch
                payment_company = None
                if hasattr(booking, 'branch') and booking.branch:
                    payment_company = getattr(booking.branch, 'company', None)
                
                payment = Payment.objects.create(
                    booking=booking,
                    amount=booking.total_price,
                    payment_method=payment_method,
                    payment_status='pending',
                    company=payment_company
                )
                
                # Handle Stripe payment
                if payment_method == 'stripe':
                    try:
                        intent = stripe.PaymentIntent.create(
                            amount=int(booking.total_price * 100),  # Amount in cents
                            currency='usd',
                            metadata={'booking_id': booking.id, 'payment_id': payment.id}
                        )
                        payment.stripe_payment_intent_id = intent.id
                        payment.save()
                        
                        return Response({
                            'payment_id': payment.id,
                            'client_secret': intent.client_secret,
                            'publishable_key': settings.STRIPE_PUBLISHABLE_KEY
                        }, status=status.HTTP_200_OK)
                    except Exception as e:
                        payment.payment_status = 'failed'
                        payment.save()
                        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                else:
                    # For cash/card/upi, return payment ID for manual confirmation
                    payment.transaction_id = str(uuid.uuid4())
                    payment.save()
                    return Response({
                        'payment_id': payment.id,
                        'transaction_id': payment.transaction_id,
                        'message': 'Payment initiated. Please complete the payment.'
                    }, status=status.HTTP_200_OK)
                
            except Booking.DoesNotExist:
                return Response({'error': 'Booking not found.'}, status=status.HTTP_404_NOT_FOUND)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class PaymentVerifyView(APIView):
    """API endpoint to verify payment."""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        payment_id = request.data.get('payment_id')
        
        try:
            payment = Payment.objects.get(id=payment_id, booking__customer__user=request.user)
            
            if payment.payment_method == 'stripe':
                # Verify with Stripe
                try:
                    intent = stripe.PaymentIntent.retrieve(payment.stripe_payment_intent_id)
                    if intent.status == 'succeeded':
                        payment.payment_status = 'completed'
                        payment.booking.status = 'confirmed'
                        payment.booking.save()
                        
                        # Update job card status if exists
                        if hasattr(payment.booking, 'jobcard') and payment.booking.jobcard:
                            jobcard = payment.booking.jobcard
                            if jobcard.status in ['ready_for_billing', 'final_qc_passed', 'customer_approved']:
                                jobcard.status = 'billed'
                                jobcard.save()
                        
                        payment.save()
                        return Response({'message': 'Payment verified successfully.'}, status=status.HTTP_200_OK)
                    else:
                        return Response({'error': 'Payment not completed.'}, status=status.HTTP_400_BAD_REQUEST)
                except Exception as e:
                    return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            else:
                # Manual verification for other payment methods
                try:
                    payment.payment_status = 'completed'
                    payment.booking.status = 'confirmed'
                    payment.booking.save()
                    
                    # Update job card status if exists
                    if hasattr(payment.booking, 'jobcard') and payment.booking.jobcard:
                        jobcard = payment.booking.jobcard
                        if jobcard.status in ['ready_for_billing', 'final_qc_passed', 'customer_approved']:
                            jobcard.status = 'billed'
                            jobcard.save()
                    
                    payment.save()
                    return Response({'message': 'Payment verified successfully.'}, status=status.HTTP_200_OK)
                except Exception as e:
                    return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        except Payment.DoesNotExist:
            return Response({'error': 'Payment not found.'}, status=status.HTTP_404_NOT_FOUND)


class WalletViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for wallet operations."""
    permission_classes = [permissions.IsAuthenticated]
    
    @action(detail=False, methods=['get'])
    def my_balance(self, request):
        """Get current user's wallet balance."""
        from .wallet_models import Wallet
        from customers.models import Customer
        
        try:
            customer = request.user.customer_profile
            wallet, created = Wallet.objects.get_or_create(customer=customer)
            
            return Response({
                'balance': float(wallet.balance),
                'customer_name': customer.user.name,
                'created_at': wallet.created_at.isoformat() if wallet.created_at else None
            })
        except Customer.DoesNotExist:
            return Response({
                'error': 'Customer profile not found'
            }, status=status.HTTP_404_NOT_FOUND)
    
    @action(detail=False, methods=['get'])
    def my_transactions(self, request):
        """Get current user's wallet transaction history."""
        from .wallet_models import Wallet, WalletTransaction
        from customers.models import Customer
        
        try:
            customer = request.user.customer_profile
            wallet = Wallet.objects.get(customer=customer)
            
            # Get transactions with optional filtering
            transactions = WalletTransaction.objects.filter(wallet=wallet)
            
            # Filter by transaction type if provided
            transaction_type = request.query_params.get('type')
            if transaction_type in ['credit', 'debit']:
                transactions = transactions.filter(transaction_type=transaction_type)
            
            # Limit results
            limit = int(request.query_params.get('limit', 50))
            transactions = transactions[:limit]
            
            return Response({
                'balance': float(wallet.balance),
                'transactions': [{
                    'id': t.id,
                    'type': t.transaction_type,
                    'amount': float(t.amount),
                    'description': t.description,
                    'balance_after': float(t.balance_after),
                    'created_at': t.created_at.isoformat() if t.created_at else None
                } for t in transactions]
            })
        except Wallet.DoesNotExist:
            return Response({
                'balance': 0.0,
                'transactions': []
            })
        except Customer.DoesNotExist:
            return Response({
                'error': 'Customer profile not found'
            }, status=status.HTTP_404_NOT_FOUND)


class StripeWebhookView(APIView):
    """Stripe webhook handler."""
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        payload = request.body
        sig_header = request.META.get('HTTP_STRIPE_SIGNATURE')
        
        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
            )
        except ValueError:
            return Response({'error': 'Invalid payload'}, status=status.HTTP_400_BAD_REQUEST)
        except stripe.error.SignatureVerificationError:
            return Response({'error': 'Invalid signature'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Handle payment intent succeeded
        if event['type'] == 'payment_intent.succeeded':
            payment_intent = event['data']['object']
            payment_id = payment_intent['metadata'].get('payment_id')
            
            if payment_id:
                try:
                    payment = Payment.objects.get(id=payment_id)
                    payment.payment_status = 'completed'
                    payment.booking.status = 'confirmed'
                    payment.booking.save()
                    
                    # Update job card status if exists
                    # First check through invoice relationship
                    if payment.invoice and payment.invoice.jobcard:
                        jobcard = payment.invoice.jobcard
                        if jobcard.status in ['ready_for_billing', 'final_qc_passed', 'customer_approved']:
                            jobcard.status = 'billed'
                            jobcard.save()
                    # Fallback to booking relationship
                    elif hasattr(payment.booking, 'jobcard') and payment.booking.jobcard:
                        jobcard = payment.booking.jobcard
                        if jobcard.status in ['ready_for_billing', 'final_qc_passed', 'customer_approved']:
                            jobcard.status = 'billed'
                            jobcard.save()
                    
                    payment.save()
                except Payment.DoesNotExist:
                    pass
        
        return Response({'status': 'success'}, status=status.HTTP_200_OK)