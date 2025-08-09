/**
 * Schedule Calculator for Sampling Roster System
 * ✅ MEJORADO: Integrado con validaciones semanales y tracking de turnos
 */

import { SAMPLING_ROSTER_CONSTANTS } from "../utils/Constants.js";
import DateUtils from "../utils/DateUtils.js";
import ValidationService from "./ValidationService.js";

export class ScheduleCalculator {
  static samplerRotationHistory = new Map(); // Track last assignments per generation
  static samplerWeeklyHoursTracking = new Map(); // Track weekly hours distribution
  /**
   * 🔥 MÉTODO PRINCIPAL - Calcular turnos de Line Sampling (MEJORADO)
   * Ahora con validaciones semanales y tracking completo
   */
  static async calculateLineSamplingTurns(
    officeData,
    totalHours,
    samplersData,
    currentRosterId = null
  ) {
    const turns = [];

    // Validar datos de entrada
    const officeFinishDate = DateUtils.parseDateTime(officeData.finishTime);
    if (!officeFinishDate) {
      throw new Error("Invalid Office Sampling finish time");
    }

    if (!samplersData || samplersData.length === 0) {
      throw new Error("No samplers available");
    }

    Logger.debug("Starting Line Sampling calculation", {
      module: "SamplingRoster",
      data: {
        officeFinish: officeData.finishTime,
        officeSampler: officeData.samplerName,
        officeHours: officeData.hours,
        totalDischargeHours: totalHours,
        availableSamplers: samplersData.length,
        currentRosterId: currentRosterId,
      },
      showNotification: false,
    });

    let currentStartTime = new Date(officeFinishDate);
    let remainingHours = totalHours;

    // 🎯 PASO 1: Calcular primer turno con validaciones mejoradas
    const firstTurnResult = await this.calculateFirstTurnWithValidations(
      officeData,
      currentStartTime,
      remainingHours,
      currentRosterId
    );

    if (firstTurnResult.canContinue) {
      turns.push(firstTurnResult.turn);
      currentStartTime = DateUtils.parseDateTime(
        firstTurnResult.turn.finishTime
      );
      remainingHours -= firstTurnResult.turn.hours;

      Logger.debug("First turn: Office Sampler continues", {
        module: "SamplingRoster",
        data: {
          sampler: firstTurnResult.turn.samplerName,
          hours: firstTurnResult.turn.hours,
          totalOfficeSamplerHours:
            officeData.hours + firstTurnResult.turn.hours,
          remainingHours: remainingHours,
          weeklyValidation: firstTurnResult.weeklyValidation?.message || "N/A",
        },
        showNotification: false,
      });
    } else {
      Logger.debug("First turn: Office Sampler cannot continue", {
        module: "SamplingRoster",
        data: {
          reason: firstTurnResult.reason || "Would exceed limits",
          officeHours: officeData.hours,
          hoursToNextBlock: firstTurnResult.hoursToNextBlock,
          weeklyValidation: firstTurnResult.weeklyValidation?.message || "N/A",
        },
        showNotification: false,
      });
    }

    // 🎯 PASO 2: Generar turnos restantes con validaciones completas
    let attemptCount = 0;
    const maxAttempts = remainingHours * 2; // Prevenir loops infinitos

    while (remainingHours > 0 && attemptCount < maxAttempts) {
      attemptCount++;

      const nextTurnResult = await this.calculateNextTurnWithValidations(
        currentStartTime,
        remainingHours,
        samplersData,
        turns, // Pasar turnos ya generados
        officeData,
        currentRosterId
      );

      if (nextTurnResult.success) {
        turns.push(nextTurnResult.turn);
        currentStartTime = DateUtils.parseDateTime(
          nextTurnResult.turn.finishTime
        );
        remainingHours -= nextTurnResult.turn.hours;

        Logger.debug(`Turn ${turns.length} calculated successfully`, {
          module: "SamplingRoster",
          data: {
            sampler: nextTurnResult.turn.samplerName,
            start: nextTurnResult.turn.startTime,
            finish: nextTurnResult.turn.finishTime,
            hours: nextTurnResult.turn.hours,
            remainingHours: remainingHours,
            validationsPassed:
              nextTurnResult.validations?.overall.isValid || false,
            weeklyStatus: nextTurnResult.validations?.weekly?.message || "N/A",
          },
          showNotification: false,
        });
      } else {
        Logger.warn(`Failed to assign turn (attempt ${attemptCount})`, {
          module: "SamplingRoster",
          data: {
            remainingHours: remainingHours,
            reason: nextTurnResult.reason,
            availableSamplers: nextTurnResult.availableSamplers || 0,
          },
          showNotification: false,
        });

        // Intentar con estrategia de fallback
        const fallbackResult = await this.calculateFallbackTurn(
          currentStartTime,
          remainingHours,
          samplersData,
          turns,
          officeData
        );

        if (fallbackResult.success) {
          turns.push(fallbackResult.turn);
          currentStartTime = DateUtils.parseDateTime(
            fallbackResult.turn.finishTime
          );
          remainingHours -= fallbackResult.turn.hours;

          Logger.warn("Used fallback assignment", {
            module: "SamplingRoster",
            data: {
              sampler: fallbackResult.turn.samplerName,
              hours: fallbackResult.turn.hours,
              reason: "Primary validation failed",
            },
            showNotification: false,
          });
        } else {
          Logger.error("Failed to assign turn even with fallback", {
            module: "SamplingRoster",
            data: {
              remainingHours: remainingHours,
              attempts: attemptCount,
            },
            showNotification: true,
          });
          break; // Salir del loop si no se puede asignar
        }
      }
    }

    // Verificar si se completó correctamente
    if (remainingHours > 0) {
      Logger.warn("Could not assign all remaining hours", {
        module: "SamplingRoster",
        data: {
          remainingHours: remainingHours,
          totalTurns: turns.length,
          attempts: attemptCount,
        },
        showNotification: true,
      });
    }

    // 📊 Generar resumen final
    const summary = this.generateTurnsSummary(
      turns,
      officeData,
      totalHours - remainingHours
    );

    Logger.success("Line Sampling calculation completed", {
      module: "SamplingRoster",
      data: {
        totalTurns: turns.length,
        totalHoursAssigned: totalHours - remainingHours,
        totalHours: totalHours,
        remainingHours: remainingHours,
        summary: summary,
      },
      showNotification: false,
    });

    return turns;
  }

