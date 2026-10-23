"""
Vertex AI Tool Declarations & Registry.
"""
from vertexai.generative_models import FunctionDeclaration, Tool

save_listing_func = FunctionDeclaration(
    name="save_listing",
    description="Saves a newly extracted property listing to the Sierra Estates CRM database.",
    parameters={
        "type": "OBJECT",
        "properties": {
            "compound": {"type": "STRING", "description": "The name of the compound or location"},
            "price": {"type": "NUMBER", "description": "The price of the property in EGP"},
            "bedrooms": {"type": "INTEGER", "description": "Number of bedrooms"},
            "property_type": {
                "type": "STRING",
                "description": "Type of property e.g. villa, apartment, penthouse"
            },
            "contact": {"type": "STRING", "description": "Contact number or broker name"},
        },
        "required": ["compound", "price"]
    }
)

send_whatsapp_func = FunctionDeclaration(
    name="send_whatsapp_message",
    description="Sends a WhatsApp message to a specific phone number or broker group.",
    parameters={
        "type": "OBJECT",
        "properties": {
            "phone_number": {
                "type": "STRING",
                "description": "The destination phone number or group ID"
            },
            "message": {"type": "STRING", "description": "The text message content"},
        },
        "required": ["phone_number", "message"]
    }
)

query_crm_func = FunctionDeclaration(
    name="query_crm_listings",
    description="Queries the Sierra Estates database for matching properties by location or budget.",
    parameters={
        "type": "OBJECT",
        "properties": {
            "location": {
                "type": "STRING",
                "description": "Location or compound name to search for"
            },
            "max_price": {"type": "NUMBER", "description": "Maximum budget in EGP"},
            "bedrooms": {"type": "INTEGER", "description": "Required number of bedrooms"},
        },
        "required": []
    }
)

# Combined Tool object containing all declarations
vertex_tools = Tool(
    function_declarations=[
        save_listing_func,
        send_whatsapp_func,
        query_crm_func,
    ]
)
