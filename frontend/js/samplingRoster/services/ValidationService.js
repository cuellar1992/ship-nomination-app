/**
 * Validation Service for Sampling Roster System
 */

import { SAMPLING_ROSTER_CONSTANTS } from '../utils/Constants.js';
import DateUtils from '../utils/DateUtils.js';

export class ValidationService {
  /**
   * Validar secuencia de fechas (Start Discharge → ETC)
   */
  static validateDateTimeSequence(startDischarge, etcTime) {
    if (startDischarge && etcTime && etcTime < startDischarge) {
      return {
        isValid: false,
        message: 'ETC should be after Start Discharge time'
      };
    }

    return {
      isValid: true,
      message: 'DateTime sequence validation passed'
    };
  }

  /**
   * Validar discharge time hours
   */
  static validateDischargeTimeHours(hours) {
    if (!hours || isNaN(hours) || hours <= SAMPLING_ROSTER_CONSTANTS.OFFICE_SAMPLING_HOURS) {
      return {
        isValid: false,
        message: `Discharge Time (Hrs) must be greater than ${SAMPLING_ROSTER_CONSTANTS.OFFICE_SAMPLING_HOURS} hours`
      };
    }

    if (!Number.isInteger(hours)) {
      return {
        isValid: false,
        message: 'Discharge Time must be a whole number'
      };
    }

    return {
      isValid: true,
      message: 'Discharge time validation passed'
    };
  }

  /**
   * Validar horas totales de un sampler (máximo 12h)
   */
  static validateSamplerTotalHours(samplerName, officeData, lineData, excludeRowId = null) {
    let totalHours = 0;

    // Horas en Office Sampling
    if (officeData && officeData.samplerName === samplerName) {
      totalHours += officeData.hours || 0;
    }

    // Horas en Line Sampling (excluyendo fila editada)
    if (lineData && Array.isArray(lineData)) {
      lineData.forEach((turn, index) => {
        const currentRowId = `line-sampler-row-${index}`;
        
        if (currentRowId !== excludeRowId && turn.samplerName === samplerName) {
          totalHours += turn.hours || 0;
        }
      });
    }

    const isValid = totalHours <= SAMPLING_ROSTER_CONSTANTS.MAX_SAMPLER_HOURS;

    return {
      isValid: isValid,
      totalHours: totalHours,
      message: isValid 
        ? 'Sampler hours validation passed' 
        : `${samplerName} would exceed ${SAMPLING_ROSTER_CONSTANTS.MAX_SAMPLER_HOURS} hours limit (${totalHours}h total)`
    };
  }

  /**
   * Validar que ship nomination esté seleccionado
   */
  static validateShipNominationSelected(selectedShipNomination) {
    if (!selectedShipNomination) {
      return {
        isValid: false,
        message: SAMPLING_ROSTER_CONSTANTS.MESSAGES.NO_SHIP_NOMINATION
      };
    }

    return {
      isValid: true,
      message: 'Ship nomination validation passed'
    };
  }

  /**
   * Validar que Office Sampling exista
   */
   static validateOfficeSamplingExists() {
    const officeRow = document.querySelector('tr[data-row-id="office-sampler-row"]');
    
    if (!officeRow) {
      return {
        isValid: false,
        message: 'Office Sampling must be loaded first. Please select a ship nomination.'
      };
    }

    return {
      isValid: true,
      message: 'Office Sampling validation passed'
    };
  }

  /**
   * 🆕 VALIDACIÓN CRUZADA: Verificar disponibilidad de sampler entre rosters
   */
  static async validateSamplerAvailability(samplerName, startTime, finishTime, excludeRosterId = null) {
    try {
      Logger.debug("Validating sampler availability", {
        module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
        data: {
          samplerName: samplerName,
          startTime: DateUtils.formatDateTime(startTime),
          finishTime: DateUtils.formatDateTime(finishTime),
          excludeRosterId: excludeRosterId,
        },
        showNotification: false,
      });

      // Obtener semana de trabajo (lunes a domingo)
      const weekInfo = this.getWorkWeekBounds(startTime);
      
      // Cargar todos los rosters activos de la semana
      const activeRosters = await this.loadActiveRostersForWeek(weekInfo.weekStart);
      
      // Verificar conflictos para el sampler específico
      const conflicts = this.findSamplerConflicts(
        samplerName, 
        startTime, 
        finishTime, 
        activeRosters, 
        excludeRosterId
      );

      // Validar descanso mínimo (10h)
      const restValidation = this.validateMinimumRest(
        samplerName, 
        startTime, 
        finishTime, 
        activeRosters, 
        excludeRosterId
      );

      const isAvailable = conflicts.length === 0 && restValidation.isValid;

      const result = {
        isAvailable: isAvailable,
        conflicts: conflicts,
        restValidation: restValidation,
        weekInfo: weekInfo,
        totalActiveRosters: activeRosters.length,
      };

      Logger.debug("Sampler availability validation completed", {
        module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
        data: {
          samplerName: samplerName,
          isAvailable: isAvailable,
          conflictsFound: conflicts.length,
          restViolation: !restValidation.isValid,
        },
        showNotification: false,
      });

      return result;
    } catch (error) {
      Logger.error("Error validating sampler availability", {
        module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
        error: error,
        showNotification: false,
      });

      return {
        isAvailable: true, // Fallback: asumir disponible si hay error
        conflicts: [],
        restValidation: { isValid: true, message: "" },
        error: error.message,
      };
    }
  }