  /**
   * 🆕 PASO 1: Calcular primer turno con validaciones completas
   */
  static async calculateFirstTurnWithValidations(
    officeData,
    officeFinishTime,
    remainingHours,
    currentRosterId
  ) {
    const officeHours = parseInt(officeData.hours) || 6;
    const nextBlockTime = this.getNextBlockTime(officeFinishTime);
    const hoursToNextBlock = DateUtils.getHoursBetween(
      officeFinishTime,
      nextBlockTime
    );

    Logger.debug("First turn calculation with validations", {
      module: "SamplingRoster",
      data: {
        officeFinish: DateUtils.formatDateTime(officeFinishTime),
        nextBlock: DateUtils.formatDateTime(nextBlockTime),
        hoursToNextBlock: hoursToNextBlock,
        officeHours: officeHours,
        totalIfContinues: officeHours + hoursToNextBlock,
      },
      showNotification: false,
    });

    // ✅ VALIDACIÓN 1: ¿Office Sampler puede continuar sin exceder 12h diarias?
    if (
      officeHours + hoursToNextBlock >
      SAMPLING_ROSTER_CONSTANTS.MAX_SAMPLER_HOURS
    ) {
      return {
        canContinue: false,
        reason: "Would exceed daily 12h limit",
        hoursToNextBlock: hoursToNextBlock,
      };
    }

    // ✅ VALIDACIÓN 2: Límite semanal
    const actualHours = Math.min(hoursToNextBlock, remainingHours);
    const weeklyValidation = await ValidationService.validateSamplerWeeklyLimit(
      officeData.samplerName,
      actualHours,
      officeFinishTime,
      { officeData, turnsInMemory: [] }, // Turnos en memoria
      currentRosterId
    );

    if (!weeklyValidation.isValid) {
      return {
        canContinue: false,
        reason: "Would exceed weekly limit",
        weeklyValidation: weeklyValidation,
        hoursToNextBlock: hoursToNextBlock,
      };
    }

    // ✅ Puede continuar
    const finishTime = new Date(officeFinishTime);
    finishTime.setHours(finishTime.getHours() + actualHours);

    return {
      canContinue: true,
      turn: {
        samplerName: officeData.samplerName,
        startTime: DateUtils.formatDateTime(officeFinishTime),
        finishTime: DateUtils.formatDateTime(finishTime),
        hours: actualHours,
      },
      weeklyValidation: weeklyValidation,
      hoursToNextBlock: hoursToNextBlock,
    };
  }

