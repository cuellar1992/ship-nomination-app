/**
 * Validation Service for Sampling Roster System
 * 🚀 OPTIMIZADO: Usa cache inteligente para reducir consultas de ~200 a ~3-5
 */

import { SAMPLING_ROSTER_CONSTANTS } from "../utils/Constants.js";
import DateUtils from "../utils/DateUtils.js";
import ValidationCacheService from "./ValidationCacheService.js";
import { PerformanceTracker } from "./PerformanceMonitor.js";

export class ValidationService {
  // 🚀 Cache service para optimizar validaciones
  static cacheService = new ValidationCacheService();

  /**
   * Validar secuencia de fechas (Start Discharge → ETC)
   */
  static validateDateTimeSequence(startDischarge, etcTime) {
    if (startDischarge && etcTime && etcTime < startDischarge) {
      return {
        isValid: false,
        message: "ETC should be after Start Discharge time",
      };
    }

    return {
      isValid: true,
      message: "DateTime sequence validation passed",
    };
  }

  /**
   * Validar discharge time hours
   */
  static validateDischargeTimeHours(hours) {
    if (
      !hours ||
      isNaN(hours) ||
      hours <= SAMPLING_ROSTER_CONSTANTS.OFFICE_SAMPLING_HOURS
    ) {
      return {
        isValid: false,
        message: `Discharge Time (Hrs) must be greater than ${SAMPLING_ROSTER_CONSTANTS.OFFICE_SAMPLING_HOURS} hours`,
      };
    }

    if (!Number.isInteger(hours)) {
      return {
        isValid: false,
        message: "Discharge Time must be a whole number",
      };
    }

    return {
      isValid: true,
      message: "Discharge time validation passed",
    };
  }

