# n8n Workflow Examples for Automation Module

This document contains example n8n workflow configurations for the Admin Automation Module.

## Workflow 1: Send Email

**Webhook Path:** `send-email`  
**Method:** POST  
**Node Count:** 4

### Workflow JSON

```json
{
  "name": "Send Email - Automation",
  "nodes": [
    {
      "parameters": {
        "path": "send-email",
        "httpMethod": "POST"
      },
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 1,
      "position": [100, 300]
    },
    {
      "parameters": {
        "javaScriptCode": "// Extract recipient email\nconst context = $input.first().json;\nconst recipientField = context.recipientField;\nconst recipient = context.context[recipientField];\n\nreturn {\n  email: recipient || 'admin@sierra-estates.net',\n  subject: context.subject,\n  body: context.body,\n  template: context.template,\n  ruleId: context.context.ruleId,\n  leadId: context.context.triggeredBy\n};"
      },
      "name": "Process Email Data",
      "type": "n8n-nodes-base.code",
      "typeVersion": 1,
      "position": [300, 300]
    },
    {
      "parameters": {
        "authentication": "sendgrid",
        "fromEmail": "{{ $credentials.fromEmail }}",
        "toEmail": "={{ $input.first().json.email }}",
        "subject": "={{ $input.first().json.subject }}",
        "htmlEmail": "={{ $input.first().json.body }}"
      },
      "name": "Send Sendgrid Email",
      "type": "n8n-nodes-base.sendgrid",
      "typeVersion": 1,
      "position": [500, 300],
      "credentials": {
        "sendgridApi": "SendgridAPI"
      }
    },
    {
      "parameters": {
        "responseCode": 200,
        "responseData": "={\"success\": true, \"messageId\": $input.first().json.messageId, \"timestamp\": Date.now()}"
      },
      "name": "Return Response",
      "type": "n8n-nodes-base.respondToWebhook",
      "typeVersion": 1,
      "position": [700, 300]
    }
  ],
  "connections": {
    "Webhook": {
      "main": [[{"node": "Process Email Data", "branch": 0}]]
    },
    "Process Email Data": {
      "main": [[{"node": "Send Sendgrid Email", "branch": 0}]]
    },
    "Send Sendgrid Email": {
      "main": [[{"node": "Return Response", "branch": 0}]]
    }
  }
}
```

### Setup Steps

1. Create a new workflow in n8n
2. Add **Webhook** node (Trigger)
3. Set path to `send-email`
4. Add **Code** node to process email data
5. Add **Sendgrid** node to send email
6. Add **Respond to Webhook** node to return response
7. Create SendgridAPI credentials in n8n (use Sendgrid API key)
8. Deploy and activate

### Expected Payload

```json
{
  "template": "welcome",
  "subject": "Welcome to Sierra Estates",
  "body": "Welcome to our platform!",
  "recipientField": "leadEmail",
  "context": {
    "ruleId": "rule123",
    "ruleName": "Welcome Email",
    "triggeredBy": "lead456",
    "triggerType": "lead_created",
    "leadEmail": "investor@example.com"
  }
}
```

---

## Workflow 2: Send WhatsApp

**Webhook Path:** `send-whatsapp`  
**Method:** POST  
**Node Count:** 5

### Workflow JSON