  /**
   * 🆕 PASO 2: Calcular próximo turno con validaciones completas
   */
  static async calculateNextTurnWithValidations(
    currentStartTime,
    remainingHours,
    samplersData,
    turnsInMemory,
    officeData,
    currentRosterId
  ) {
    // Calcular duración del turno
    const turnInfo = this.calculateTurnDuration(
      currentStartTime,
      remainingHours
    );

    Logger.debug("Calculating next turn with validations", {
      module: "SamplingRoster",
      data: {
        startTime: DateUtils.formatDateTime(currentStartTime),
        remainingHours: remainingHours,
        proposedTurnHours: turnInfo.turnHours,
        isBlockBoundary: turnInfo.isBlockBoundary,
        isLastTurn: turnInfo.isLastTurn,
      },
      showNotification: false,
    });

    // Buscar sampler disponible con validaciones completas
    // Buscar sampler disponible con validaciones completas
    const availableSamplers =
      await ValidationService.findAvailableSamplersForGeneration(
        currentStartTime,
        turnInfo.turnEndTime,
        samplersData,
        turnsInMemory,
        officeData,
        currentRosterId
      );

    if (availableSamplers.length === 0) {
      return {
        success: false,
        reason: "No samplers available with all validations",
        availableSamplers: 0,
      };
    }

    // Seleccionar el mejor sampler con rotación inteligente
    const generationId = `roster_${currentRosterId || "default"}_${Date.now()}`;
    const bestSampler = this.selectBestSampler(
      availableSamplers,
      turnsInMemory,
      generationId
    );

    // Track the assignment
    this.trackSamplerAssignment(
      bestSampler.sampler.name,
      turnInfo.turnHours,
      generationId
    );

    return {
      success: true,
      turn: {
        samplerName: bestSampler.sampler.name,
        startTime: DateUtils.formatDateTime(currentStartTime),
        finishTime: DateUtils.formatDateTime(turnInfo.turnEndTime),
        hours: turnInfo.turnHours,
      },
      validations: bestSampler.validations,
      availableSamplers: availableSamplers.length,
    };
  }

  /**
   * 🆕 Calcular duración del turno según reglas de negocio
   */
  static calculateTurnDuration(currentStartTime, remainingHours) {
    const currentHour = currentStartTime.getHours();
    const isAtBlockBoundary =
      currentHour === SAMPLING_ROSTER_CONSTANTS.DAY_BLOCK_START ||
      currentHour === SAMPLING_ROSTER_CONSTANTS.NIGHT_BLOCK_START;

    let turnHours;

    if (
      isAtBlockBoundary &&
      remainingHours >= SAMPLING_ROSTER_CONSTANTS.MAX_SAMPLER_HOURS
    ) {
      // ✅ Turno perfecto de 12h
      turnHours = SAMPLING_ROSTER_CONSTANTS.MAX_SAMPLER_HOURS;
    } else if (
      isAtBlockBoundary &&
      remainingHours < SAMPLING_ROSTER_CONSTANTS.MAX_SAMPLER_HOURS
    ) {
      // ✅ Último turno con horas restantes
      turnHours = remainingHours;
    } else {
      // ⚠️ Ir hasta próximo bloque
      const nextBlockTime = this.getNextBlockTime(currentStartTime);
      const hoursToNextBlock = DateUtils.getHoursBetween(
        currentStartTime,
        nextBlockTime
      );
      turnHours = Math.min(
        hoursToNextBlock,
        remainingHours,
        SAMPLING_ROSTER_CONSTANTS.MAX_SAMPLER_HOURS
      );
    }

    const turnEndTime = new Date(currentStartTime);
    turnEndTime.setHours(turnEndTime.getHours() + turnHours);

    return {
      turnHours: turnHours,
      turnEndTime: turnEndTime,
      isBlockBoundary: isAtBlockBoundary,
      isLastTurn: remainingHours <= turnHours,
    };
  }

  /**
   * 🆕 Track sampler assignment for intelligent rotation
   */
  static trackSamplerAssignment(samplerName, hours, generationId = "default") {
    // Initialize if needed
    if (!this.samplerRotationHistory.has(generationId)) {
      this.samplerRotationHistory.set(generationId, []);
    }
    if (!this.samplerWeeklyHoursTracking.has(generationId)) {
      this.samplerWeeklyHoursTracking.set(generationId, new Map());
    }

    // Track assignment
    const history = this.samplerRotationHistory.get(generationId);
    const hoursTracking = this.samplerWeeklyHoursTracking.get(generationId);

    history.push({
      samplerName: samplerName,
      hours: hours,
      timestamp: new Date(),
    });

    // Update hours tracking
    const currentHours = hoursTracking.get(samplerName) || 0;
    hoursTracking.set(samplerName, currentHours + hours);

    // Keep only last 10 assignments for memory efficiency
    if (history.length > 10) {
      history.shift();
    }

    Logger.debug("Sampler assignment tracked", {
      module: "SamplingRoster",
      data: {
        sampler: samplerName,
        hours: hours,
        totalHours: hoursTracking.get(samplerName),
        recentAssignments: history.length,
      },
      showNotification: false,
    });
  }

