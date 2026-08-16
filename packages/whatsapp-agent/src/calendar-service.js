/**
 * Calendar & Viewing Slot Reservation Service
 * Generates direct 1-click Google Calendar / Outlook links and creates structured viewing appointments.
 */

class CalendarService {
  /**
   * Generates a 1-click Google Calendar reservation URL
   */
  generateGoogleCalendarUrl(appointment) {
    const title = encodeURIComponent(`🏡 Sierra Estates Viewing — ${appointment.clientName || 'VIP Client'} (${appointment.location || 'New Cairo'})`);
    
    // Parse viewing date or default to next day 3:00 PM UTC+2
    const startDate = this._parseStartDate(appointment.preferred_viewing);
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // 1 hour duration

    const fmt = (d) => d.toISOString().replace(/-|:|\.\d+/g, '');
    const dates = `${fmt(startDate)}/${fmt(endDate)}`;

    const details = encodeURIComponent(
      `Sierra Estates Realty — Private Property Viewing\n\n` +
      `👤 Client: ${appointment.clientName || 'Client'} (+${appointment.phone || 'N/A'})\n` +
      `📍 Location: ${appointment.location || 'New Cairo Compound'}\n` +
      `💰 Budget: ${appointment.budget || 'N/A'} ${appointment.currency || 'EGP'}\n` +
      `🛏️ Requirement: ${appointment.bedrooms || 'Any'} (${appointment.furnishing_status || 'Standard'})\n` +
      `📞 Advisor: Sierra Estates Executive Concierge (+201000000000)\n\n` +
      `Managed via Sierra Intelligence OS.`
    );

    const location = encodeURIComponent(appointment.location || 'New Cairo, Cairo Governorate, Egypt');

    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${details}&location=${location}`;
  }

  _parseStartDate(viewingString) {
    const now = new Date();
    // Default to tomorrow 4:00 PM if unspecified
    const target = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    target.setHours(16, 0, 0, 0);

    if (!viewingString) return target;

    const lower = viewingString.toLowerCase();
    if (lower.includes('today') || lower.includes('اليوم') || lower.includes('النهاردة')) {
      const today = new Date();
      today.setHours(18, 0, 0, 0);
      return today;
    }
    if (lower.includes('friday') || lower.includes('الجمعة')) {
      const diff = (5 + 7 - target.getDay()) % 7 || 7;
      target.setDate(target.getDate() + diff);
      target.setHours(15, 0, 0, 0);
      return target;
    }
    if (lower.includes('saturday') || lower.includes('السبت')) {
      const diff = (6 + 7 - target.getDay()) % 7 || 7;
      target.setDate(target.getDate() + diff);
      target.setHours(14, 0, 0, 0);
      return target;
    }

    return target;
  }
}

module.exports = new CalendarService();