  /**
   * Validar horas totales de un sampler (máximo 12h)
   */
  static validateSamplerTotalHours(
    samplerName,
    officeData,
    lineData,
    excludeRowId = null
  ) {
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
        ? "Sampler hours validation passed"
        : `${samplerName} would exceed ${SAMPLING_ROSTER_CONSTANTS.MAX_SAMPLER_HOURS} hours limit (${totalHours}h total)`,
    };
  }

  /**
   * Validar que ship nomination esté seleccionado
   */
  static validateShipNominationSelected(selectedShipNomination) {
    if (!selectedShipNomination) {
      return {
        isValid: false,
        message: SAMPLING_ROSTER_CONSTANTS.MESSAGES.NO_SHIP_NOMINATION,
      };
    }

    return {
      isValid: true,
      message: "Ship nomination validation passed",
    };
  }

  /**
   * Validar que Office Sampling exista
   */
  static validateOfficeSamplingExists() {
    const officeRow = document.querySelector(
      'tr[data-row-id="office-sampler-row"]'
    );

    if (!officeRow) {
      return {
        isValid: false,
        message:
          "Office Sampling must be loaded first. Please select a ship nomination.",
      };
    }

    return {
      isValid: true,
      message: "Office Sampling validation passed",
    };
  }

  /**
   * 🆕 Validar límite semanal de un sampler específico
   */
  static async validateSamplerWeeklyLimit(
    samplerName,
    proposedHours,
    referenceDate,
    turnsInMemory = null,
    excludeRosterId = null
  ) {
    const startTime = performance.now();
    try {
      // Verificar si el sampler tiene límite semanal
      const weeklyLimit =
        SAMPLING_ROSTER_CONSTANTS.SAMPLER_LIMITS.WEEKLY_LIMITS[samplerName];

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

      // Registrar métrica de performance
      PerformanceTracker.validation('weeklyLimit', isValid, performance.now() - startTime, {
        samplerName,
        proposedHours,
        weeklyLimit,
        currentWeeklyHours
      });

      return result;
    } catch (error) {
      Logger.error("Error validating weekly limit", {
        module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
        error: error,
        data: { samplerName, proposedHours },
        showNotification: false,
      });

      // Registrar error de performance
      PerformanceTracker.error('ValidationService', 'validateSamplerWeeklyLimit', error);

      return {
        isValid: true, // Fallback: permitir si hay error
        hasWeeklyLimit: false,
        error: error.message,
        message: `Error validating weekly limit for ${samplerName}, allowing by default`,
      };
    }
  }

  /**
   * Validar restricción de días específicos
   */
  static async validateSamplerDayRestriction(
    samplerName,
    proposedDate,
    excludeRosterId = null
  ) {
    try {
      // Obtener datos del sampler desde API
      const samplerData = await this.getSamplerData(samplerName);

      if (!samplerData || !samplerData.weekDayRestrictions) {
        return {
          isValid: true,
          hasdayRestrictions: false,
          message: `${samplerName} has no day restrictions`,
        };
      }

      // Obtener día de la semana de la fecha propuesta
      const dayOfWeek = proposedDate.getDay(); // 0=Sunday, 1=Monday, etc.
      const dayMapping = {
        0: "sunday",
        1: "monday",
        2: "tuesday",
        3: "wednesday",
        4: "thursday",
        5: "friday",
        6: "saturday",
      };

      const dayName = dayMapping[dayOfWeek];
      const isDayRestricted = samplerData.weekDayRestrictions[dayName] || false;

      // 🔍 DEBUG: Log de validación de días
      Logger.debug("Day restriction validation", {
        module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
        data: {
          samplerName: samplerName,
          proposedDate: proposedDate.toISOString(),
          dayOfWeek: dayOfWeek,
          dayName: dayName,
          weekDayRestrictions: samplerData.weekDayRestrictions,
          isDayRestricted: isDayRestricted,
          isValid: !isDayRestricted
        },
        showNotification: false,
      });

      return {
        isValid: !isDayRestricted,
        hasDataRestrictions: true,
        restrictedDay: dayName,
        isRestrictedDay: isDayRestricted,
        samplerName: samplerName,
        proposedDate: proposedDate,
        message: isDayRestricted
          ? `${samplerName} is not available on ${dayName}s`
          : `${samplerName} is available on ${dayName}s`,
      };
    } catch (error) {
      Logger.error("Error validating day restriction", {
        module: "ValidationService",
        error: error,
        showNotification: false,
      });

      // Registrar error de performance
      PerformanceTracker.error('ValidationService', 'validateSamplerDayRestriction', error);

      return {
        isValid: true, // Fallback: permitir si hay error
        hasDataRestrictions: false,
        error: error.message,
        message: `Error validating day restriction for ${samplerName}, allowing by default`,
      };
    }
  }

  /**
   * Obtener datos completos de un sampler
   */
  static async getSamplerData(samplerName) {
    try {
      // Intentar desde APIManager primero
      if (window.simpleShipForm?.getApiManager) {
        const apiManager = window.simpleShipForm.getApiManager();
        const samplerData = apiManager.samplersFullData?.find(
          (s) => s.name === samplerName
        );
        if (samplerData) return samplerData;
      }

      // Fallback: consulta directa a API
      const response = await fetch("/api/samplers");
      const result = await response.json();

      if (result.success && result.data) {
        const foundSampler = result.data.find((s) => s.name === samplerName);
        
        // 🔍 DEBUG: Log de datos obtenidos del sampler
        Logger.debug("Sampler data retrieved from API", {
          module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
          data: {
            samplerName: samplerName,
            found: !!foundSampler,
            data: foundSampler,
            weekDayRestrictions: foundSampler?.weekDayRestrictions
          },
          showNotification: false,
        });
        
        return foundSampler;
      }

      return null;
    } catch (error) {
      Logger.error("Error getting sampler data", {
        module: "ValidationService",
        error: error,
        showNotification: false,
      });

      // Registrar error de performance
      PerformanceTracker.error('ValidationService', 'getSamplerData', error);

      return null;
    }
  }

  /**
   * 🚀 OPTIMIZADO: Validar sampler usando cache (0 consultas BD)
   */
  static async validateSamplerForGenerationWithCache(
    samplerName,
    startTime,
    finishTime,
    turnsInMemory,
    officeData,
    cacheData,
    excludeRosterId = null
  ) {
    const validations = {
      weekly: null,
      dayRestriction: null,
      rest: { isValid: true, message: "Rest period OK" },
      crossRoster: { isAvailable: true, message: "No conflicts" },
      pobConflict: { isValid: true, message: "No POB conflicts" },
      overall: { isValid: false, message: "" },
    };

    try {
      const endTime = new Date(finishTime);
      const turnHours = DateUtils.getHoursBetween(startTime, endTime);

      // 🚀 PASO 1: Obtener validaciones del cache (0 consultas BD)
      const cachedValidations = cacheData.validationData[samplerName] || null;
      // Si no hay validaciones específicas por nombre, construir vistas derivadas desde la estructura general
      // para no romper el flujo y evitar fallback innecesario.
      if (!cachedValidations) {
        // Derivar estructuras mínimas no bloqueantes desde datos agregados
        validations.weekly = { isValid: true, hasWeeklyLimit: false, message: `${samplerName} has no weekly limit (no cached entry)` };
        validations.dayRestriction = { isValid: true, hasDayRestrictions: false, message: `${samplerName} has no day restrictions (no cached entry)` };
        validations.rest = { isValid: true, message: "Rest period OK (no cached entry)" };
        validations.crossRoster = { isAvailable: true, message: "No conflicts (no cached entry)" };
        validations.pobConflict = { isValid: true, message: "No POB conflicts (no cached entry)" };
        validations.overall = { isValid: true, message: "Assuming valid (no cached entry)" };
        return validations;
      }

      // 🚀 PASO 2: Validar límite semanal usando cache
      validations.weekly = this.validateWeeklyLimitWithCache(
        samplerName,
        turnHours,
        startTime,
        turnsInMemory,
        cachedValidations.weekly
      );

      // 🚀 PASO 3: Validar restricción de días usando cache
      validations.dayRestriction = this.validateDayRestrictionWithCache(
        samplerName,
        startTime,
        cachedValidations.dayRestrictions
      );

      // 🚀 PASO 4: Validar descanso usando cache
      validations.rest = this.validateRestWithCache(
        samplerName,
        startTime,
        finishTime,
        turnsInMemory,
        officeData,
        cachedValidations.restValidation,
        cacheData.activeRosters
      );

      // 🚀 PASO 5: Validar conflictos de tiempo usando cache
      validations.crossRoster = this.validateTimeConflictsWithCache(
        samplerName,
        startTime,
        finishTime,
        cachedValidations.conflicts
      );

      // 🚀 PASO 6: Validar conflictos POB usando cache
      validations.pobConflict = this.validatePOBConflictsWithCache(
        samplerName,
        startTime,
        finishTime,
        cachedValidations.pobConflicts
      );

      // 🚀 PASO 7: Validación general
      const allValid =
        validations.weekly.isValid &&
        validations.dayRestriction.isValid &&
        validations.rest.isValid &&
        validations.crossRoster.isAvailable &&
        validations.pobConflict.isValid;

      validations.overall = {
        isValid: allValid,
        message: allValid
          ? "All validations passed (using cache)"
          : "Some validations failed (using cache)",
      };

      Logger.debug("Sampler validation completed using cache", {
        module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
        data: {
          samplerName,
          cacheUsed: true,
          allValidationsPassed: allValid,
        },
        showNotification: false,
      });

    } catch (error) {
      Logger.error("Error validating sampler with cache", {
        module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
        error: error,
        data: { samplerName, startTime: DateUtils.formatDateTime(startTime) },
        showNotification: false,
      });

      // Registrar error de performance
      PerformanceTracker.error('ValidationService', 'validateSamplerForGenerationWithCache', error);

      validations.overall = {
        isValid: false,
        message: `Cache validation error: ${error.message}`,
      };
    }

    return validations;
  }

  /**
   * 🆕 Validar sampler para generación de turnos (considera turnos en memoria)
   * MANTENIDO PARA COMPATIBILIDAD Y FALLBACK
   */
  static async validateSamplerForGeneration(
    samplerName,
    startTime,
    finishTime,
    turnsInMemory,
    officeData,
    excludeRosterId = null
  ) {
    const validations = {
      weekly: null,
      rest: { isValid: true, message: "Rest period OK" },
      crossRoster: { isAvailable: true, message: "No conflicts" },
      overall: { isValid: false, message: "" },
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

      // 1.5. VALIDACIÓN DE DÍAS ESPECÍFICOS
      validations.dayRestriction = await this.validateSamplerDayRestriction(
        samplerName,
        startTime,
        excludeRosterId
      );

      // 🔍 DEBUG: Log de validación de días en generación
      console.log(`🔍 DAY RESTRICTION in validateSamplerForGeneration for ${samplerName}:`, {
        dayRestriction: validations.dayRestriction,
        startTime: startTime.toISOString()
      });

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

      // 4. 🆕 VALIDACIÓN POB (ship nominations)
      validations.pobConflict = await this.validateAgainstFutureNominations(
        samplerName,
        startTime,
        finishTime,
        excludeRosterId
      );

      // 5. VALIDACIÓN GENERAL
      const allValid =
        (!validations.weekly || validations.weekly.isValid) &&
        validations.rest.isValid &&
        validations.crossRoster.isAvailable &&
        validations.pobConflict.isValid &&
        validations.dayRestriction.isValid;

      validations.overall = {
        isValid: allValid,
        message: allValid
          ? "All validations passed"
          : "Some validations failed",
      };
    } catch (error) {
      Logger.error("Error validating sampler for generation", {
        module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
        error: error,
        data: { samplerName, startTime: DateUtils.formatDateTime(startTime) },
        showNotification: false,
      });

      // Registrar error de performance
      PerformanceTracker.error('ValidationService', 'validateSamplerForGeneration', error);

      validations.overall = {
        isValid: false,
        message: `Validation error: ${error.message}`,
      };
    }

    return validations;
  }

  /**
   * 🚀 Validar límite semanal usando cache (0 consultas BD)
   */
  static validateWeeklyLimitWithCache(
    samplerName,
    proposedHours,
    startTime,
    turnsInMemory,
    cachedWeeklyData
  ) {
    if (!cachedWeeklyData.hasWeeklyLimit) {
      return {
        isValid: true,
        hasWeeklyLimit: false,
        message: `${samplerName} has no weekly limit`,
      };
    }

    // Calcular horas de turnos en memoria para la semana
    let memoryHours = 0;
    if (turnsInMemory) {
      memoryHours = this.calculateMemoryTurnHours(
        samplerName,
        turnsInMemory,
        startTime,
        startTime // Usar startTime como referencia para la semana
      );
    }

    const totalHours = cachedWeeklyData.currentWeeklyHours + memoryHours + proposedHours;
    const isValid = totalHours <= cachedWeeklyData.weeklyLimit;
    const remainingHours = Math.max(0, cachedWeeklyData.weeklyLimit - (cachedWeeklyData.currentWeeklyHours + memoryHours));

    return {
      isValid: isValid,
      hasWeeklyLimit: true,
      currentWeeklyHours: cachedWeeklyData.currentWeeklyHours + memoryHours,
      proposedHours: proposedHours,
      totalHours: totalHours,
      weeklyLimit: cachedWeeklyData.weeklyLimit,
      remainingHours: remainingHours,
      message: isValid
        ? `${samplerName} weekly limit OK (${totalHours}h/${cachedWeeklyData.weeklyLimit}h)`
        : `${samplerName} would exceed weekly limit (${totalHours}h > ${cachedWeeklyData.weeklyLimit}h)`,
    };
  }

  /**
   * 🚀 Validar restricción de días usando cache (0 consultas BD)
   */
  static validateDayRestrictionWithCache(
    samplerName,
    proposedDate,
    cachedDayRestrictions
  ) {
    if (!cachedDayRestrictions.hasDayRestrictions) {
      return {
        isValid: true,
        hasDayRestrictions: false,
        message: `${samplerName} has no day restrictions`,
      };
    }

    const dayOfWeek = proposedDate.getDay();
    const dayMapping = {
      0: "sunday",
      1: "monday",
      2: "tuesday",
      3: "wednesday",
      4: "thursday",
      5: "friday",
      6: "saturday",
    };

    const dayName = dayMapping[dayOfWeek];
    const isDayRestricted = cachedDayRestrictions.restrictions[dayName] || false;

    return {
      isValid: !isDayRestricted,
      hasDayRestrictions: true,
      restrictedDay: dayName,
      isRestrictedDay: isDayRestricted,
      message: isDayRestricted
        ? `${samplerName} is not available on ${dayName}s`
        : `${samplerName} is available on ${dayName}s`,
    };
  }

  /**
   * 🚀 Validar descanso usando cache (0 consultas BD)
   */
  static validateRestWithCache(
    samplerName,
    startTime,
    finishTime,
    turnsInMemory,
    officeData,
    cachedRestData,
    activeRosters
  ) {
    const minimumRestHours = SAMPLING_ROSTER_CONSTANTS.MINIMUM_REST_HOURS || 10;
    const samplerSchedule = [...cachedRestData.schedule]; // Copiar del cache

    // Agregar Office Sampling en memoria si aplica
    if (officeData && officeData.samplerName === samplerName) {
      samplerSchedule.push({
        start: this.parseLocalDateTime(officeData.startTime),
        end: this.parseLocalDateTime(officeData.finishTime),
        type: "office",
        vesselName: "Current",
      });
    }

    // Agregar turnos en memoria
    if (turnsInMemory && Array.isArray(turnsInMemory)) {
      turnsInMemory.forEach((turn) => {
        if (turn.samplerName === samplerName) {
          samplerSchedule.push({
            start: this.parseLocalDateTime(turn.startTime),
            end: this.parseLocalDateTime(turn.finishTime),
            type: "line",
            vesselName: "Current",
          });
        }
      });
    }

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

      // Solo validar si al menos uno es el turno propuesto
      if (previousTurn.type !== "proposed" && currentTurn.type !== "proposed") {
        continue;
      }

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
   * 🚀 Validar conflictos de tiempo usando cache (0 consultas BD)
   */
  static validateTimeConflictsWithCache(
    samplerName,
    startTime,
    finishTime,
    cachedConflicts
  ) {
    // Verificar si hay conflictos con el turno propuesto
    const hasConflict = cachedConflicts.some((conflict) => {
      return this.timeSlotOverlaps(startTime, finishTime, conflict.start, conflict.end);
    });

    if (hasConflict) {
      const conflictingShift = cachedConflicts.find((conflict) => {
        return this.timeSlotOverlaps(startTime, finishTime, conflict.start, conflict.end);
      });

      return {
        isAvailable: false,
        message: `Time conflict with existing shift`,
        conflict: conflictingShift,
      };
    }

    return {
      isAvailable: true,
      message: "No time conflicts detected",
    };
  }

  /**
   * 🚀 Validar conflictos POB usando cache (0 consultas BD)
   */
  static validatePOBConflictsWithCache(
    samplerName,
    startTime,
    finishTime,
    cachedPOBConflicts
  ) {
    // Verificar si hay conflictos POB con el turno propuesto
    const hasConflict = cachedPOBConflicts.some((conflict) => {
      const pobDate = new Date(conflict.pobStart);
      const etcDate = new Date(conflict.etcEnd);
      
      // Conflict si nomination está activa durante el turno propuesto
      return pobDate < finishTime && etcDate > startTime;
    });

    if (hasConflict) {
      const conflictingNomination = cachedPOBConflicts.find((conflict) => {
        const pobDate = new Date(conflict.pobStart);
        const etcDate = new Date(conflict.etcEnd);
        return pobDate < finishTime && etcDate > startTime;
      });

      return {
        isValid: false,
        message: `POB conflict detected`,
        conflict: {
          vessel: conflictingNomination.vessel,
          amspecRef: conflictingNomination.amspecRef,
          pobStart: this.formatLocalDateTime(conflictingNomination.pobStart),
          etcEnd: this.formatLocalDateTime(conflictingNomination.etcEnd),
          proposedStart: this.formatLocalDateTime(startTime),
          proposedEnd: this.formatLocalDateTime(finishTime),
          overlapReason: "Nomination active during proposed turn",
        },
      };
    }

    return {
      isValid: true,
      message: `No POB conflicts for ${samplerName}`,
      checkedNominations: cachedPOBConflicts.length,
    };
  }

  /**
   * 🚀 Fallback: Encontrar samplers disponibles usando validación directa
   * Solo se usa si el cache falla
   */
  static async findAvailableSamplersForGenerationFallback(
    startTime,
    finishTime,
    allSamplers,
    turnsInMemory,
    officeData,
    excludeRosterId = null
  ) {
    Logger.warn("Using fallback validation (direct API calls)", {
      module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
      data: { reason: "Cache failed, using original validation logic" },
      showNotification: false,
    });

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

    return availableSamplers;
  }

  /**
   * 🆕 Calcular horas semanales considerando turnos en memoria
   */
  static async calculateSamplerWeeklyHours(
    samplerName,
    weekStart,
    weekEnd,
    turnsInMemory = null,
    excludeRosterId = null
  ) {
    let totalWeeklyHours = 0;
    const hoursBreakdown = {
      savedRosterHours: 0,
      memoryHours: 0,
      truckLoadingHours: 0,
      otherJobsHours: 0,
    };

    try {
      // 1. HORAS DE ROSTERS GUARDADOS EN BD (Sampling Roster)
      const savedHours = await this.calculateSavedRosterHours(
        samplerName,
        weekStart,
        weekEnd,
        excludeRosterId
      );
      hoursBreakdown.savedRosterHours = savedHours;
      totalWeeklyHours += savedHours;

      // 2. HORAS DE TURNOS EN MEMORIA (roster actual)
      if (turnsInMemory) {
        const memoryHours = this.calculateMemoryTurnHours(
          samplerName,
          turnsInMemory,
          weekStart,
          weekEnd
        );
        hoursBreakdown.memoryHours = memoryHours;
        totalWeeklyHours += memoryHours;
      }

      // 3. 🆕 HORAS DE TRUCK LOADING (Módulo truck workdays)
      const truckLoadingHours = await this.calculateTruckLoadingHours(
        samplerName,
        weekStart,
        weekEnd,
        excludeRosterId
      );
      hoursBreakdown.truckLoadingHours = truckLoadingHours;
      totalWeeklyHours += truckLoadingHours;

      // 4. 🆕 HORAS DE OTHER JOBS (Módulo other jobs)
      const otherJobsHours = await this.calculateOtherJobsHours(
        samplerName,
        weekStart,
        weekEnd,
        excludeRosterId
      );
      hoursBreakdown.otherJobsHours = otherJobsHours;
      totalWeeklyHours += otherJobsHours;

      Logger.debug("✅ COMPLETE Weekly hours calculation with all modules", {
        module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
        data: {
          samplerName: samplerName,
          weekPeriod: `${weekStart.toISOString().split('T')[0]} to ${weekEnd.toISOString().split('T')[0]}`,
          breakdown: hoursBreakdown,
          totalWeeklyHours: totalWeeklyHours,
          modulesIncluded: ['SamplingRoster', 'TruckLoading', 'OtherJobs'],
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

      // Registrar error de performance
      PerformanceTracker.error('ValidationService', 'calculateSamplerWeeklyHours', error);

      return 0; // Fallback: 0 horas si hay error
    }
  }

  /**
   * 🧪 Método de testing para validar la nueva funcionalidad de límites semanales
   * Este método proporciona un desglose detallado de las horas semanales
   */
  static async testWeeklyHoursValidation(samplerName, referenceDate = new Date()) {
    try {
      const weekBounds = this.getWorkWeekBounds(referenceDate);
      
      Logger.info("🧪 TESTING: Weekly hours validation with all modules", {
        module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
        data: {
          samplerName: samplerName,
          testDate: referenceDate.toISOString(),
          weekBounds: {
            start: weekBounds.weekStart.toISOString(),
            end: weekBounds.weekEnd.toISOString(),
          },
        },
        showNotification: true,
      });

      // Calcular horas usando el nuevo método completo
      const totalHours = await this.calculateSamplerWeeklyHours(
        samplerName,
        weekBounds.weekStart,
        weekBounds.weekEnd,
        null, // no memory turns para testing
        null  // no exclusions para testing
      );

      // Obtener límite semanal si aplica
      const weeklyLimit = SAMPLING_ROSTER_CONSTANTS.SAMPLER_LIMITS.WEEKLY_LIMITS[samplerName];
      
      const testResult = {
        samplerName: samplerName,
        weekPeriod: `${weekBounds.weekStart.toISOString().split('T')[0]} to ${weekBounds.weekEnd.toISOString().split('T')[0]}`,
        totalWeeklyHours: totalHours,
        weeklyLimit: weeklyLimit || 'No limit',
        limitStatus: weeklyLimit ? (totalHours <= weeklyLimit ? 'WITHIN_LIMIT' : 'EXCEEDS_LIMIT') : 'NO_LIMIT',
        remainingHours: weeklyLimit ? Math.max(0, weeklyLimit - totalHours) : 'N/A',
        utilizationPercentage: weeklyLimit ? Math.round((totalHours / weeklyLimit) * 100) : 'N/A',
        modulesIncluded: ['SamplingRoster', 'TruckLoading', 'OtherJobs'],
      };

      Logger.success("🧪 TESTING: Weekly hours validation completed", {
        module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
        data: testResult,
        showNotification: true,
      });

      return testResult;
    } catch (error) {
      Logger.error("🧪 TESTING: Error in weekly hours validation test", {
        module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
        error: error,
        data: { samplerName, referenceDate: referenceDate?.toISOString() },
        showNotification: true,
      });

      // Registrar error de performance
      PerformanceTracker.error('ValidationService', 'testSamplerWeeklyHours', error);

      return null;
    }
  }

  /**
   * 🆕 Calcular horas de turnos en memoria (roster actual)
   */
  static calculateMemoryTurnHours(
    samplerName,
    turnsInMemory,
    weekStart,
    weekEnd
  ) {
    let memoryHours = 0;

    try {
      // Horas de Office Sampling en memoria
      if (
        turnsInMemory.officeData &&
        turnsInMemory.officeData.samplerName === samplerName
      ) {
        // 🔧 FIX: Usar parseLocalDateTime en lugar de DateUtils.parseDateTime
        const officeStart = this.parseLocalDateTime(
          turnsInMemory.officeData.startTime
        );
        if (
          officeStart &&
          this.isDateInRange(officeStart, weekStart, weekEnd)
        ) {
          memoryHours += turnsInMemory.officeData.hours || 0;
        }
      }

      // Horas de Line Sampling en memoria (array de turnos generados)
      if (
        turnsInMemory.turnsInMemory &&
        Array.isArray(turnsInMemory.turnsInMemory)
      ) {
        turnsInMemory.turnsInMemory.forEach((turn) => {
          if (turn.samplerName === samplerName) {
            // 🔧 FIX: Usar parseLocalDateTime en lugar de DateUtils.parseDateTime
            const turnStart = this.parseLocalDateTime(turn.startTime);
            if (
              turnStart &&
              this.isDateInRange(turnStart, weekStart, weekEnd)
            ) {
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

      // Registrar error de performance
      PerformanceTracker.error('ValidationService', 'calculateMemoryTurnHours', error);

      return 0;
    }
  }

  /**
   * 🆕 Calcular horas de rosters guardados en BD
   */
  static async calculateSavedRosterHours(
    samplerName,
    weekStart,
    weekEnd,
    excludeRosterId
  ) {
    try {
      // Cargar rosters activos de la semana
      const activeRosters = await this.loadActiveRostersForWeek(weekStart);
      let savedHours = 0;

      activeRosters.forEach((roster) => {
        // Excluir roster actual si se especifica
        if (excludeRosterId && roster._id === excludeRosterId) {
          return;
        }

        // Contar horas en Office Sampling
        if (
          roster.officeSampling &&
          roster.officeSampling.sampler.name === samplerName
        ) {
          const officeStart = new Date(roster.officeSampling.startTime);
          if (this.isDateInRange(officeStart, weekStart, weekEnd)) {
            savedHours += roster.officeSampling.hours || 0;
          }
        }

        // Contar horas en Line Sampling
        if (roster.lineSampling && Array.isArray(roster.lineSampling)) {
          roster.lineSampling.forEach((turn) => {
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

      // Registrar error de performance
      PerformanceTracker.error('ValidationService', 'calculateSavedRosterHours', error);

      return 0;
    }
  }

  /**
   * 🆕 Calcular horas de Truck Loading para un sampler en un período
   */
  static async calculateTruckLoadingHours(
    samplerName,
    weekStart,
    weekEnd,
    excludeRosterId = null
  ) {
    try {
      // Obtener URL base dinámicamente
      const getBaseURL = () => {
        const { hostname, protocol } = window.location;
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
          return `${protocol}//${hostname}:3000`;
        }
        return '';
      };
      
      const baseURL = getBaseURL();
      
      // Consultar truck workdays en el rango de la semana
      const fromDate = weekStart.toISOString().split('T')[0];
      const toDate = weekEnd.toISOString().split('T')[0];
      
      const response = await fetch(
        `${baseURL}/api/truckworkdays?from=${fromDate}&to=${toDate}&surveyor=${encodeURIComponent(samplerName)}`
      );
      
      if (!response.ok) {
        Logger.warn("Failed to fetch truck loading hours", {
          module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
          data: { status: response.status, samplerName },
          showNotification: false,
        });
        return 0;
      }
      
      const result = await response.json();
      const truckWorkDays = result.success && result.data ? result.data : [];
      
      let totalTruckHours = 0;
      
      truckWorkDays.forEach((workDay) => {
        // Verificar que el sampler coincida (case-insensitive)
        if (workDay.samplerName && 
            workDay.samplerName.toLowerCase() === samplerName.toLowerCase()) {
          
          // Verificar que la fecha esté en el rango de la semana
          const operationDate = new Date(workDay.operationDate);
          if (this.isDateInRange(operationDate, weekStart, weekEnd)) {
            
            // Sumar horas del shift si están disponibles
            if (workDay.shift && typeof workDay.shift.hours === 'number') {
              totalTruckHours += workDay.shift.hours;
            }
          }
        }
      });
      
      Logger.debug("Truck loading hours calculated", {
        module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
        data: {
          samplerName: samplerName,
          weekStart: weekStart.toISOString(),
          weekEnd: weekEnd.toISOString(),
          totalTruckHours: totalTruckHours,
          recordsFound: truckWorkDays.length,
        },
        showNotification: false,
      });
      
      return totalTruckHours;
    } catch (error) {
      Logger.error("Error calculating truck loading hours", {
        module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
        error: error,
        data: { samplerName, weekStart: weekStart?.toISOString(), weekEnd: weekEnd?.toISOString() },
        showNotification: false,
      });

      // Registrar error de performance
      PerformanceTracker.error('ValidationService', 'calculateTruckLoadingHours', error);

      return 0;
    }
  }

  /**
   * 🆕 Calcular horas de Other Jobs para un sampler en un período
   */
  static async calculateOtherJobsHours(
    samplerName,
    weekStart,
    weekEnd,
    excludeRosterId = null
  ) {
    try {
      // Obtener URL base dinámicamente
      const getBaseURL = () => {
        const { hostname, protocol } = window.location;
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
          return `${protocol}//${hostname}:3000`;
        }
        return '';
      };
      
      const baseURL = getBaseURL();
      
      // Consultar other jobs en el rango de la semana
      const fromDate = weekStart.toISOString().split('T')[0];
      const toDate = weekEnd.toISOString().split('T')[0];
      
      const response = await fetch(
        `${baseURL}/api/otherjobs?from=${fromDate}&to=${toDate}&surveyor=${encodeURIComponent(samplerName)}`
      );
      
      if (!response.ok) {
        Logger.warn("Failed to fetch other jobs hours", {
          module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
          data: { status: response.status, samplerName },
          showNotification: false,
        });
        return 0;
      }
      
      const result = await response.json();
      const otherJobs = result.success && result.data ? result.data : [];
      
      let totalOtherJobsHours = 0;
      
      otherJobs.forEach((job) => {
        // Verificar que el sampler coincida (case-insensitive)
        if (job.samplerName && 
            job.samplerName.toLowerCase() === samplerName.toLowerCase()) {
          
          // Verificar que la fecha esté en el rango de la semana
          const operationDate = new Date(job.operationDate);
          if (this.isDateInRange(operationDate, weekStart, weekEnd)) {
            
            // Sumar horas del shift si están disponibles
            if (job.shift && typeof job.shift.hours === 'number') {
              totalOtherJobsHours += job.shift.hours;
            }
          }
        }
      });
      
      Logger.debug("Other jobs hours calculated", {
        module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
        data: {
          samplerName: samplerName,
          weekStart: weekStart.toISOString(),
          weekEnd: weekEnd.toISOString(),
          totalOtherJobsHours: totalOtherJobsHours,
          recordsFound: otherJobs.length,
        },
        showNotification: false,
      });
      
      return totalOtherJobsHours;
    } catch (error) {
      Logger.error("Error calculating other jobs hours", {
        module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
        error: error,
        data: { samplerName, weekStart: weekStart?.toISOString(), weekEnd: weekEnd?.toISOString() },
        showNotification: false,
      });

      // Registrar error de performance
      PerformanceTracker.error('ValidationService', 'calculateOtherJobsHours', error);

      return 0;
    }
  }

  /**
   * 🆕 Validar descanso mínimo considerando turnos en memoria
   */
  static async validateMinimumRestWithMemory(
    samplerName,
    startTime,
    finishTime,
    turnsInMemory,
    officeData,
    excludeRosterId
  ) {
    const minimumRestHours = SAMPLING_ROSTER_CONSTANTS.MINIMUM_REST_HOURS || 10;
    const samplerSchedule = [];

    try {
      // 1. Agregar turnos de rosters guardados en BD
      const weekInfo = this.getWorkWeekBounds(startTime);
      // 🆕 BÚSQUEDA EXTENDIDA: Incluir semanas anteriores para detectar turnos previos
      const extendedWeekStart = new Date(weekInfo.weekStart);
      extendedWeekStart.setDate(extendedWeekStart.getDate() - 7);
      const activeRosters = await this.loadActiveRostersForExtendedPeriod(
        extendedWeekStart,
        weekInfo.weekEnd
      );

      activeRosters.forEach((roster) => {
        if (excludeRosterId && roster._id === excludeRosterId) return;

        // Office Sampling
        if (
          roster.officeSampling &&
          roster.officeSampling.sampler.name === samplerName
        ) {
          samplerSchedule.push({
            start: new Date(roster.officeSampling.startTime),
            end: new Date(roster.officeSampling.finishTime),
            type: "office",
            vesselName: roster.vesselName,
          });
        }

        // Line Sampling
        if (roster.lineSampling && Array.isArray(roster.lineSampling)) {
          roster.lineSampling.forEach((turn) => {
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
          start: this.parseLocalDateTime(officeData.startTime), // 🔧 FIX
          end: this.parseLocalDateTime(officeData.finishTime), // 🔧 FIX
          type: "office",
          vesselName: "Current",
        });
      }

      // 3. Agregar turnos en memoria
      if (turnsInMemory && Array.isArray(turnsInMemory)) {
        turnsInMemory.forEach((turn) => {
          if (turn.samplerName === samplerName) {
            samplerSchedule.push({
              start: this.parseLocalDateTime(turn.startTime), // 🔧 FIX
              end: this.parseLocalDateTime(turn.finishTime), // 🔧 FIX
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

        // 🔧 SKIP: No validar turnos históricos entre sí
        if (
          previousTurn.type !== "proposed" &&
          currentTurn.type !== "proposed"
        ) {
        Logger.debug("Skipping historical validation", {
          module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
          data: {
            previousType: previousTurn.type,
            currentType: currentTurn.type,
            reason: "Historical turns don't need validation between each other"
          },
          showNotification: false,
        });
          continue;
        }

        const restHours = DateUtils.getHoursBetween(
          previousTurn.end,
          currentTurn.start
        );

        Logger.debug("Validating rest period between turns", {
          module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
          data: {
            previousType: previousTurn.type,
            currentType: currentTurn.type,
            previousEnd: previousTurn.end.toLocaleString(),
            currentStart: currentTurn.start.toLocaleString(),
            restHours: restHours,
            minimumRequired: minimumRestHours
          },
          showNotification: false,
        });

        if (restHours < minimumRestHours) {
          // 🔧 FIX: Usar fechas locales directamente sin DateUtils.formatDateTime
          const previousEndFormatted = this.formatLocalDateTime(
            previousTurn.end
          );
          const currentStartFormatted = this.formatLocalDateTime(
            currentTurn.start
          );

          return {
            isValid: false,
            message:
              `❌ Insufficient rest time between shifts (${restHours}h < ${minimumRestHours}h required)\n` +
              `Last shift ended: ${previousEndFormatted} (${previousTurn.vesselName} - ${previousTurn.type})\n` +
              `New shift starts: ${currentStartFormatted} (${currentTurn.vesselName} - ${currentTurn.type})`,
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

      // Registrar error de performance
      PerformanceTracker.error('ValidationService', 'validateMinimumRestWithMemory', error);

      return {
        isValid: true, // Fallback: permitir si hay error
        message: "Error validating rest time, allowing by default",
      };
    }
  }

  /**
   * 🚀 OPTIMIZADO: Encontrar samplers disponibles usando cache inteligente
   * Reduce consultas de ~200 a ~3-5
   */
  static async findAvailableSamplersForGeneration(
    startTime,
    finishTime,
    allSamplers,
    turnsInMemory,
    officeData,
    excludeRosterId = null
  ) {
    const availableSamplers = [];

    try {
      // 🚀 PASO 1: Precargar todos los datos de validación para la semana (3-5 consultas)
      const weekBounds = this.getWorkWeekBounds(startTime);
      const cacheData = await this.cacheService.preloadWeekValidationData(
        weekBounds.weekStart,
        weekBounds.weekEnd,
        excludeRosterId
      );

      Logger.debug("Using cached validation data for generation", {
        module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
        data: {
          weekBounds: `${DateUtils.formatDateTime(weekBounds.weekStart)} - ${DateUtils.formatDateTime(weekBounds.weekEnd)}`,
          cacheAge: this.cacheService.getCacheAge(this.cacheService.getWeekKey(weekBounds.weekStart)),
          rostersInCache: cacheData.activeRosters.length,
          nominationsInCache: cacheData.weekNominations.length,
        },
        showNotification: false,
      });

      // 🚀 PASO 2: Validar todos los samplers usando datos del cache (0 consultas BD)
      for (const sampler of allSamplers) {
        const validations = await this.validateSamplerForGenerationWithCache(
          sampler.name,
          startTime,
          finishTime,
          turnsInMemory,
          officeData,
          cacheData,
          excludeRosterId
        );

      // 🔍 DEBUG: Log cada sampler y sus validaciones
      Logger.debug("Sampler validation (cached)", {
        module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
        data: {
          samplerName: sampler.name,
          weekly: validations.weekly?.isValid,
          weeklyMsg: validations.weekly?.message,
          dayRestriction: validations.dayRestriction?.isValid,
          dayRestrictionMsg: validations.dayRestriction?.message,
          rest: validations.rest?.isValid,
          restMsg: validations.rest?.message,
          crossRoster: validations.crossRoster?.isAvailable,
          pobConflict: validations.pobConflict?.isValid,
          pobMsg: validations.pobConflict?.message,
          overall: validations.overall?.isValid,
        },
        showNotification: false,
      });

        if (validations.overall.isValid) {
          availableSamplers.push({
            sampler: sampler,
            validations: validations,
          });
        }
      }

      Logger.success("Available samplers found using cache", {
        module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
        data: {
          totalSamplers: allSamplers.length,
          availableSamplers: availableSamplers.length,
          timeSlot: `${DateUtils.formatDateTime(
            startTime
          )} - ${DateUtils.formatDateTime(finishTime)}`,
          cacheHits: "100%", // Todos los datos vienen del cache
        },
        showNotification: false,
      });

      return availableSamplers;

    } catch (error) {
      Logger.error("Error using cache for generation, falling back to direct validation", {
        module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
        error: error,
        showNotification: false,
      });

      // Registrar error de performance
      PerformanceTracker.error('ValidationService', 'findAvailableSamplersForGeneration', error);

      // Fallback: usar validación directa si el cache falla
      return await this.findAvailableSamplersForGenerationFallback(
        startTime,
        finishTime,
        allSamplers,
        turnsInMemory,
        officeData,
        excludeRosterId
      );
    }
  }

  /**
   * 🆕 Validate sampler against future ship nominations (POB conflicts)
   */
  static async validateAgainstFutureNominations(
    samplerName,
    proposedStartTime,
    proposedEndTime,
    currentRosterId = null
  ) {
    try {
      Logger.debug("POB validation called", {
        module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
        data: {
          samplerName: samplerName,
          proposedStart: proposedStartTime,
          proposedEnd: proposedEndTime,
          isSakib: samplerName === "Sakib",
        },
        showNotification: false,
      });
      // ✅ CORREGIDO: Manejar tanto Date objects como strings
      const proposedEnd =
        proposedEndTime instanceof Date
          ? proposedEndTime
          : this.parseLocalDateTime(proposedEndTime);

      if (!proposedEnd) {
        return { isValid: true, message: "Invalid proposed end time" };
      }

      // ✅ USAR PATRÓN SEMANAL: Buscar nominations de toda la semana (como las demás validaciones)
      const proposedStart =
        proposedStartTime instanceof Date
          ? proposedStartTime
          : this.parseLocalDateTime(proposedStartTime);

      const weekBounds = this.getWorkWeekBounds(proposedStart || proposedEnd);

      // Formato ISO para el backend
      const startDateISO = weekBounds.weekStart.toISOString();
      const endDateISO = weekBounds.weekEnd.toISOString();

      const response = await fetch(
        "/api/shipnominations?" +
          new URLSearchParams({
            startDate: startDateISO,
            endDate: endDateISO,
            limit: 100,
          })
      );

      if (!response.ok) {
        Logger.warn("Could not fetch ship nominations for validation", {
          module: "ValidationService",
          showNotification: false,
        });
        return {
          isValid: true,
          message: "Could not validate against nominations",
        };
      }

      const nominationsData = await response.json();
      const nominations = nominationsData.data || [];

      // Check for POB conflicts
      for (const nomination of nominations) {
        // 🔍 DEBUG: Log cada nomination
        Logger.debug("Checking nomination for POB conflict", {
          module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
          data: {
            vessel: nomination.vesselName,
            nominationSampler: nomination.sampler?.name,
            targetSampler: samplerName,
            matches: nomination.sampler?.name === samplerName,
          },
          showNotification: false,
        });
        Logger.debug("Nominations found for POB validation", {
          module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
          data: {
            total: nominations.length,
            nominations: nominations.map((n) => ({
              vessel: n.vesselName,
              sampler: n.sampler?.name,
              pob: n.pilotOnBoard,
              etc: n.etc,
            })),
          },
          showNotification: false,
        });
        if (nomination.sampler && nomination.sampler.name === samplerName) {
          Logger.debug("Parsing nomination dates for POB validation", {
            module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
            data: {
              vessel: nomination.vesselName,
              rawPOB: nomination.pilotOnBoard,
              rawETC: nomination.etc,
              pobParsed:
                nomination.pilotOnBoard instanceof Date
                  ? nomination.pilotOnBoard
                  : this.parseLocalDateTime(nomination.pilotOnBoard),
              etcParsed:
                nomination.etc instanceof Date
                  ? nomination.etc
                  : this.parseLocalDateTime(nomination.etc),
            },
            showNotification: false,
          });
          const pobDate =
            nomination.pilotOnBoard instanceof Date
              ? nomination.pilotOnBoard
              : new Date(nomination.pilotOnBoard);

          const etcDate =
            nomination.etc instanceof Date
              ? nomination.etc
              : new Date(nomination.etc);

          if (pobDate && etcDate) {
            Logger.debug("Checking POB overlap", {
              module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
              data: {
                vessel: nomination.vesselName,
                samplerName: samplerName,
                pobDate: pobDate,
                etcDate: etcDate,
                proposedStart: proposedStart,
                proposedEnd: proposedEnd,
                hasOverlap: pobDate < proposedEnd && etcDate > proposedStart,
                pobBeforeEnd: pobDate < proposedEnd,
                etcAfterStart: etcDate > proposedStart,
                isSakibNomination: nomination.sampler?.name === samplerName,
              },
              showNotification: false,
            });
            // ✅ NUEVA LÓGICA: Detectar overlap entre nomination y turno propuesto
            // Conflict si nomination está activa durante el turno propuesto
            const hasOverlap = pobDate < proposedEnd && etcDate > proposedStart;

            if (hasOverlap) {
              return {
                isValid: false,
                message: `POB conflict detected`,
                conflict: {
                  vessel: nomination.vesselName,
                  amspecRef: nomination.amspecRef,
                  pobStart: this.formatLocalDateTime(pobDate),
                  etcEnd: this.formatLocalDateTime(etcDate),
                  proposedStart: this.formatLocalDateTime(proposedStart),
                  proposedEnd: this.formatLocalDateTime(proposedEnd),
                  overlapReason: "Nomination active during proposed turn",
                },
              };
            }
          }
        }
      }

      return {
        isValid: true,
        message: `No POB conflicts for ${samplerName}`,
        checkedNominations: nominations.length,
      };
    } catch (error) {
      Logger.error("Error validating against nominations", {
        module: "ValidationService",
        error: error,
        showNotification: false,
      });

      // Registrar error de performance
      PerformanceTracker.error('ValidationService', 'validateAgainstFutureNominations', error);

      return {
        isValid: true,
        message: "Validation error - allowing assignment",
      };
    }
  }

  /**
   * 🆕 Helper: Get hours between two dates
   */
  static getHoursBetween(date1, date2) {
    if (!date1 || !date2) return 0;
    return Math.abs(date2.getTime() - date1.getTime()) / (1000 * 60 * 60);
  }

  /**
   * VALIDACIÓN CRUZADA: Verificar disponibilidad de sampler entre rosters (ORIGINAL)
   */
  static async validateSamplerAvailability(
    samplerName,
    startTime,
    finishTime,
    excludeRosterId = null
  ) {
    try {
      Logger.debug("Validating sampler availability", {
        module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
        data: {
          samplerName: samplerName,
          startTime: startTime.toLocaleString(),
          finishTime: finishTime.toLocaleString(),
          excludeRosterId: excludeRosterId,
        },
        showNotification: false,
      });

      // Obtener semana de trabajo (lunes a domingo)
      const weekInfo = this.getWorkWeekBounds(startTime);

      // Cargar todos los rosters activos de la semana
      const activeRosters = await this.loadActiveRostersForWeek(
        weekInfo.weekStart
      );

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

      // Registrar error de performance
      PerformanceTracker.error('ValidationService', 'validateSamplerAvailability', error);

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
      const activeRosters = result.data.filter((roster) => {
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

      // Registrar error de performance
      PerformanceTracker.error('ValidationService', 'loadActiveRosters', error);

      return []; // Fallback: array vacío
    }
  }

  /**
   * Encontrar conflictos de tiempo para un sampler específico (ORIGINAL)
   */
  static findSamplerConflicts(
    samplerName,
    startTime,
    finishTime,
    activeRosters,
    excludeRosterId
  ) {
    const conflicts = [];

    activeRosters.forEach((roster) => {
      // Excluir el roster actual (para ediciones)
      if (excludeRosterId && roster._id === excludeRosterId) {
        return;
      }

      // Verificar Office Sampling
      if (
        roster.officeSampling &&
        roster.officeSampling.sampler.name === samplerName
      ) {
        const officeStart = new Date(roster.officeSampling.startTime);
        const officeEnd = new Date(roster.officeSampling.finishTime);

        if (
          this.timeSlotOverlaps(startTime, finishTime, officeStart, officeEnd)
        ) {
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

            if (
              this.timeSlotOverlaps(startTime, finishTime, turnStart, turnEnd)
            ) {
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
  static validateMinimumRest(
    samplerName,
    startTime,
    finishTime,
    activeRosters,
    excludeRosterId
  ) {
    const minimumRestHours = SAMPLING_ROSTER_CONSTANTS.MINIMUM_REST_HOURS || 10;
    const samplerSchedule = [];

    // Recopilar todos los turnos del sampler en la semana
    activeRosters.forEach((roster) => {
      if (excludeRosterId && roster._id === excludeRosterId) return;

      // Office Sampling
      if (
        roster.officeSampling &&
        roster.officeSampling.sampler.name === samplerName
      ) {
        samplerSchedule.push({
          start: new Date(roster.officeSampling.startTime),
          end: new Date(roster.officeSampling.finishTime),
          type: "office",
          vesselName: roster.vesselName,
        });
      }

      // Line Sampling
      if (roster.lineSampling && Array.isArray(roster.lineSampling)) {
        roster.lineSampling.forEach((turn) => {
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

      // 🔧 SKIP: No validar turnos históricos entre sí
      if (previousTurn.type !== "proposed" && currentTurn.type !== "proposed") {
        Logger.debug("Skipping cross-vessel historical validation", {
          module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
          data: {
            previousType: previousTurn.type,
            currentType: currentTurn.type,
            reason: "Cross-vessel historical turns don't need validation between each other"
          },
          showNotification: false,
        });
        continue;
      }

      const restHours = DateUtils.getHoursBetween(
        previousTurn.end,
        currentTurn.start
      );

      Logger.debug("Validating cross-vessel rest period", {
        module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
        data: {
          previousType: previousTurn.type,
          currentType: currentTurn.type,
          previousEnd: previousTurn.end.toLocaleString(),
          currentStart: currentTurn.start.toLocaleString(),
          restHours: restHours,
          minimumRequired: minimumRestHours
        },
        showNotification: false,
      });

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
  static async findAvailableSamplers(
    startTime,
    finishTime,
    allSamplers,
    excludeRosterId = null
  ) {
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
        timeSlot: `${DateUtils.formatDateTime(
          startTime
        )} - ${DateUtils.formatDateTime(finishTime)}`,
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

  /**
   * 🆕 Cargar rosters activos para un período extendido
   */
  static async loadActiveRostersForExtendedPeriod(periodStart, periodEnd) {
    try {
      Logger.debug("Loading active rosters for extended period", {
        module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
        data: {
          periodStart: DateUtils.formatDateTime(periodStart),
          periodEnd: DateUtils.formatDateTime(periodEnd),
        },
        showNotification: false,
      });

      const response = await fetch("/api/sampling-rosters");
      const result = await response.json();

      if (!result.success || !result.data) {
        throw new Error("Failed to load rosters");
      }

      // Filtrar rosters que se superponen con el período extendido
      const activeRosters = result.data.filter((roster) => {
        if (!roster.startDischarge || !roster.etcTime) return false;

        const rosterStart = new Date(roster.startDischarge);
        const rosterEnd = new Date(roster.etcTime);

        // Verificar si el roster se superpone con el período
        return !(rosterEnd < periodStart || rosterStart > periodEnd);
      });

      Logger.debug("Active rosters loaded and filtered for extended period", {
        module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
        data: {
          totalRosters: result.data.length,
          activeInPeriod: activeRosters.length,
        },
        showNotification: false,
      });

      return activeRosters;
    } catch (error) {
      Logger.error("Error loading active rosters for extended period", {
        module: SAMPLING_ROSTER_CONSTANTS.LOG_CONFIG.MODULE_NAME,
        error: error,
        showNotification: false,
      });

      // Registrar error de performance
      PerformanceTracker.error('ValidationService', 'loadActiveRostersForExtendedPeriod', error);

      return [];
    }
  }

  /**
   * 🆕 Formatear fecha manteniendo timezone local (FIX PARA VALIDATION MESSAGES)
   */
  static formatLocalDateTime(date) {
    if (!date) return "Invalid Date";

    const localDate = new Date(date);

    // Formato: DD/MM/YYYY HH:mm
    const day = String(localDate.getDate()).padStart(2, "0");
    const month = String(localDate.getMonth() + 1).padStart(2, "0");
    const year = localDate.getFullYear();
    const hours = String(localDate.getHours()).padStart(2, "0");
    const minutes = String(localDate.getMinutes()).padStart(2, "0");

    return `${day}/${month}/${year} ${hours}:${minutes}`;
  }

  /**
   * 🆕 Parsear fecha manteniendo timezone local (IGUAL QUE EN CONTROLLER)
   */
  static parseLocalDateTime(dateTimeStr) {
    if (!dateTimeStr) return null;

    // Formato esperado: "06/08/2025 07:00" -> DD/MM/YYYY HH:mm
    const parts = dateTimeStr.match(
      /^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{1,2}):(\d{2})$/
    );
    if (!parts) return null;

    const [, day, month, year, hours, minutes] = parts;

    // Crear fecha en timezone local (no UTC)
    const localDate = new Date(
      parseInt(year),
      parseInt(month) - 1, // Month is 0-indexed
      parseInt(day),
      parseInt(hours),
      parseInt(minutes),
      0, // seconds
      0 // milliseconds
    );

    return localDate;
  }
}

// 🧪 HELPER GLOBAL PARA TESTING EN CONSOLA
// Exponer método de testing globalmente para debugging
if (typeof window !== 'undefined') {
  window.testSamplerWeeklyHours = async function(samplerName = 'Laura', date = new Date()) {
    try {
      console.log(`🧪 Testing weekly hours for ${samplerName} on ${date.toISOString().split('T')[0]}`);
      const result = await ValidationService.testWeeklyHoursValidation(samplerName, date);
      console.table(result);
      return result;
    } catch (error) {
      console.error('🧪 Test failed:', error);
      
      // Registrar error de performance
      PerformanceTracker.error('ValidationService', 'testSamplerWeeklyHours', error);
      
      return null;
    }
  };
  
  console.log('🧪 Testing helper loaded: Use testSamplerWeeklyHours("SamplerName") in console');
}

export default ValidationService;