  /**
   * 🆕 Get rotated sampler with memory and load balancing
   */
  static getRotatedSamplerWithMemory(
    availableSamplers,
    turnsInMemory = [],
    generationId = "default"
  ) {
    if (!availableSamplers || availableSamplers.length === 0) {
      return null;
    }

    // If only one sampler available, return it
    if (availableSamplers.length === 1) {
      return availableSamplers[0];
    }

    // Get tracking data
    const history = this.samplerRotationHistory.get(generationId) || [];
    const hoursTracking =
      this.samplerWeeklyHoursTracking.get(generationId) || new Map();

    // Calculate current hours for each available sampler (including current generation)
    const samplerCurrentHours = new Map();
    availableSamplers.forEach((samplerData) => {
      const samplerName = samplerData.sampler
        ? samplerData.sampler.name
        : samplerData.name;

      // Hours from tracking
      const trackedHours = hoursTracking.get(samplerName) || 0;

      // Hours from current turns in memory
      const memoryHours = turnsInMemory
        .filter((turn) => turn.samplerName === samplerName)
        .reduce((sum, turn) => sum + (turn.hours || 0), 0);

      samplerCurrentHours.set(samplerName, trackedHours + memoryHours);
    });

    // Get recent assignments (last 3)
    const recentAssignments = history.slice(-3).map((h) => h.samplerName);

    // Score each sampler
    const scoredSamplers = availableSamplers.map((samplerData) => {
      const samplerName = samplerData.sampler
        ? samplerData.sampler.name
        : samplerData.name;
      const currentHours = samplerCurrentHours.get(samplerName) || 0;

      let score = 0;

      // 1. Avoid recent assignments (higher score = better)
      const timesInRecent = recentAssignments.filter(
        (name) => name === samplerName
      ).length;
      score += (3 - timesInRecent) * 100; // Heavy penalty for recent assignments

      // 2. Prefer samplers with fewer hours (load balancing)
      const maxHours = Math.max(...Array.from(samplerCurrentHours.values()));
      const hoursScore =
        maxHours > 0 ? ((maxHours - currentHours) / maxHours) * 50 : 50;
      score += hoursScore;

      // 3. Prefer samplers with weekly limits (more available hours)
      if (samplerData.validations && samplerData.validations.weekly) {
        const weeklyData = samplerData.validations.weekly;
        if (weeklyData.hasWeeklyLimit && weeklyData.remainingHours > 0) {
          score += Math.min(weeklyData.remainingHours, 24) * 2; // Bonus for available hours
        } else if (!weeklyData.hasWeeklyLimit) {
          score += 20; // Moderate bonus for no weekly limit
        }
      }

      return {
        samplerData: samplerData,
        samplerName: samplerName,
        score: score,
        currentHours: currentHours,
        timesInRecent: timesInRecent,
      };
    });

    // Sort by score (highest first) and select best
    scoredSamplers.sort((a, b) => b.score - a.score);
    const selected = scoredSamplers[0];

    Logger.debug("Intelligent sampler rotation", {
      module: "SamplingRoster",
      data: {
        selected: selected.samplerName,
        score: Math.round(selected.score),
        currentHours: selected.currentHours,
        recentCount: selected.timesInRecent,
        totalOptions: availableSamplers.length,
        top3Scores: scoredSamplers.slice(0, 3).map((s) => ({
          name: s.samplerName,
          score: Math.round(s.score),
        })),
      },
      showNotification: false,
    });

    return selected.samplerData;
  }

  /**
   * 🆕 Seleccionar mejor sampler disponible
   */
  static selectBestSampler(
    availableSamplers,
    turnsInMemory,
    generationId = "default"
  ) {
    Logger.debug("Selecting best sampler with intelligent rotation", {
      module: "SamplingRoster",
      data: {
        availableOptions: availableSamplers.length,
        generationId: generationId,
      },
      showNotification: false,
    });

    // Use intelligent rotation
    const selectedSampler = this.getRotatedSamplerWithMemory(
      availableSamplers,
      turnsInMemory,
      generationId
    );

    if (!selectedSampler) {
      Logger.warn(
        "No sampler selected by intelligent rotation, using fallback",
        {
          module: "SamplingRoster",
          showNotification: false,
        }
      );

      // Fallback to original logic
      return availableSamplers.sort((a, b) => {
        const aWeekly = a.validations.weekly;
        const bWeekly = b.validations.weekly;

        if (aWeekly?.hasWeeklyLimit && bWeekly?.hasWeeklyLimit) {
          return bWeekly.remainingHours - aWeekly.remainingHours;
        }

        if (aWeekly?.hasWeeklyLimit && !bWeekly?.hasWeeklyLimit) return 1;
        if (!aWeekly?.hasWeeklyLimit && bWeekly?.hasWeeklyLimit) return -1;

        return 0;
      })[0];
    }

    return selectedSampler;
  }

