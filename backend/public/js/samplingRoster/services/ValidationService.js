/**
 * Validation Service for Sampling Roster System
 * ✅ CORREGIDO: Límites semanales, turnos en memoria, integración con generación
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
   * 🆕 Validar límite semanal de un sampler específico
   */
  static async validateSamplerWeeklyLimit(samplerName, proposedHours, referenceDate, turnsInMemory = null, excludeRosterId = null) {
    try {
      // Verificar si el sampler tiene límite semanal
      const weeklyLimit = SAMPLING_ROSTER_CONSTANTS.SAMPLER_LIMITS.WEEKLY_LIMITS[samplerName];
      
      if (!weeklyLimit) {
        // Sampler sin límite semanal
        return {
          isValid: true,
          hasWeeklyLimit: false,
          samplerName: samplerName,
          message: `${samplerName} has no weekly limit`,
        };
      }

      Logger.debug("Validating weekly limit", {
        module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
        data: {
          samplerName: samplerName,
          proposedHours: proposedHours,
          weeklyLimit: weeklyLimit,
          referenceDate: DateUtils.formatDateTime(referenceDate),
        },
        showNotification: false,
      });

      // Calcular límites de la semana laboral
      const weekBounds = this.getWorkWeekBounds(referenceDate);

      // Calcular horas ya asignadas en la semana
      const currentWeeklyHours = await this.calculateSamplerWeeklyHours(
        samplerName, 
        weekBounds.weekStart, 
        weekBounds.weekEnd,
        turnsInMemory,
        excludeRosterId
      );

      const totalHours = currentWeeklyHours + proposedHours;
      const isValid = totalHours <= weeklyLimit;
      const remainingHours = weeklyLimit - currentWeeklyHours;

      const result = {
        isValid: isValid,
        hasWeeklyLimit: true,
        samplerName: samplerName,
        currentWeeklyHours: currentWeeklyHours,
        proposedHours: proposedHours,
        totalHours: totalHours,
        weeklyLimit: weeklyLimit,
        remainingHours: Math.max(0, remainingHours),
        weekBounds: weekBounds,
        message: isValid 
          ? `${samplerName} weekly limit OK (${totalHours}h/${weeklyLimit}h)`
          : `${samplerName} would exceed weekly limit (${totalHours}h > ${weeklyLimit}h)`,
      };

      Logger.debug("Weekly limit validation completed", {
        module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
        data: {
          samplerName: samplerName,
          isValid: isValid,
          currentWeeklyHours: currentWeeklyHours,
          totalAfterProposed: totalHours,
          weeklyLimit: weeklyLimit,
        },
        showNotification: false,
      });

      return result;

    } catch (error) {
      Logger.error("Error validating weekly limit", {
        module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
        error: error,
        data: { samplerName, proposedHours },
        showNotification: false,
      });

      return {
        isValid: true, // Fallback: permitir si hay error
        hasWeeklyLimit: false,
        error: error.message,
        message: `Error validating weekly limit for ${samplerName}, allowing by default`,
      };
    }
  }

  /**
   * 🆕 Validar sampler para generación de turnos (considera turnos en memoria)
   */
  static async validateSamplerForGeneration(samplerName, startTime, finishTime, turnsInMemory, officeData, excludeRosterId = null) {
    const validations = {
      weekly: null,
      rest: { isValid: true, message: "Rest period OK" },
      crossRoster: { isAvailable: true, message: "No conflicts" },
      overall: { isValid: false, message: "" }
    };

    try {
      const endTime = new Date(finishTime);
      const turnHours = DateUtils.getHoursBetween(startTime, endTime);

      // 1. VALIDACIÓN SEMANAL (si aplica)
      validations.weekly = await this.validateSamplerWeeklyLimit(
        samplerName,
        turnHours,
        startTime,
        { officeData, turnsInMemory },
        excludeRosterId
      );

      // 2. VALIDACIÓN DE DESCANSO (10h mínimo) - considera turnos en memoria
      const restValidation = await this.validateMinimumRestWithMemory(
        samplerName,
        startTime,
        finishTime,
        turnsInMemory,
        officeData,
        excludeRosterId
      );
      validations.rest = restValidation;

      // 3. VALIDACIÓN CRUZADA (otros rosters)
      validations.crossRoster = await this.validateSamplerAvailability(
        samplerName,
        startTime,
        finishTime,
        excludeRosterId
      );

      // 4. VALIDACIÓN GENERAL
      const allValid = (!validations.weekly || validations.weekly.isValid) &&
                      validations.rest.isValid && 
                      validations.crossRoster.isAvailable;

      validations.overall = {
        isValid: allValid,
        message: allValid ? "All validations passed" : "Some validations failed",
      };

    } catch (error) {
      Logger.error("Error validating sampler for generation", {
        module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
        error: error,
        data: { samplerName, startTime: DateUtils.formatDateTime(startTime) },
        showNotification: false,
      });

      validations.overall = {
        isValid: false,
        message: `Validation error: ${error.message}`,
      };
    }

    return validations;
  }

  /**
   * 🆕 Calcular horas semanales considerando turnos en memoria
   */
  static async calculateSamplerWeeklyHours(samplerName, weekStart, weekEnd, turnsInMemory = null, excludeRosterId = null) {
    let totalWeeklyHours = 0;

    try {
      // 1. HORAS DE ROSTERS GUARDADOS EN BD
      const savedHours = await this.calculateSavedRosterHours(
        samplerName, weekStart, weekEnd, excludeRosterId
      );
      totalWeeklyHours += savedHours;

      // 2. HORAS DE TURNOS EN MEMORIA (roster actual)
      if (turnsInMemory) {
        const memoryHours = this.calculateMemoryTurnHours(
          samplerName, turnsInMemory, weekStart, weekEnd
        );
        totalWeeklyHours += memoryHours;
      }

      Logger.debug("Weekly hours calculation completed", {
        module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
        data: {
          samplerName: samplerName,
          savedHours: savedHours,
          memoryHours: turnsInMemory ? this.calculateMemoryTurnHours(samplerName, turnsInMemory, weekStart, weekEnd) : 0,
          totalWeeklyHours: totalWeeklyHours,
        },
        showNotification: false,
      });

      return totalWeeklyHours;

    } catch (error) {
      Logger.error("Error calculating weekly hours", {
        module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
        error: error,
        showNotification: false,
      });

      return 0; // Fallback: 0 horas si hay error
    }
  }

  /**
   * 🆕 Calcular horas de turnos en memoria (roster actual)
   */
  static calculateMemoryTurnHours(samplerName, turnsInMemory, weekStart, weekEnd) {
    let memoryHours = 0;

    try {
      // Horas de Office Sampling en memoria
      if (turnsInMemory.officeData && turnsInMemory.officeData.samplerName === samplerName) {
        const officeStart = DateUtils.parseDateTime(turnsInMemory.officeData.startTime);
        if (officeStart && this.isDateInRange(officeStart, weekStart, weekEnd)) {
          memoryHours += turnsInMemory.officeData.hours || 0;
        }
      }

      // Horas de Line Sampling en memoria (array de turnos generados)
      if (turnsInMemory.turnsInMemory && Array.isArray(turnsInMemory.turnsInMemory)) {
        turnsInMemory.turnsInMemory.forEach(turn => {
          if (turn.samplerName === samplerName) {
            const turnStart = DateUtils.parseDateTime(turn.startTime);
            if (turnStart && this.isDateInRange(turnStart, weekStart, weekEnd)) {
              memoryHours += turn.hours || 0;
            }
          }
        });
      }

      return memoryHours;
    } catch (error) {
      Logger.error("Error calculating memory turn hours", {
        module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
        error: error,
        showNotification: false,
      });
      return 0;
    }
  }

  /**
   * 🆕 Calcular horas de rosters guardados en BD
   */
  static async calculateSavedRosterHours(samplerName, weekStart, weekEnd, excludeRosterId) {
    try {
      // Cargar rosters activos de la semana
      const activeRosters = await this.loadActiveRostersForWeek(weekStart);
      let savedHours = 0;

      activeRosters.forEach(roster => {
        // Excluir roster actual si se especifica
        if (excludeRosterId && roster._id === excludeRosterId) {
          return;
        }

        // Contar horas en Office Sampling
        if (roster.officeSampling && roster.officeSampling.sampler.name === samplerName) {
          const officeStart = new Date(roster.officeSampling.startTime);
          if (this.isDateInRange(officeStart, weekStart, weekEnd)) {
            savedHours += roster.officeSampling.hours || 0;
          }
        }

        // Contar horas en Line Sampling
        if (roster.lineSampling && Array.isArray(roster.lineSampling)) {
          roster.lineSampling.forEach(turn => {
            if (turn.sampler.name === samplerName) {
              const turnStart = new Date(turn.startTime);
              if (this.isDateInRange(turnStart, weekStart, weekEnd)) {
                savedHours += turn.hours || 0;
              }
            }
          });
        }
      });

      return savedHours;
    } catch (error) {
      Logger.error("Error calculating saved roster hours", {
        module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
        error: error,
        showNotification: false,
      });
      return 0;
    }
  }

  /**
   * 🆕 Validar descanso mínimo considerando turnos en memoria
   */
  static async validateMinimumRestWithMemory(samplerName, startTime, finishTime, turnsInMemory, officeData, excludeRosterId) {
    const minimumRestHours = SAMPLING_ROSTER_CONSTANTS.MINIMUM_REST_HOURS || 10;
    const samplerSchedule = [];

    try {
      // 1. Agregar turnos de rosters guardados en BD
      const weekInfo = this.getWorkWeekBounds(startTime);
      const activeRosters = await this.loadActiveRostersForWeek(weekInfo.weekStart);

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

      // 2. Agregar Office Sampling en memoria
      if (officeData && officeData.samplerName === samplerName) {
        samplerSchedule.push({
          start: DateUtils.parseDateTime(officeData.startTime),
          end: DateUtils.parseDateTime(officeData.finishTime),
          type: "office",
          vesselName: "Current",
        });
      }

      // 3. Agregar turnos en memoria
      if (turnsInMemory && Array.isArray(turnsInMemory)) {
        turnsInMemory.forEach(turn => {
          if (turn.samplerName === samplerName) {
            samplerSchedule.push({
              start: DateUtils.parseDateTime(turn.startTime),
              end: DateUtils.parseDateTime(turn.finishTime),
              type: "line",
              vesselName: "Current",
            });
          }
        });
      }

      // 4. Agregar el turno propuesto
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

    } catch (error) {
      Logger.error("Error validating minimum rest with memory", {
        module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
        error: error,
        showNotification: false,
      });

      return {
        isValid: true, // Fallback: permitir si hay error
        message: "Error validating rest time, allowing by default",
      };
    }
  }

  /**
   * 🆕 Encontrar samplers disponibles para generación (considera turnos en memoria)
   */
  static async findAvailableSamplersForGeneration(startTime, finishTime, allSamplers, turnsInMemory, officeData, excludeRosterId = null) {
    const availableSamplers = [];

    for (const sampler of allSamplers) {
      const validations = await this.validateSamplerForGeneration(
        sampler.name,
        startTime,
        finishTime,
        turnsInMemory,
        officeData,
        excludeRosterId
      );

      if (validations.overall.isValid) {
        availableSamplers.push({
          sampler: sampler,
          validations: validations,
        });
      }
    }

    Logger.debug("Available samplers found for generation", {
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

  /**
   * VALIDACIÓN CRUZADA: Verificar disponibilidad de sampler entre rosters (ORIGINAL)
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
   * Cargar rosters activos para una semana específica (ORIGINAL)
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
   * Encontrar conflictos de tiempo para un sampler específico (ORIGINAL)
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
   * Validar descanso mínimo entre turnos (10h) (ORIGINAL)
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
   * Verificar si dos franjas horarias se superponen (ORIGINAL)
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
   * Obtener límites de semana laboral (lunes a domingo) (ORIGINAL)
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
   * Obtener número de semana del año (ORIGINAL)
   */
  static getWeekNumber(date) {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  }

  /**
   * Encontrar samplers disponibles para una franja horaria (ORIGINAL)
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

  /**
   * 🆕 Verificar si una fecha está dentro de un rango
   */
  static isDateInRange(date, rangeStart, rangeEnd) {
    return date >= rangeStart && date <= rangeEnd;
  }
}

export default ValidationService;