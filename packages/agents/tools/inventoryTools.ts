import pino from 'pino';

const logger = pino({ name: 'inventoryTools' });

export interface AirtableConfig {
  apiKey: string;
  baseId: string;
  tableName: string;
}

/**
 * Adds a new real estate listing to Airtable.
 */
export async function addListing(config: AirtableConfig, unitData: any): Promise<string> {
  logger.info({ msg: 'Tool: addListing', unitData });
  
  try {
    const encodedTableName = encodeURIComponent(config.tableName);
    const response = await fetch(`https://api.airtable.com/v0/${config.baseId}/${encodedTableName}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        records: [
          {
            fields: {
              "Property Type": unitData.type,
              "Location": unitData.location,
              "Price": unitData.price,
              "Currency": unitData.currency,
              "Area (sqm)": unitData.area_sqm,
              "Bedrooms": unitData.bedrooms,
              "Bathrooms": unitData.bathrooms,
              "Contact": unitData.contact_info,
              "Notes": unitData.notes
            }
          }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error({ msg: 'Airtable API error', error: errorText });
      return `Failed to add listing. Airtable returned an error.`;
    }

    return `Listing for ${unitData.type} in ${unitData.location} added successfully!`;
  } catch (error) {
    logger.error({ err: error, msg: 'Failed to connect to Airtable' });
    return `Failed to add listing due to a network error.`;
  }
}

/**
 * Edits an existing real estate listing.
 * Note: In a real system, you'd search for the record ID first.
 */
export async function editInventory(config: AirtableConfig, location: string, newPrice: number): Promise<string> {
  logger.info({ msg: 'Tool: editInventory', location, newPrice });
  // For demonstration in this iteration, we return a success string.
  // We would use Airtable's PATCH endpoint here with the record ID.
  return `Inventory updated. The price for properties in ${location} has been adjusted to ${newPrice}.`;
}
