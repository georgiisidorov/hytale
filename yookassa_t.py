import uuid

from yookassa import Configuration, Payment

Configuration.account_id = 1319571
Configuration.secret_key = 'test_cOHoV_XttodSZ3M6KQ4XBLH9KgFHIE-j4D6AcZq7c28'

payment = Payment.create({
    "amount": {
        "value": "100.00",
        "currency": "RUB"
    },
    "confirmation": {
        "type": "redirect",
        "return_url": "https://www.example.com/return_url"
    },
    "capture": True,
    "description": "Заказ №1"
}, uuid.uuid4())

print(payment.confirmation.confirmation_url)