  /**
   * 🆕 Cargar rosters activos para una semana específica
   */
  static async loadActiveRostersForWeek(weekStartDate) {
    try {
      // Calcular rango de fechas de la semana
      const weekStart = new Date(weekStartDate);
      const weekEnd = new Date(weekStartDate);
      weekEnd.setDate(weekEnd.getDate() + 6); // Domingo

      Logger.debug("Loading active rosters for week", {
        module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
        data: {
          weekStart: DateUtils.formatDateTime(weekStart),
          weekEnd: DateUtils.formatDateTime(weekEnd),
        },
        showNotification: false,
      });

      // TODO: Implementar endpoint específico
      // Por ahora, usar endpoint general y filtrar
      const response = await fetch("/api/sampling-rosters");
      const result = await response.json();

      if (!result.success || !result.data) {
        throw new Error("Failed to load rosters");
      }

      // Filtrar rosters que se superponen con la semana
      const activeRosters = result.data.filter(roster => {
        if (!roster.startDischarge || !roster.etcTime) return false;

        const rosterStart = new Date(roster.startDischarge);
        const rosterEnd = new Date(roster.etcTime);

        // Verificar si el roster se superpone con la semana
        return !(rosterEnd < weekStart || rosterStart > weekEnd);
      });

      Logger.debug("Active rosters loaded and filtered", {
        module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
        data: {
          totalRosters: result.data.length,
          activeInWeek: activeRosters.length,
        },
        showNotification: false,
      });

      return activeRosters;
    } catch (error) {
      Logger.error("Error loading active rosters", {
        module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
        error: error,
        showNotification: false,
      });

      return []; // Fallback: array vacío
    }
  }

  /**
   * 🆕 Encontrar conflictos de tiempo para un sampler específico
   */
  static findSamplerConflicts(samplerName, startTime, finishTime, activeRosters, excludeRosterId) {
    const conflicts = [];

    activeRosters.forEach(roster => {
      // Excluir el roster actual (para ediciones)
      if (excludeRosterId && roster._id === excludeRosterId) {
        return;
      }

      // Verificar Office Sampling
      if (roster.officeSampling && roster.officeSampling.sampler.name === samplerName) {
        const officeStart = new Date(roster.officeSampling.startTime);
        const officeEnd = new Date(roster.officeSampling.finishTime);

        if (this.timeSlotOverlaps(startTime, finishTime, officeStart, officeEnd)) {
          conflicts.push({
            type: "office",
            rosterId: roster._id,
            vesselName: roster.vesselName,
            conflictStart: officeStart,
            conflictEnd: officeEnd,
            hours: roster.officeSampling.hours,
          });
        }
      }

      // Verificar Line Sampling
      if (roster.lineSampling && Array.isArray(roster.lineSampling)) {
        roster.lineSampling.forEach((turn, index) => {
          if (turn.sampler.name === samplerName) {
            const turnStart = new Date(turn.startTime);
            const turnEnd = new Date(turn.finishTime);

            if (this.timeSlotOverlaps(startTime, finishTime, turnStart, turnEnd)) {
              conflicts.push({
                type: "line",
                rosterId: roster._id,
                vesselName: roster.vesselName,
                conflictStart: turnStart,
                conflictEnd: turnEnd,
                hours: turn.hours,
                turnOrder: turn.turnOrder || index,
              });
            }
          }
        });
      }
    });

    return conflicts;
  }