```json
{
  "name": "Send WhatsApp - Automation",
  "nodes": [
    {
      "parameters": {
        "path": "send-whatsapp",
        "httpMethod": "POST"
      },
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 1,
      "position": [100, 300]
    },
    {
      "parameters": {
        "javaScriptCode": "// Extract recipient phone and build message\nconst data = $input.first().json;\nconst context = data.context;\nconst recipientField = data.recipientField;\nconst recipient = context[recipientField];\nconst property = context.triggeredByObject || {};\n\nlet message = data.messageBody;\n\n// Replace template variables\nif (data.includeContactName && context.leadName) {\n  message = message.replace('{contactName}', context.leadName);\n}\nif (data.includePropertyDetails) {\n  message = message.replace('{propertyTitle}', property.title || 'Property');\n  message = message.replace('{propertyPrice}', property.price || 'Contact for price');\n  message = message.replace('{propertyLink}', property.id ? `https://sierra-estates.net/listings/${property.id}` : '');\n}\n\nreturn {\n  phone: recipient || '',\n  message: message,\n  template: data.template,\n  ruleId: context.ruleId,\n  leadId: context.triggeredBy\n};"
      },
      "name": "Process WhatsApp Data",
      "type": "n8n-nodes-base.code",
      "typeVersion": 1,
      "position": [300, 300]
    },
    {
      "parameters": {
        "authentication": "twilio",
        "toPhone": "={{ $input.first().json.phone }}",
        "message": "={{ $input.first().json.message }}"
      },
      "name": "Send Twilio WhatsApp",
      "type": "n8n-nodes-base.twilioSms",
      "typeVersion": 1,
      "position": [500, 300],
      "credentials": {
        "twilioApi": "TwilioAPI"
      }
    },
    {
      "parameters": {
        "url": "https://api.example.com/log-message",
        "method": "POST",
        "sendQuery": false,
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "X-Rule-ID",
              "value": "={{ $input.first().json.ruleId }}"
            }
          ]
        },
        "sendBody": true,
        "body": "={\"messageSid\": $input.first().json.sid, \"leadId\": $input.first().json.leadId, \"status\": \"sent\", \"timestamp\": Date.now()}"
      },
      "name": "Log Message (Optional)",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 3,
      "position": [700, 200]
    },
    {
      "parameters": {
        "responseCode": 200,
        "responseData": "={\"success\": true, \"messageSid\": $input.first().json.sid, \"timestamp\": Date.now()}"
      },
      "name": "Return Response",
      "type": "n8n-nodes-base.respondToWebhook",
      "typeVersion": 1,
      "position": [700, 400]
    }
  ],
  "connections": {
    "Webhook": {
      "main": [[{"node": "Process WhatsApp Data", "branch": 0}]]
    },
    "Process WhatsApp Data": {
      "main": [[{"node": "Send Twilio WhatsApp", "branch": 0}]]
    },
    "Send Twilio WhatsApp": {
      "main": [
        [{"node": "Log Message (Optional)", "branch": 0}],
        [{"node": "Return Response", "branch": 0}]
      ]
    },
    "Log Message (Optional)": {
      "main": [[{"node": "Return Response", "branch": 0}]]
    }
  }
}
```

### Setup Steps

1. Create new workflow in n8n
2. Add **Webhook** node with path `send-whatsapp`
3. Add **Code** node to process phone and message
4. Add **Twilio** node to send WhatsApp
5. (Optional) Add **HTTP Request** node to log messages
6. Add **Respond to Webhook** node
7. Create TwilioAPI credentials in n8n
8. Deploy and test

### Expected Payload

```json
{
  "template": "property_match",
  "messageBody": "Hi {contactName}! Check out {propertyTitle} at {propertyPrice}. View: {propertyLink}",
  "recipientField": "leadPhone",
  "includePropertyDetails": true,
  "includeContactName": true,
  "context": {
    "ruleId": "rule789",
    "ruleName": "Property Alert",
    "triggeredBy": "lead123",
    "leadName": "John Investor",
    "leadPhone": "+20123456789",
    "triggeredByObject": {
      "id": "property456",
      "title": "Luxury Villa in New Cairo",
      "price": "2.5M EGP"
    }
  }
}
```

---

## Workflow 3: Send SMS

**Webhook Path:** `send-sms`  
**Method:** POST  
**Node Count:** 3

### Workflow JSON

```json
{
  "name": "Send SMS - Automation",
  "nodes": [
    {
      "parameters": {
        "path": "send-sms",
        "httpMethod": "POST"
      },
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 1,
      "position": [100, 300]
    },
    {
      "parameters": {
        "authentication": "twilio",
        "toPhone": "={{ $json.context[$json.recipientField] }}",
        "message": "={{ $json.messageBody }}"
      },
      "name": "Send Twilio SMS",
      "type": "n8n-nodes-base.twilioSms",
      "typeVersion": 1,
      "position": [300, 300],
      "credentials": {
        "twilioApi": "TwilioAPI"
      }
    },
    {
      "parameters": {
        "responseCode": 200,
        "responseData": "={\"success\": true, \"sid\": $input.first().json.sid, \"timestamp\": Date.now()}"
      },
      "name": "Return Response",
      "type": "n8n-nodes-base.respondToWebhook",
      "typeVersion": 1,
      "position": [500, 300]
    }
  ],
  "connections": {
    "Webhook": {
      "main": [[{"node": "Send Twilio SMS", "branch": 0}]]
    },
    "Send Twilio SMS": {
      "main": [[{"node": "Return Response", "branch": 0}]]
    }
  }
}
```

---

## Workflow 4: Send Telegram

**Webhook Path:** `send-telegram`  
**Method:** POST  
**Node Count:** 3

### Workflow JSON

```json
{
  "name": "Send Telegram - Automation",
  "nodes": [
    {
      "parameters": {
        "path": "send-telegram",
        "httpMethod": "POST"
      },
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 1,
      "position": [100, 300]
    },
    {
      "parameters": {
        "authentication": "botToken",
        "chatId": "={{ $json.context[$json.recipientField] }}",
        "text": "={{ $json.messageBody }}"
      },
      "name": "Send Telegram Message",
      "type": "n8n-nodes-base.telegram",
      "typeVersion": 1,
      "position": [300, 300],
      "credentials": {
        "telegramBotApi": "TelegramBotToken"
      }
    },
    {
      "parameters": {
        "responseCode": 200,
        "responseData": "={\"success\": true, \"messageId\": $input.first().json.message_id, \"timestamp\": Date.now()}"
      },
      "name": "Return Response",
      "type": "n8n-nodes-base.respondToWebhook",
      "typeVersion": 1,
      "position": [500, 300]
    }
  ],
  "connections": {
    "Webhook": {
      "main": [[{"node": "Send Telegram Message", "branch": 0}]]
    },
    "Send Telegram Message": {
      "main": [[{"node": "Return Response", "branch": 0}]]
    }
  }
}
```

---

## Testing n8n Workflows

### Using cURL

```bash
# Test Send Email
curl -X POST http://localhost:5678/webhook/send-email \
  -H "Content-Type: application/json" \
  -d '{
    "template": "welcome",
    "subject": "Test Email",
    "body": "This is a test email",
    "recipientField": "leadEmail",
    "context": {
      "ruleId": "test123",
      "leadEmail": "test@example.com"
    }
  }'