  /**
   * 🆕 Calcular turno de fallback (validaciones relajadas)
   */
  static async calculateFallbackTurn(
    currentStartTime,
    remainingHours,
    samplersData,
    turnsInMemory,
    officeData
  ) {
    Logger.warn("Attempting fallback turn assignment", {
      module: "SamplingRoster",
      data: {
        startTime: DateUtils.formatDateTime(currentStartTime),
        remainingHours: remainingHours,
      },
      showNotification: false,
    });

    const turnInfo = this.calculateTurnDuration(
      currentStartTime,
      remainingHours
    );

    // Fallback: solo verificar que no exceda 12h diarias
    for (const sampler of samplersData) {
      // Calcular horas diarias actuales para este sampler
      let dailyHours = 0;

      // Contar horas del office sampling si es el mismo sampler
      if (officeData && officeData.samplerName === sampler.name) {
        const officeSameDay = DateUtils.parseDateTime(officeData.startTime);
        const proposedDay = new Date(currentStartTime);
        if (
          officeSameDay &&
          officeSameDay.toDateString() === proposedDay.toDateString()
        ) {
          dailyHours += officeData.hours || 0;
        }
      }

      // Contar horas de turnos en memoria del mismo día
      turnsInMemory.forEach((turn) => {
        if (turn.samplerName === sampler.name) {
          const turnDay = DateUtils.parseDateTime(turn.startTime);
          const proposedDay = new Date(currentStartTime);
          if (
            turnDay &&
            turnDay.toDateString() === proposedDay.toDateString()
          ) {
            dailyHours += turn.hours || 0;
          }
        }
      });

      // Verificar si puede tomar el turno sin exceder 12h diarias
      if (
        dailyHours + turnInfo.turnHours <=
        SAMPLING_ROSTER_CONSTANTS.MAX_SAMPLER_HOURS
      ) {
        Logger.warn(`Fallback assignment to ${sampler.name}`, {
          module: "SamplingRoster",
          data: {
            sampler: sampler.name,
            currentDailyHours: dailyHours,
            proposedHours: turnInfo.turnHours,
            totalDailyAfter: dailyHours + turnInfo.turnHours,
          },
          showNotification: false,
        });

        return {
          success: true,
          turn: {
            samplerName: sampler.name,
            startTime: DateUtils.formatDateTime(currentStartTime),
            finishTime: DateUtils.formatDateTime(turnInfo.turnEndTime),
            hours: turnInfo.turnHours,
          },
          isFallback: true,
        };
      }
    }

    return {
      success: false,
      reason: "No samplers available even with fallback validation",
    };
  }

  /**
   * 🆕 Generar resumen de turnos
   */
  static generateTurnsSummary(turns, officeData, totalHours) {
    const samplerHours = {};

    // Contar horas de office sampling
    if (officeData && officeData.samplerName) {
      samplerHours[officeData.samplerName] =
        (samplerHours[officeData.samplerName] || 0) + (officeData.hours || 0);
    }

    // Contar horas de line sampling
    turns.forEach((turn) => {
      samplerHours[turn.samplerName] =
        (samplerHours[turn.samplerName] || 0) + turn.hours;
    });

    return {
      totalTurns: turns.length,
      totalHours: totalHours,
      samplerDistribution: samplerHours,
      averageHoursPerSampler: totalHours / Object.keys(samplerHours).length,
    };
  }

  /**
   * 🎯 PASO 1: Calcular primer turno con validación Office Sampler (LEGACY - mantener compatibilidad)
   */
  static calculateFirstTurn(officeData, officeFinishTime, remainingHours) {
    const officeHours = parseInt(officeData.hours) || 6;
    const nextBlockTime = this.getNextBlockTime(officeFinishTime);
    const hoursToNextBlock = DateUtils.getHoursBetween(
      officeFinishTime,
      nextBlockTime
    );

    Logger.debug("First turn calculation (legacy)", {
      module: "SamplingRoster",
      data: {
        officeFinish: DateUtils.formatDateTime(officeFinishTime),
        nextBlock: DateUtils.formatDateTime(nextBlockTime),
        hoursToNextBlock: hoursToNextBlock,
        officeHours: officeHours,
        totalIfContinues: officeHours + hoursToNextBlock,
      },
      showNotification: false,
    });

    // ✅ VALIDACIÓN: ¿Office Sampler puede continuar sin exceder 12h?
    if (
      officeHours + hoursToNextBlock <=
      SAMPLING_ROSTER_CONSTANTS.MAX_SAMPLER_HOURS
    ) {
      // ✅ Puede continuar hasta próximo bloque
      const actualHours = Math.min(hoursToNextBlock, remainingHours);
      const finishTime = new Date(officeFinishTime);
      finishTime.setHours(finishTime.getHours() + actualHours);

      return {
        canContinue: true,
        turn: {
          samplerName: officeData.samplerName,
          startTime: DateUtils.formatDateTime(officeFinishTime),
          finishTime: DateUtils.formatDateTime(finishTime),
          hours: actualHours,
        },
        hoursToNextBlock: hoursToNextBlock,
      };
    } else {
      // ❌ No puede continuar, excedería 12h
      return {
        canContinue: false,
        hoursToNextBlock: hoursToNextBlock,
      };
    }
  }

