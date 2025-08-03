/**
 * Schedule Calculator for Sampling Roster System
 * ✅ LÓGICA CORREGIDA: Generación y edición coherente de turnos
 */

import { SAMPLING_ROSTER_CONSTANTS } from '../utils/Constants.js';
import DateUtils from '../utils/DateUtils.js';
import ValidationService from './ValidationService.js';

export class ScheduleCalculator {
  /**
   * 🔥 MÉTODO PRINCIPAL - Calcular turnos de Line Sampling (CORREGIDO)
   * Siempre regenera desde cero para mantener lógica de 12h
   */
  static async calculateLineSamplingTurns(officeData, totalHours, samplersData) {
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
      },
      showNotification: false,
    });

    let currentStartTime = new Date(officeFinishDate);
    let remainingHours = totalHours;
    let samplerRotationIndex = 0;

    // 🎯 PASO 1: Calcular primer turno (validación Office Sampler)
    const firstTurnResult = this.calculateFirstTurn(
      officeData, 
      currentStartTime, 
      remainingHours
    );

    if (firstTurnResult.canContinue) {
      // Office Sampler puede continuar hasta próximo bloque
      turns.push(firstTurnResult.turn);
      currentStartTime = DateUtils.parseDateTime(firstTurnResult.turn.finishTime);
      remainingHours -= firstTurnResult.turn.hours;

      Logger.debug("First turn: Office Sampler continues", {
        module: "SamplingRoster",
        data: {
          sampler: firstTurnResult.turn.samplerName,
          hours: firstTurnResult.turn.hours,
          totalOfficeSamplerHours: officeData.hours + firstTurnResult.turn.hours,
          remainingHours: remainingHours,
        },
        showNotification: false,
      });
    } else {
      Logger.debug("First turn: Office Sampler cannot continue", {
        module: "SamplingRoster",
        data: {
          reason: "Would exceed 12h limit",
          officeHours: officeData.hours,
          hoursToNextBlock: firstTurnResult.hoursToNextBlock,
        },
        showNotification: false,
      });
    }

    // 🎯 PASO 2: Generar turnos restantes en bloques exactos de 12h
    while (remainingHours > 0) {
      const nextTurn = await this.calculateNextTurn(
        currentStartTime,
        remainingHours,
        samplersData,
        samplerRotationIndex,
        officeData.samplerName
      );

      turns.push(nextTurn.turn);
      currentStartTime = DateUtils.parseDateTime(nextTurn.turn.finishTime);
      remainingHours -= nextTurn.turn.hours;
      samplerRotationIndex = nextTurn.nextSamplerIndex;

      Logger.debug(`Turn ${turns.length} calculated`, {
        module: "SamplingRoster",
        data: {
          sampler: nextTurn.turn.samplerName,
          start: nextTurn.turn.startTime,
          finish: nextTurn.turn.finishTime,
          hours: nextTurn.turn.hours,
          remainingHours: remainingHours,
          isLastTurn: remainingHours === 0,
        },
        showNotification: false,
      });
    }

    Logger.success("Line Sampling calculation completed", {
      module: "SamplingRoster",
      data: {
        totalTurns: turns.length,
        totalHours: totalHours,
        officeSamplerTotal: officeData.hours + (firstTurnResult.canContinue ? firstTurnResult.turn.hours : 0),
      },
      showNotification: false,
    });

    return turns;
  }

  /**
   * 🎯 PASO 1: Calcular primer turno con validación Office Sampler
   */
  static calculateFirstTurn(officeData, officeFinishTime, remainingHours) {
    const officeHours = parseInt(officeData.hours) || 6;
    const nextBlockTime = this.getNextBlockTime(officeFinishTime);
    const hoursToNextBlock = DateUtils.getHoursBetween(officeFinishTime, nextBlockTime);

    Logger.debug("First turn calculation", {
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
    if (officeHours + hoursToNextBlock <= SAMPLING_ROSTER_CONSTANTS.MAX_SAMPLER_HOURS) {
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
   * 🎯 PASO 2: Calcular próximo turno en bloques exactos de 12h
   */
  static async calculateNextTurn(currentStartTime, remainingHours, samplersData, samplerIndex, officeSamplerName) {
    // Determinar si estamos en un bloque perfecto (07:00 o 19:00)
    const currentHour = currentStartTime.getHours();
    const isAtBlockBoundary = (
      currentHour === SAMPLING_ROSTER_CONSTANTS.DAY_BLOCK_START || 
      currentHour === SAMPLING_ROSTER_CONSTANTS.NIGHT_BLOCK_START
    );

    let turnHours;
    let turnEndTime;

    if (isAtBlockBoundary && remainingHours >= SAMPLING_ROSTER_CONSTANTS.MAX_SAMPLER_HOURS) {
      // ✅ Estamos en bloque perfecto Y hay suficientes horas para 12h exactas
      turnHours = SAMPLING_ROSTER_CONSTANTS.MAX_SAMPLER_HOURS;
      turnEndTime = new Date(currentStartTime);
      turnEndTime.setHours(turnEndTime.getHours() + SAMPLING_ROSTER_CONSTANTS.MAX_SAMPLER_HOURS);

      Logger.debug("Perfect block turn (12h)", {
        module: "SamplingRoster",
        data: {
          startTime: DateUtils.formatDateTime(currentStartTime),
          turnHours: turnHours,
          remainingAfter: remainingHours - turnHours,
        },
        showNotification: false,
      });
    } else if (isAtBlockBoundary && remainingHours < SAMPLING_ROSTER_CONSTANTS.MAX_SAMPLER_HOURS) {
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
      const hoursToNextBlock = DateUtils.getHoursBetween(currentStartTime, nextBlockTime);
      turnHours = Math.min(hoursToNextBlock, remainingHours, SAMPLING_ROSTER_CONSTANTS.MAX_SAMPLER_HOURS);
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
 * 🔧 Obtener próximo sampler disponible con validación cruzada (MEJORADO)
 */
static async getNextAvailableSampler(samplersData, samplerIndex, officeSamplerName, startTime, finishTime, excludeRosterId = null) {
  try {
    // Intentar asignación con validación cruzada
    const availableSamplers = await ValidationService.findAvailableSamplers(
      startTime,
      finishTime,
      samplersData,
      excludeRosterId
    );

    if (availableSamplers.length > 0) {
      // Usar rotación entre samplers disponibles
      const selectedSampler = availableSamplers[samplerIndex % availableSamplers.length];
      
      Logger.debug("Sampler assigned with cross-validation", {
        module: "SamplingRoster",
        data: {
          selectedSampler: selectedSampler.sampler.name,
          availableOptions: availableSamplers.length,
          timeSlot: `${DateUtils.formatDateTime(startTime)} - ${DateUtils.formatDateTime(finishTime)}`,
        },
        showNotification: false,
      });

      return selectedSampler.sampler;
    } else {
      // Fallback: rotación simple si no hay samplers disponibles
      Logger.warn("No samplers available with cross-validation, using fallback", {
        module: "SamplingRoster",
        data: {
          totalSamplers: samplersData.length,
          timeSlot: `${DateUtils.formatDateTime(startTime)} - ${DateUtils.formatDateTime(finishTime)}`,
        },
        showNotification: false,
      });

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
  static calculateAdditionalTurns(startTime, additionalHours, samplersData, officeSamplerName) {
    Logger.warn("Using deprecated calculateAdditionalTurns - should use full regeneration instead", {
      module: "SamplingRoster",
      showNotification: false,
    });

    // Usar lógica simplificada como fallback
    const additionalTurns = [];
    let currentStartTime = new Date(startTime);
    let remainingHours = additionalHours;
    let samplerIndex = 0;

    while (remainingHours > 0) {
      const nextBlockTime = this.getNextBlockTime(currentStartTime);
      const hoursToNextBlock = DateUtils.getHoursBetween(currentStartTime, nextBlockTime);
      const turnHours = Math.min(remainingHours, hoursToNextBlock, SAMPLING_ROSTER_CONSTANTS.MAX_SAMPLER_HOURS);

      const turnEndTime = new Date(currentStartTime);
      turnEndTime.setHours(turnEndTime.getHours() + turnHours);

      const assignedSampler = this.getNextAvailableSampler(samplersData, samplerIndex, officeSamplerName);
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
    return (hour >= SAMPLING_ROSTER_CONSTANTS.DAY_BLOCK_START && 
            hour < SAMPLING_ROSTER_CONSTANTS.NIGHT_BLOCK_START) 
            ? SAMPLING_ROSTER_CONSTANTS.BLOCK_TYPES.DAY 
            : SAMPLING_ROSTER_CONSTANTS.BLOCK_TYPES.NIGHT;
  }
}

export default ScheduleCalculator;