# Test Send WhatsApp
curl -X POST http://localhost:5678/webhook/send-whatsapp \
  -H "Content-Type: application/json" \
  -d '{
    "template": "test",
    "messageBody": "Hello from automation!",
    "recipientField": "leadPhone",
    "includePropertyDetails": false,
    "includeContactName": false,
    "context": {
      "ruleId": "test456",
      "leadPhone": "+20123456789"
    }
  }'
```

### Using n8n UI

1. Open workflow
2. Click "Test"
3. Provide sample payload
4. Click "Execute"
5. Check output in "Test output" tab

---

## n8n Credentials Setup

### Sendgrid

1. In n8n, go to Settings → Credentials
2. Create new Sendgrid credential
3. Paste your Sendgrid API key (from <https://app.sendgrid.com/settings/api_keys>)
4. Set "From Email" to your Sendgrid verified sender email
5. Save

### Twilio

1. In n8n, go to Settings → Credentials
2. Create new Twilio credential
3. Add Account SID and Auth Token from <https://console.twilio.com>
4. Save

### Telegram

1. Create Telegram bot via @BotFather in Telegram
2. In n8n, create Telegram Bot credential
3. Paste bot token received from @BotFather
4. Save

---

## Webhook Error Handling

Add error handling to catch and log failures:

```json
{
  "name": "Error Handler",
  "type": "n8n-nodes-base.code",
  "parameters": {
    "javaScriptCode": "if ($input.first().json.error) {\n  return {\n    success: false,\n    error: $input.first().json.error.message,\n    ruleId: $input.first().json.context?.ruleId,\n    timestamp: Date.now()\n  };\n}\nreturn $input.first().json;"
  }
}
```

---

## Performance Tips

1. **Use Sendgrid templates** instead of building HTML in code
2. **Batch Telegram/WhatsApp messages** with delays to avoid rate limits
3. **Cache credential credentials** in n8n to avoid repeated lookups
4. **Set webhook timeouts** to 30-60 seconds
5. **Monitor execution logs** in n8n dashboard

---

## Monitoring Webhooks

```bash
# View recent webhook calls (if logging enabled)
# In n8n Console/Logs section

# Monitor from Firestore
# Check automation_execution_logs collection for failed actions

# Check n8n dashboard
# Settings → Webhooks → View recent calls
```

---

## Troubleshooting

| Issue | Solution |
| ------- | ---------- |
| 404 Not Found | Webhook path doesn't match configuration |
| 500 Internal Server | Check n8n logs for execution errors |
| Timeout | Increase timeout in webhook settings or optimize workflow |
| Auth failed | Verify credentials are set up correctly |
| Empty response | Check that Respond to Webhook node is configured |

---

**Created:** July 4, 2026  
**Status:** Ready for deployment  
**Version:** 1.0.0

For more details, see: `AUTOMATION_IMPLEMENTATION_GUIDE.md`