  /**
   * 🎯 PASO 2: Calcular próximo turno en bloques exactos de 12h (LEGACY - mantener compatibilidad)
   */
  static async calculateNextTurn(
    currentStartTime,
    remainingHours,
    samplersData,
    samplerIndex,
    officeSamplerName
  ) {
    // Determinar si estamos en un bloque perfecto (07:00 o 19:00)
    const currentHour = currentStartTime.getHours();
    const isAtBlockBoundary =
      currentHour === SAMPLING_ROSTER_CONSTANTS.DAY_BLOCK_START ||
      currentHour === SAMPLING_ROSTER_CONSTANTS.NIGHT_BLOCK_START;

    let turnHours;
    let turnEndTime;

    if (
      isAtBlockBoundary &&
      remainingHours >= SAMPLING_ROSTER_CONSTANTS.MAX_SAMPLER_HOURS
    ) {
      // ✅ Estamos en bloque perfecto Y hay suficientes horas para 12h exactas
      turnHours = SAMPLING_ROSTER_CONSTANTS.MAX_SAMPLER_HOURS;
      turnEndTime = new Date(currentStartTime);
      turnEndTime.setHours(
        turnEndTime.getHours() + SAMPLING_ROSTER_CONSTANTS.MAX_SAMPLER_HOURS
      );

      Logger.debug("Perfect block turn (12h)", {
        module: "SamplingRoster",
        data: {
          startTime: DateUtils.formatDateTime(currentStartTime),
          turnHours: turnHours,
          remainingAfter: remainingHours - turnHours,
        },
        showNotification: false,
      });
    } else if (
      isAtBlockBoundary &&
      remainingHours < SAMPLING_ROSTER_CONSTANTS.MAX_SAMPLER_HOURS
    ) {
      // ✅ Último turno - usar todas las horas restantes
      turnHours = remainingHours;
      turnEndTime = new Date(currentStartTime);
      turnEndTime.setHours(turnEndTime.getHours() + turnHours);

      Logger.debug("Final turn (remaining hours)", {
        module: "SamplingRoster",
        data: {
          startTime: DateUtils.formatDateTime(currentStartTime),
          turnHours: turnHours,
          isLastTurn: true,
        },
        showNotification: false,
      });
    } else {
      // ⚠️ No estamos en bloque perfecto - ir hasta próximo bloque
      const nextBlockTime = this.getNextBlockTime(currentStartTime);
      const hoursToNextBlock = DateUtils.getHoursBetween(
        currentStartTime,
        nextBlockTime
      );
      turnHours = Math.min(
        hoursToNextBlock,
        remainingHours,
        SAMPLING_ROSTER_CONSTANTS.MAX_SAMPLER_HOURS
      );
      turnEndTime = new Date(currentStartTime);
      turnEndTime.setHours(turnEndTime.getHours() + turnHours);

      Logger.debug("Transition to block turn", {
        module: "SamplingRoster",
        data: {
          startTime: DateUtils.formatDateTime(currentStartTime),
          nextBlock: DateUtils.formatDateTime(nextBlockTime),
          turnHours: turnHours,
        },
        showNotification: false,
      });
    }

    // Asignar sampler con rotación inteligente
    const assignedSampler = await this.getNextAvailableSampler(
      samplersData,
      samplerIndex,
      officeSamplerName,
      currentStartTime,
      turnEndTime
    );

    return {
      turn: {
        samplerName: assignedSampler.name,
        startTime: DateUtils.formatDateTime(currentStartTime),
        finishTime: DateUtils.formatDateTime(turnEndTime),
        hours: turnHours,
      },
      nextSamplerIndex: samplerIndex + 1,
    };
  }

