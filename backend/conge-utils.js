const { parse, addDays, differenceInCalendarDays, getDay } = require('date-fns');

function calculateCongeDuration(from, to) {
  const startDate = typeof from === 'string' ? parse(from, 'yyyy-MM-dd', new Date()) : from;
  const endDate = typeof to === 'string' ? parse(to, 'yyyy-MM-dd', new Date()) : to;

  const baseDays = differenceInCalendarDays(endDate, startDate) + 1;
  const startDay = getDay(startDate); // 0 = Sunday
  const endDay = getDay(endDate);     // 0 = Sunday
  const year = startDate.getFullYear();

  const isAugustFull = 
    startDate.getDate() === 1 &&
    startDate.getMonth() === 7 && // August = 7 (0-based)
    endDate.getDate() === 31 &&
    endDate.getMonth() === 7 &&
    endDate.getFullYear() === year;

  if (isAugustFull) {
    return { duration: 31, adjustedFrom: startDate, adjustedTo: endDate };
  }

  if (startDay === 5 && endDay === 1 && baseDays === 4) {
    return { duration: 4, adjustedFrom: startDate, adjustedTo: endDate };
  }

  if (startDay === 1 && endDay !== 5) {
    return {
      duration: baseDays + 2,
      adjustedFrom: addDays(startDate, -2),
      adjustedTo: endDate
    };
  }

  if (startDay !== 1 && endDay === 5) {
    return {
      duration: baseDays + 2,
      adjustedFrom: startDate,
      adjustedTo: addDays(endDate, 2)
    };
  }

  if (startDay === 1 && endDay === 5) {
    return {
      duration: baseDays + 2,
      adjustedFrom: startDate,
      adjustedTo: addDays(endDate, 2)
    };
  }

  return { duration: baseDays, adjustedFrom: startDate, adjustedTo: endDate };
}

module.exports = { calculateCongeDuration };