  /**
   * 🆕 Validar descanso mínimo entre turnos (10h)
   */
  static validateMinimumRest(samplerName, startTime, finishTime, activeRosters, excludeRosterId) {
    const minimumRestHours = SAMPLING_ROSTER_CONSTANTS.MINIMUM_REST_HOURS || 10;
    const samplerSchedule = [];

    // Recopilar todos los turnos del sampler en la semana
    activeRosters.forEach(roster => {
      if (excludeRosterId && roster._id === excludeRosterId) return;

      // Office Sampling
      if (roster.officeSampling && roster.officeSampling.sampler.name === samplerName) {
        samplerSchedule.push({
          start: new Date(roster.officeSampling.startTime),
          end: new Date(roster.officeSampling.finishTime),
          type: "office",
          vesselName: roster.vesselName,
        });
      }

      // Line Sampling
      if (roster.lineSampling && Array.isArray(roster.lineSampling)) {
        roster.lineSampling.forEach(turn => {
          if (turn.sampler.name === samplerName) {
            samplerSchedule.push({
              start: new Date(turn.startTime),
              end: new Date(turn.finishTime),
              type: "line",
              vesselName: roster.vesselName,
            });
          }
        });
      }
    });

    // Agregar el turno propuesto
    samplerSchedule.push({
      start: new Date(startTime),
      end: new Date(finishTime),
      type: "proposed",
      vesselName: "Current",
    });

    // Ordenar por tiempo de inicio
    samplerSchedule.sort((a, b) => a.start - b.start);

    // Verificar descanso entre turnos consecutivos
    for (let i = 1; i < samplerSchedule.length; i++) {
      const previousTurn = samplerSchedule[i - 1];
      const currentTurn = samplerSchedule[i];

      const restHours = DateUtils.getHoursBetween(previousTurn.end, currentTurn.start);

      if (restHours < minimumRestHours) {
        return {
          isValid: false,
          message: `Insufficient rest time between shifts (${restHours}h < ${minimumRestHours}h required)`,
          violatingShifts: {
            previous: {
              end: previousTurn.end,
              vesselName: previousTurn.vesselName,
              type: previousTurn.type,
            },
            current: {
              start: currentTurn.start,
              vesselName: currentTurn.vesselName,
              type: currentTurn.type,
            },
          },
          actualRestHours: restHours,
          requiredRestHours: minimumRestHours,
        };
      }
    }

    return {
      isValid: true,
      message: "Minimum rest time requirements met",
      totalShifts: samplerSchedule.length,
    };
  }

  /**
   * 🆕 Verificar si dos franjas horarias se superponen
   */
  static timeSlotOverlaps(start1, end1, start2, end2) {
    const s1 = new Date(start1);
    const e1 = new Date(end1);
    const s2 = new Date(start2);
    const e2 = new Date(end2);

    // No hay superposición si uno termina antes de que empiece el otro
    return !(e1 <= s2 || e2 <= s1);
  }

  /**
   * 🆕 Obtener límites de semana laboral (lunes a domingo)
   */
  static getWorkWeekBounds(referenceDate) {
    const date = new Date(referenceDate);
    
    // Encontrar el lunes de la semana
    const dayOfWeek = date.getDay(); // 0=domingo, 1=lunes, ..., 6=sábado
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Si es domingo, retroceder 6 días
    
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() + mondayOffset);
    weekStart.setHours(0, 0, 0, 0);
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6); // Domingo
    weekEnd.setHours(23, 59, 59, 999);

    return {
      weekStart: weekStart,
      weekEnd: weekEnd,
      weekNumber: this.getWeekNumber(weekStart),
    };
  }

  /**
   * 🆕 Obtener número de semana del año
   */
  static getWeekNumber(date) {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  }

  /**
   * 🆕 Encontrar samplers disponibles para una franja horaria
   */
  static async findAvailableSamplers(startTime, finishTime, allSamplers, excludeRosterId = null) {
    const availableSamplers = [];

    for (const sampler of allSamplers) {
      const availability = await this.validateSamplerAvailability(
        sampler.name,
        startTime,
        finishTime,
        excludeRosterId
      );

      if (availability.isAvailable) {
        availableSamplers.push({
          sampler: sampler,
          availability: availability,
        });
      }
    }

    Logger.debug("Available samplers found", {
      module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
      data: {
        totalSamplers: allSamplers.length,
        availableSamplers: availableSamplers.length,
        timeSlot: `${DateUtils.formatDateTime(startTime)} - ${DateUtils.formatDateTime(finishTime)}`,
      },
      showNotification: false,
    });

    return availableSamplers;
  }
}

export default ValidationService;