  /**
   * 🔧 Obtener próximo sampler disponible con validación cruzada (LEGACY - mantener compatibilidad)
   */
  static async getNextAvailableSampler(
    samplersData,
    samplerIndex,
    officeSamplerName,
    startTime,
    finishTime,
    excludeRosterId = null
  ) {
    try {
      // Intentar asignación con validación cruzada
      console.log(
        "🔍 ALL SAMPLERS BEFORE VALIDATION:",
        samplersData.map((s) => s.name)
      );
      const availableSamplers = await ValidationService.findAvailableSamplers(
        startTime,
        finishTime,
        samplersData,
        excludeRosterId
      );
      console.log(
        "🔍 SAMPLERS AFTER BASIC VALIDATION:",
        availableSamplers.map((s) => s.sampler.name)
      );

      if (availableSamplers.length > 0) {
        // 🆕 Filtrar por conflictos POB antes de seleccionar
        const pobFilteredSamplers = [];
        for (const samplerData of availableSamplers) {
          const pobValidation =
            await ValidationService.validateAgainstFutureNominations(
              samplerData.sampler.name,
              startTime,
              finishTime,
              excludeRosterId
            );

          if (pobValidation.isValid) {
            pobFilteredSamplers.push(samplerData);
          }
        }

        // Usar rotación inteligente con samplers filtrados
        const generationId = `legacy_${
          excludeRosterId || "default"
        }_${Date.now()}`;
        const selectedSamplerData = this.getRotatedSamplerWithMemory(
          pobFilteredSamplers.length > 0
            ? pobFilteredSamplers
            : availableSamplers, // Fallback si todos tienen conflicto
          [], // No memory for legacy calls
          generationId
        );

        const selectedSampler = selectedSamplerData
          ? selectedSamplerData.sampler
          : availableSamplers[0];

        // Track the assignment
        if (selectedSampler) {
          const estimatedHours =
            DateUtils.getHoursBetween(startTime, finishTime) || 8;
          this.trackSamplerAssignment(
            selectedSampler.name,
            estimatedHours,
            generationId
          );
        }

        Logger.debug("Sampler assigned with cross-validation", {
          module: "SamplingRoster",
          data: {
            selectedSampler: selectedSampler.sampler.name,
            availableOptions: availableSamplers.length,
            timeSlot: `${DateUtils.formatDateTime(
              startTime
            )} - ${DateUtils.formatDateTime(finishTime)}`,
          },
          showNotification: false,
        });

        return selectedSampler.sampler;
      } else {
        // Fallback: rotación simple si no hay samplers disponibles
        Logger.warn(
          "No samplers available with cross-validation, using fallback",
          {
            module: "SamplingRoster",
            data: {
              totalSamplers: samplersData.length,
              timeSlot: `${DateUtils.formatDateTime(
                startTime
              )} - ${DateUtils.formatDateTime(finishTime)}`,
            },
            showNotification: false,
          }
        );

        return samplersData[samplerIndex % samplersData.length];
      }
    } catch (error) {
      Logger.error("Error in cross-validation, using simple rotation", {
        module: "SamplingRoster",
        error: error,
        showNotification: false,
      });

      // Fallback: rotación simple en caso de error
      return samplersData[samplerIndex % samplersData.length];
    }
  }

  /**
   * Obtener próximo bloque horario (07:00 o 19:00)
   */
  static getNextBlockTime(currentTime) {
    const nextBlock = new Date(currentTime);
    const currentHour = currentTime.getHours();

    if (currentHour < SAMPLING_ROSTER_CONSTANTS.DAY_BLOCK_START) {
      // Si es antes de las 07:00, próximo bloque es 07:00 del mismo día
      nextBlock.setHours(SAMPLING_ROSTER_CONSTANTS.DAY_BLOCK_START, 0, 0, 0);
    } else if (currentHour < SAMPLING_ROSTER_CONSTANTS.NIGHT_BLOCK_START) {
      // Si es entre 07:00-19:00, próximo bloque es 19:00 del mismo día
      nextBlock.setHours(SAMPLING_ROSTER_CONSTANTS.NIGHT_BLOCK_START, 0, 0, 0);
    } else {
      // Si es después de las 19:00, próximo bloque es 07:00 del día siguiente
      nextBlock.setDate(nextBlock.getDate() + 1);
      nextBlock.setHours(SAMPLING_ROSTER_CONSTANTS.DAY_BLOCK_START, 0, 0, 0);
    }

    return nextBlock;
  }

