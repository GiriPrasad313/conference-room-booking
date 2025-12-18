import json
import boto3
import os
from datetime import datetime

# Initialize SNS client
sns = boto3.client('sns', region_name='us-east-1')

# SNS Topic ARN for booking notifications
SNS_TOPIC_ARN = os.environ.get('SNS_TOPIC_ARN', 'arn:aws:sns:us-east-1:654654552962:booking-notifications')

def lambda_handler(event, context):
    """
    Process booking notification messages from SQS and send emails via SNS.
    """
    print(f"Received event: {json.dumps(event)}")
    
    processed_count = 0
    error_count = 0
    
    for record in event.get('Records', []):
        try:
            # Parse the SQS message body
            message_body = json.loads(record['body'])
            print(f"Processing message: {json.dumps(message_body)}")
            
            # Extract booking details
            booking_id = message_body.get('bookingId', 'N/A')
            user_email = message_body.get('userEmail', 'N/A')
            user_name = message_body.get('userName', 'Guest')
            room_name = message_body.get('roomName', 'Conference Room')
            location_name = message_body.get('locationName', 'Location')
            booking_date = message_body.get('date', 'N/A')
            start_time = message_body.get('startTime', '09:00')
            end_time = message_body.get('endTime', '17:00')
            event_type = message_body.get('eventType', 'BOOKING_CREATED')
            
            # Format the date nicely
            try:
                date_obj = datetime.strptime(booking_date, '%Y-%m-%d')
                formatted_date = date_obj.strftime('%A, %d %B %Y')
            except:
                formatted_date = booking_date
            
            # Create email content based on event type
            if event_type == 'BOOKING_CREATED':
                subject = f"Booking Confirmed - {room_name}"
                message = create_booking_confirmation_email(
                    user_name, room_name, location_name, formatted_date, 
                    start_time, end_time, booking_id
                )
            elif event_type == 'BOOKING_CANCELLED':
                subject = f"Booking Cancelled - {room_name}"
                message = create_cancellation_email(
                    user_name, room_name, location_name, formatted_date, booking_id
                )
            elif event_type == 'USER_REGISTERED':
                subject = "Welcome to ConferenceBook"
                message = create_welcome_email(user_name, user_email)
            elif event_type == 'ACCOUNT_DELETED':
                subject = "Account Deleted - ConferenceBook"
                message = create_account_deleted_email(user_name, user_email)
            else:
                subject = f"Booking Update - {room_name}"
                message = create_generic_email(
                    user_name, room_name, location_name, formatted_date, 
                    event_type, booking_id
                )
            
            # Send notification via SNS
            response = sns.publish(
                TopicArn=SNS_TOPIC_ARN,
                Subject=subject,
                Message=message,
                MessageAttributes={
                    'eventType': {
                        'DataType': 'String',
                        'StringValue': event_type
                    },
                    'userEmail': {
                        'DataType': 'String',
                        'StringValue': user_email
                    }
                }
            )
            
            print(f"SNS notification sent successfully. MessageId: {response['MessageId']}")
            processed_count += 1
            
        except Exception as e:
            print(f"Error processing record: {str(e)}")
            error_count += 1
    
    result = {
        'statusCode': 200,
        'body': json.dumps({
            'message': 'Processing complete',
            'processed': processed_count,
            'errors': error_count
        })
    }
    
    print(f"Lambda execution complete: {json.dumps(result)}")
    return result


def create_booking_confirmation_email(user_name, room_name, location_name, date, start_time, end_time, booking_id):
    """Create a formatted booking confirmation email."""
    return f"""
================================================================================
                         BOOKING CONFIRMATION
================================================================================

Hello {user_name},

Your conference room booking has been confirmed.

BOOKING DETAILS
--------------------------------------------------------------------------------
    Room:       {room_name}
    Location:   {location_name}
    Date:       {date}
    Time:       {start_time} - {end_time}
--------------------------------------------------------------------------------

Booking Reference: {booking_id}

================================================================================

IMPORTANT REMINDERS:
- Please arrive 5 minutes before your booking
- Cancel at least 24 hours in advance if needed
- Contact support for any assistance

Thank you for using ConferenceBook.

================================================================================
This is an automated message from ConferenceBook.
Do not reply to this email.
"""


def create_cancellation_email(user_name, room_name, location_name, date, booking_id):
    """Create a booking cancellation email."""
    return f"""
================================================================================
                         BOOKING CANCELLED
================================================================================

Hello {user_name},

Your booking has been successfully cancelled.

CANCELLED BOOKING DETAILS
--------------------------------------------------------------------------------
    Room:       {room_name}
    Location:   {location_name}
    Date:       {date}
--------------------------------------------------------------------------------

Booking Reference: {booking_id}

================================================================================

Need to book again? Visit our booking portal.

Thank you for using ConferenceBook.

================================================================================
This is an automated message from ConferenceBook.
Do not reply to this email.
"""


def create_welcome_email(user_name, user_email):
    """Create a welcome email for new users."""
    return f"""
================================================================================
                      WELCOME TO CONFERENCEBOOK
================================================================================

Hello {user_name},

Welcome to ConferenceBook - your conference room booking solution.

Your account has been created successfully.

Registered Email: {user_email}

================================================================================

WHAT YOU CAN DO:
--------------------------------------------------------------------------------
- Browse available conference rooms
- Check real-time availability
- Book rooms with weather-based dynamic pricing
- Manage and reschedule your bookings
- Receive email confirmations
--------------------------------------------------------------------------------

Our system uses weather forecasts to provide dynamic pricing - book on 
pleasant days for potential discounts.

================================================================================

Ready to book your first room?
Login and explore our available spaces.

Thank you for choosing ConferenceBook.

================================================================================
This is an automated message from ConferenceBook.
Do not reply to this email.
"""


def create_account_deleted_email(user_name, user_email):
    """Create an account deletion confirmation email."""
    return f"""
================================================================================
                         ACCOUNT DELETED
================================================================================

Hello {user_name},

Your ConferenceBook account has been successfully deleted as requested.

Deleted Account: {user_email}

================================================================================

WHAT THIS MEANS:
--------------------------------------------------------------------------------
- Your account data has been removed
- Any active bookings have been cancelled
- You will no longer receive notifications
--------------------------------------------------------------------------------

If you change your mind, you are welcome to create a new account at any time.

================================================================================

If you did not request this deletion, please contact our support team 
immediately.

Thank you for using ConferenceBook.

================================================================================
This is an automated message from ConferenceBook.
Do not reply to this email.
"""


def create_generic_email(user_name, room_name, location_name, date, event_type, booking_id):
    """Create a generic booking update email."""
    return f"""
================================================================================
                         BOOKING UPDATE
================================================================================

Hello {user_name},

There has been an update to your booking.

BOOKING DETAILS
--------------------------------------------------------------------------------
    Room:       {room_name}
    Location:   {location_name}
    Date:       {date}
    Status:     {event_type.replace('_', ' ').title()}
--------------------------------------------------------------------------------

Booking Reference: {booking_id}

================================================================================

Thank you for using ConferenceBook.

================================================================================
This is an automated message from ConferenceBook.
Do not reply to this email.
"""
