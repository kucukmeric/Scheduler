import { config } from './config.js';

export function getLogicIndex(renderIndex) {
    const day = Math.floor(renderIndex / config.totalHoursPerDay);
    const hour = renderIndex % config.totalHoursPerDay;

    if (hour === config.lunchBlockIndex) return -1;

    const hourOffset = hour > config.lunchBlockIndex ? -1 : 0;
    const logicHour = hour + hourOffset;

    return (day * config.schedulableHoursPerDay) + logicHour;
}

export function getRenderIndex(logicIndex) {
    const day = Math.floor(logicIndex / config.schedulableHoursPerDay);
    const logicHour = logicIndex % config.schedulableHoursPerDay;

    const renderHour = logicHour >= config.lunchBlockIndex ? logicHour + 1 : logicHour;

    return (day * config.totalHoursPerDay) + renderHour;
}