  /**
   * Calcular turnos adicionales para expansión de roster (OBSOLETO - NO USAR)
   * NOTA: Mantenido por compatibilidad, pero la lógica principal usa regeneración completa
   */
  static calculateAdditionalTurns(
    startTime,
    additionalHours,
    samplersData,
    officeSamplerName
  ) {
    Logger.warn(
      "Using deprecated calculateAdditionalTurns - should use full regeneration instead",
      {
        module: "SamplingRoster",
        showNotification: false,
      }
    );

    // Usar lógica simplificada como fallback
    const additionalTurns = [];
    let currentStartTime = new Date(startTime);
    let remainingHours = additionalHours;
    let samplerIndex = 0;

    while (remainingHours > 0) {
      const nextBlockTime = this.getNextBlockTime(currentStartTime);
      const hoursToNextBlock = DateUtils.getHoursBetween(
        currentStartTime,
        nextBlockTime
      );
      const turnHours = Math.min(
        remainingHours,
        hoursToNextBlock,
        SAMPLING_ROSTER_CONSTANTS.MAX_SAMPLER_HOURS
      );

      const turnEndTime = new Date(currentStartTime);
      turnEndTime.setHours(turnEndTime.getHours() + turnHours);

      const assignedSampler = this.getNextAvailableSampler(
        samplersData,
        samplerIndex,
        officeSamplerName
      );
      samplerIndex++;

      const turn = {
        samplerName: assignedSampler.name,
        startTime: DateUtils.formatDateTime(currentStartTime),
        finishTime: DateUtils.formatDateTime(turnEndTime),
        hours: turnHours,
      };

      additionalTurns.push(turn);

      currentStartTime = new Date(turnEndTime);
      remainingHours -= turnHours;
    }

    return additionalTurns;
  }

  /**
   * Calcular nuevo tiempo de finalización
   */
  static calculateNewFinishTime(startTimeString, hours) {
    const startTime = DateUtils.parseDateTime(startTimeString);
    if (!startTime) return startTimeString;

    const finishTime = new Date(startTime);
    finishTime.setHours(finishTime.getHours() + hours);

    return DateUtils.formatDateTime(finishTime);
  }

  /**
   * Calcular ETC automáticamente
   * ETC = Start Discharge + Discharge Time (Hrs)
   */
  static calculateETC(startDischarge, dischargeHours) {
    if (!startDischarge || !dischargeHours || dischargeHours <= 0) {
      return null;
    }

    if (!Number.isInteger(dischargeHours)) {
      return null;
    }

    const etcTime = new Date(startDischarge);
    etcTime.setHours(etcTime.getHours() + dischargeHours);

    return etcTime;
  }

  /**
   * Determinar tipo de bloque (day/night)
   */
  static determineBlockType(timeString) {
    const time = DateUtils.parseDateTime(timeString);
    if (!time) return SAMPLING_ROSTER_CONSTANTS.BLOCK_TYPES.DAY;

    const hour = time.getHours();
    return hour >= SAMPLING_ROSTER_CONSTANTS.DAY_BLOCK_START &&
      hour < SAMPLING_ROSTER_CONSTANTS.NIGHT_BLOCK_START
      ? SAMPLING_ROSTER_CONSTANTS.BLOCK_TYPES.DAY
      : SAMPLING_ROSTER_CONSTANTS.BLOCK_TYPES.NIGHT;
  }

  /**
   * 🆕 Clean up tracking data to prevent memory leaks
   */
  static cleanupTrackingData(olderThanMinutes = 60) {
    const cutoffTime = new Date();
    cutoffTime.setMinutes(cutoffTime.getMinutes() - olderThanMinutes);

    let cleanedGenerations = 0;

    // Clean rotation history
    for (const [
      generationId,
      history,
    ] of this.samplerRotationHistory.entries()) {
      const recentHistory = history.filter(
        (entry) => entry.timestamp > cutoffTime
      );

      if (recentHistory.length === 0) {
        this.samplerRotationHistory.delete(generationId);
        cleanedGenerations++;
      } else {
        this.samplerRotationHistory.set(generationId, recentHistory);
      }
    }

    // Clean hours tracking for deleted generations
    for (const generationId of this.samplerWeeklyHoursTracking.keys()) {
      if (!this.samplerRotationHistory.has(generationId)) {
        this.samplerWeeklyHoursTracking.delete(generationId);
      }
    }

    if (cleanedGenerations > 0) {
      Logger.debug("Cleaned up tracking data", {
        module: "SamplingRoster",
        data: {
          cleanedGenerations: cleanedGenerations,
          activeGenerations: this.samplerRotationHistory.size,
          cutoffMinutes: olderThanMinutes,
        },
        showNotification: false,
      });
    }
  }

  /**
   * 🆕 Reset all tracking data (useful for testing or manual reset)
   */
  static resetTrackingData() {
    this.samplerRotationHistory.clear();
    this.samplerWeeklyHoursTracking.clear();

    Logger.info("All tracking data reset", {
      module: "SamplingRoster",
      showNotification: false,
    });
  }
}

export default ScheduleCalculator;
