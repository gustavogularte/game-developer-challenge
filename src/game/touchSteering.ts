export const touchSteeringConfig = {
  turnThreshold: 0.28,
  maximumThumbTravel: 38,
};
/** Convert pointer offsets into logical game axes, including the CSS landscape fallback. */
export function getSteeringOffset(
  clientX: number,
  clientY: number,
  rect: { left: number; top: number; width: number; height: number },
  rotated: boolean,
) {
  const screenX = clientX - rect.left - rect.width / 2;
  const screenY = clientY - rect.top - rect.height / 2;
  const x = rotated ? screenY : screenX;
  const y = rotated ? -screenX : screenY;
  const length = Math.hypot(x, y);
  const limit = touchSteeringConfig.maximumThumbTravel;
  const multiplier = length > limit ? limit / length : 1;
  return {
    x: x * multiplier,
    y: y * multiplier,
    turnLeft: x < -limit * touchSteeringConfig.turnThreshold,
    turnRight: x > limit * touchSteeringConfig.turnThreshold,
  };
}
