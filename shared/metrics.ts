const ratio = (numerator: number, denominator: number): number =>
  denominator === 0 ? 0 : numerator / denominator;

export const occupancy = (roomsSold: number, roomsAvailable: number): number =>
  ratio(roomsSold, roomsAvailable);

export const adr = (roomRevenue: number, roomsSold: number): number =>
  ratio(roomRevenue, roomsSold);

export const revpar = (roomRevenue: number, roomsAvailable: number): number =>
  ratio(roomRevenue, roomsAvailable);
