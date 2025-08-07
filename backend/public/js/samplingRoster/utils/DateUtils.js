/**
 * Date utilities for Sampling Roster System
 */

export class DateUtils {
  /**
   * Formatear fecha a DD/MM/YYYY HH:mm
   */
  static formatDateTime(dateValue) {
    if (!dateValue) return "";

    try {
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) return "";

      const day = date.getDate().toString().padStart(2, "0");
      const month = (date.getMonth() + 1).toString().padStart(2, "0");
      const year = date.getFullYear();
      const hours = date.getHours().toString().padStart(2, "0");
      const minutes = date.getMinutes().toString().padStart(2, "0");

      return `${day}/${month}/${year} ${hours}:${minutes}`;
    } catch (error) {
      return "";
    }
  }

  /**
   * Parsear string DD/MM/YYYY HH:mm a Date
   */
  static parseDateTime(dateTimeString) {
    if (!dateTimeString) return null;

    try {
      const [datePart, timePart] = dateTimeString.split(" ");
      const [day, month, year] = datePart.split("/");
      const [hours, minutes] = timePart.split(":");

      const date = new Date(year, month - 1, day, hours, minutes);
      return isNaN(date.getTime()) ? null : date;
    } catch (error) {
      return null;
    }
  }

  /**
   * Calcular horas entre dos fechas
   */
  static getHoursBetween(startTime, endTime) {
    const diffMs = endTime.getTime() - startTime.getTime();
    return Math.max(0, diffMs / (1000 * 60 * 60));
  }
}

export default DateUtils;